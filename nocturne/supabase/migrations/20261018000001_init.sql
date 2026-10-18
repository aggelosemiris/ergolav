-- Nocturne: initial schema. Catalogue, playlists, library, history. RLS on every table.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Immutable wrapper so unaccent can be used in generated columns and indexes.
create or replace function public.search_key(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')));
$$;

-- Shared trigger to keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A profile row for every new auth user, named from sign-up metadata or the email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if wanted = '' then
    wanted := split_part(coalesce(new.email, 'listener'), '@', 1);
  end if;
  insert into public.profiles (id, display_name)
  values (new.id, left(wanted, 60));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- catalogue

create table public.genres (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  bio text not null default '',
  image_url text not null,
  monthly_listeners int not null default 0 check (monthly_listeners >= 0),
  search_key text generated always as (public.search_key(name)) stored,
  created_at timestamptz not null default now()
);
create index artists_search_trgm on public.artists using gin (search_key extensions.gin_trgm_ops);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  album_type text not null default 'album' check (album_type in ('album', 'ep', 'single')),
  release_date date not null,
  cover_url text not null,
  genre_id text references public.genres (id) on delete set null,
  search_key text generated always as (public.search_key(title)) stored,
  created_at timestamptz not null default now()
);
create index albums_artist_idx on public.albums (artist_id, release_date desc);
create index albums_genre_idx on public.albums (genre_id);
create index albums_search_trgm on public.albums using gin (search_key extensions.gin_trgm_ops);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete restrict,
  artist_id uuid not null references public.artists (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  track_number int not null check (track_number > 0),
  duration_ms int not null check (duration_ms > 0),
  play_count bigint not null default 0 check (play_count >= 0),
  genre_id text references public.genres (id) on delete set null,
  search_key text generated always as (public.search_key(title)) stored,
  created_at timestamptz not null default now(),
  unique (album_id, track_number)
);
create index tracks_artist_idx on public.tracks (artist_id, play_count desc);
create index tracks_genre_idx on public.tracks (genre_id);
create index tracks_search_trgm on public.tracks using gin (search_key extensions.gin_trgm_ops);

-- Stream URLs live apart from metadata so a licensed provider can be swapped in.
create table public.track_streams (
  track_id uuid primary key references public.tracks (id) on delete cascade,
  url text not null,
  mime_type text not null default 'audio/mpeg',
  bitrate_kbps int check (bitrate_kbps > 0),
  licence text not null,
  source text not null
);

-- ---------------------------------------------------------------- playlists

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 300),
  is_public boolean not null default true,
  search_key text generated always as (public.search_key(name)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index playlists_owner_idx on public.playlists (owner_id, updated_at desc);
create index playlists_search_trgm on public.playlists using gin (search_key extensions.gin_trgm_ops);

create trigger playlists_touch before update on public.playlists
  for each row execute function public.touch_updated_at();

create table public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position int not null check (position >= 0),
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  constraint playlist_tracks_position_unique unique (playlist_id, position) deferrable initially deferred,
  constraint playlist_tracks_track_unique unique (playlist_id, track_id)
);
create index playlist_tracks_track_idx on public.playlist_tracks (track_id);

-- ---------------------------------------------------------------- library

create table public.liked_tracks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  liked_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index liked_tracks_user_idx on public.liked_tracks (user_id, liked_at desc);
create index liked_tracks_track_idx on public.liked_tracks (track_id);

create table public.saved_playlists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, playlist_id)
);
create index saved_playlists_playlist_idx on public.saved_playlists (playlist_id);

create table public.saved_albums (
  user_id uuid not null references public.profiles (id) on delete cascade,
  album_id uuid not null references public.albums (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, album_id)
);
create index saved_albums_album_idx on public.saved_albums (album_id);

create table public.followed_artists (
  user_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  followed_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);
create index followed_artists_artist_idx on public.followed_artists (artist_id);

create table public.listening_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  context_type text check (context_type in ('album', 'artist', 'playlist', 'liked', 'search', 'queue', 'genre', 'history')),
  context_id text,
  played_at timestamptz not null default now()
);
create index listening_history_user_idx on public.listening_history (user_id, played_at desc);
create index listening_history_track_idx on public.listening_history (track_id);

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.genres enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;
alter table public.track_streams enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.liked_tracks enable row level security;
alter table public.saved_playlists enable row level security;
alter table public.saved_albums enable row level security;
alter table public.followed_artists enable row level security;
alter table public.listening_history enable row level security;

-- Catalogue: readable by everyone, writable by nobody through the API.
create policy "catalogue is public" on public.genres for select using (true);
create policy "catalogue is public" on public.artists for select using (true);
create policy "catalogue is public" on public.albums for select using (true);
create policy "catalogue is public" on public.tracks for select using (true);
create policy "catalogue is public" on public.track_streams for select using (true);

-- Profiles: display names are public; only the owner may change theirs.
create policy "profiles are readable" on public.profiles for select using (true);
create policy "owner updates profile" on public.profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Playlists.
create policy "public or own playlists are readable" on public.playlists for select
  using (is_public or owner_id = (select auth.uid()));
create policy "owner creates playlists" on public.playlists for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "owner updates playlists" on public.playlists for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner deletes playlists" on public.playlists for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Playlist items follow their playlist.
create policy "items of visible playlists are readable" on public.playlist_tracks for select
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (p.is_public or p.owner_id = (select auth.uid()))
  ));
create policy "owner adds items" on public.playlist_tracks for insert to authenticated
  with check (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())
  ));
create policy "owner moves items" on public.playlist_tracks for update to authenticated
  using (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())
  ));
create policy "owner removes items" on public.playlist_tracks for delete to authenticated
  using (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())
  ));

-- Personal library rows: only ever your own.
create policy "own likes" on public.liked_tracks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own saved albums" on public.saved_albums for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own follows" on public.followed_artists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own history" on public.listening_history for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own saved playlists are readable" on public.saved_playlists for select to authenticated
  using (user_id = (select auth.uid()));
create policy "save visible playlists" on public.saved_playlists for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.is_public or p.owner_id = (select auth.uid()))
    )
  );
create policy "unsave own" on public.saved_playlists for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- playlist operations
-- security invoker: every statement inside still runs under the caller's RLS.

create or replace function public.assert_playlist_owner(p_playlist uuid)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.playlists
    where id = p_playlist and owner_id = (select auth.uid())
  ) then
    raise exception 'playlist not found or not yours' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.playlist_add_track(p_playlist uuid, p_track uuid)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_pos int;
begin
  perform public.assert_playlist_owner(p_playlist);
  -- serialise concurrent appends to the same playlist
  perform 1 from public.playlists where id = p_playlist for update;
  -- already there: not an error, the caller just learns nothing was added
  if exists (select 1 from public.playlist_tracks where playlist_id = p_playlist and track_id = p_track) then
    return null;
  end if;
  select coalesce(max(position) + 1, 0) into next_pos
  from public.playlist_tracks where playlist_id = p_playlist;
  insert into public.playlist_tracks (playlist_id, track_id, position, added_by)
  values (p_playlist, p_track, next_pos, (select auth.uid()));
  update public.playlists set updated_at = now() where id = p_playlist;
  return next_pos;
end;
$$;

create or replace function public.playlist_remove_track(p_playlist uuid, p_track uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_pos int;
begin
  perform public.assert_playlist_owner(p_playlist);
  perform 1 from public.playlists where id = p_playlist for update;
  delete from public.playlist_tracks
  where playlist_id = p_playlist and track_id = p_track
  returning position into old_pos;
  if old_pos is null then
    return;
  end if;
  update public.playlist_tracks set position = position - 1
  where playlist_id = p_playlist and position > old_pos;
  update public.playlists set updated_at = now() where id = p_playlist;
end;
$$;

create or replace function public.playlist_move_track(p_playlist uuid, p_track uuid, p_to int)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_pos int;
  last_pos int;
  new_pos int;
begin
  perform public.assert_playlist_owner(p_playlist);
  perform 1 from public.playlists where id = p_playlist for update;
  select position into old_pos from public.playlist_tracks
  where playlist_id = p_playlist and track_id = p_track;
  if old_pos is null then
    raise exception 'track not in playlist' using errcode = 'P0002';
  end if;
  select max(position) into last_pos from public.playlist_tracks where playlist_id = p_playlist;
  new_pos := greatest(0, least(p_to, last_pos));
  if new_pos = old_pos then
    return;
  end if;
  if new_pos > old_pos then
    update public.playlist_tracks set position = position - 1
    where playlist_id = p_playlist and position > old_pos and position <= new_pos;
  else
    update public.playlist_tracks set position = position + 1
    where playlist_id = p_playlist and position >= new_pos and position < old_pos;
  end if;
  update public.playlist_tracks set position = new_pos
  where playlist_id = p_playlist and track_id = p_track;
  update public.playlists set updated_at = now() where id = p_playlist;
end;
$$;

-- ---------------------------------------------------------------- search

create or replace function public.search_catalog(q text, max_results int default 8)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  needle text := public.search_key(btrim(left(coalesce(q, ''), 100)));
  lim int := greatest(1, least(coalesce(max_results, 8), 50));
  result jsonb;
begin
  if needle = '' then
    return jsonb_build_object('tracks', '[]'::jsonb, 'artists', '[]'::jsonb, 'albums', '[]'::jsonb, 'playlists', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'tracks', coalesce((
      select jsonb_agg(t.id order by t.score desc, t.play_count desc)
      from (
        select tr.id, tr.play_count,
          case when tr.search_key = needle then 3
               when tr.search_key like needle || '%' then 2
               when tr.search_key like '%' || needle || '%' then 1.5
               else 0 end
          + extensions.word_similarity(needle, tr.search_key)
          + case when ar.search_key like '%' || needle || '%' then 0.8 else 0 end as score
        from public.tracks tr
        join public.artists ar on ar.id = tr.artist_id
        where tr.search_key like '%' || needle || '%'
           or ar.search_key like '%' || needle || '%'
           or extensions.word_similarity(needle, tr.search_key) > 0.45
        order by score desc, tr.play_count desc
        limit lim
      ) t), '[]'::jsonb),
    'artists', coalesce((
      select jsonb_agg(a.id order by a.score desc, a.monthly_listeners desc)
      from (
        select ar.id, ar.monthly_listeners,
          case when ar.search_key = needle then 3
               when ar.search_key like needle || '%' then 2
               when ar.search_key like '%' || needle || '%' then 1.5
               else 0 end + extensions.word_similarity(needle, ar.search_key) as score
        from public.artists ar
        where ar.search_key like '%' || needle || '%' or extensions.word_similarity(needle, ar.search_key) > 0.45
        order by score desc
        limit lim
      ) a), '[]'::jsonb),
    'albums', coalesce((
      select jsonb_agg(al.id order by al.score desc)
      from (
        select alb.id,
          case when alb.search_key = needle then 3
               when alb.search_key like needle || '%' then 2
               when alb.search_key like '%' || needle || '%' then 1.5
               else 0 end
          + extensions.word_similarity(needle, alb.search_key)
          + case when ar.search_key like '%' || needle || '%' then 0.8 else 0 end as score
        from public.albums alb
        join public.artists ar on ar.id = alb.artist_id
        where alb.search_key like '%' || needle || '%'
           or ar.search_key like '%' || needle || '%'
           or extensions.word_similarity(needle, alb.search_key) > 0.45
        order by score desc
        limit lim
      ) al), '[]'::jsonb),
    'playlists', coalesce((
      select jsonb_agg(pl.id order by pl.score desc)
      from (
        select p.id,
          case when p.search_key = needle then 3
               when p.search_key like needle || '%' then 2
               when p.search_key like '%' || needle || '%' then 1.5
               else 0 end + extensions.word_similarity(needle, p.search_key) as score
        from public.playlists p
        where p.search_key like '%' || needle || '%' or extensions.word_similarity(needle, p.search_key) > 0.45
        order by score desc
        limit lim
      ) pl), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.search_catalog(text, int) to anon, authenticated;
grant execute on function public.playlist_add_track(uuid, uuid) to authenticated;
grant execute on function public.playlist_remove_track(uuid, uuid) to authenticated;
grant execute on function public.playlist_move_track(uuid, uuid, int) to authenticated;
revoke execute on function public.playlist_add_track(uuid, uuid) from public, anon;
revoke execute on function public.playlist_remove_track(uuid, uuid) from public, anon;
revoke execute on function public.playlist_move_track(uuid, uuid, int) from public, anon;
