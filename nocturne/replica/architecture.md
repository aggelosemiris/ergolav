# Architecture: Nocturne (an original rebuild of a streaming player's core features)

Reads: `replica/recon.md`, `replica/features.csv`.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js 16 (App Router) + React 19 + TypeScript | file routes map 1:1 to the screen inventory; server components render catalogue pages with RLS-scoped data |
| styling | Tailwind CSS v4, tokens from `replica/design/tokens.json` -> `app/tokens.css` | components use roles (`bg-surface`, `text-muted`), never raw hex |
| icons | lucide-react (ISC) | open, consistent stroke icon set |
| font | Figtree (OFL) via `@fontsource-variable/figtree` | open geometric sans; bundled from npm, no runtime font CDN |
| client state | Zustand: `player` store (queue, transport), `library` store (likes, saves, playlists) | the player must survive navigation; one store, one `<audio>` |
| database | Postgres 17 on Supabase (local via `supabase start`) | one database, migrations in `supabase/migrations` |
| auth | Supabase Auth (email + password), cookie sessions via `@supabase/ssr` + `proxy.ts` refresh | managed, works with RLS |
| access rules | **Row level security** on every table; ordered-playlist mutations through `security invoker` RPCs | the database is the authority, not the client |
| files | catalogue media as static files under `public/media/` (generated); Supabase Storage bucket reserved for user uploads (not built, see limitations) | |
| tests | Vitest (pure player/queue/playlist logic), Playwright (flows), `tsc --noEmit`, ESLint | |
| payments / email / jobs | none in this slice | no billing; local auth needs no email confirmation |
| hosting | any Node host (Vercel-compatible) + a hosted Supabase project | |

## Music data (critical, legal)

The original's catalogue, audio, artwork and metadata are licensed content and are **not** used.
Live third-party CC sources (Jamendo, Free Music Archive, Wikimedia Commons, Internet Archive)
were **not reachable** from the build environment (egress proxy 403), so the demo catalogue is
**original music synthesised for this project** by `scripts/generate-catalog.mjs`:

- deterministic synthesiser (drums, bass, pads, keys, plucks, arps, reverb, delay, limiter),
  rendered to 44.1 kHz stereo and encoded to MP3 in pure JS (`@breezystack/lamejs`);
- artwork: deterministic generative SVG covers and artist portraits;
- artists, albums and titles are fictional and written fresh.
- Licence: the generated audio and art are released by the project as CC0-1.0, recorded per
  stream in the `track_streams.licence` column.

Separation, as required: **metadata** (`artists`, `albums`, `tracks`), **artwork** (`cover_url`,
`image_url` columns pointing to art files) and **stream URLs** (`track_streams`: url, mime, bitrate,
licence) are separate. Swapping in a licensed provider means filling `track_streams` with that
provider's URLs; no screen changes.

## Schema

Tables: 12 (`profiles, genres, artists, albums, tracks, track_streams, playlists, playlist_tracks,
liked_tracks, saved_playlists, saved_albums, followed_artists, listening_history` — 13 with history).
Access rules: RLS. Full SQL: `supabase/migrations/20261018000001_init.sql`.

Key constraints:
- `playlist_tracks unique (playlist_id, position) deferrable initially deferred` so reorders that
  shift many rows commit atomically; `unique (playlist_id, track_id)` (no silent duplicates).
- `check` on name lengths, `album_type`, `duration_ms > 0`, `position >= 0`.
- every FK has an explicit `on delete` (cascade for owned rows, restrict for catalogue).
- indexes on every FK and on `(user_id, played_at desc)`, `(owner_id, updated_at desc)`;
  trigram GIN indexes on an immutable unaccented search key for search.

RLS summary:
| table | select | insert/update/delete |
| --- | --- | --- |
| catalogue (`genres, artists, albums, tracks, track_streams`) | anyone | nobody (service role / migrations only) |
| `profiles` | anyone (display names of playlist owners) | own row only (insert by trigger) |
| `playlists` | public ones, or own | own only |
| `playlist_tracks` | if the playlist is visible | if the playlist is own |
| `liked_tracks, saved_*, followed_artists, listening_history` | own | own (saving a playlist requires it to be visible) |

## API (Supabase from server components and the browser, all under RLS)

| call | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `select` artists/albums/tracks (+ `track_streams`) | catalogue pages and shelves | anyone | ids | rows | F01, F07 |
| `rpc search_catalog(q, max)` | ranked songs/artists/albums/playlists | anyone (playlists: public or own) | text <= 100 chars | jsonb | F03 |
| `auth.signUp / signInWithPassword / signOut` | auth | anyone | email, password, display name | session cookie | F04 |
| `update profiles` | edit display name | owner | display_name 1..60 | row | F04 |
| `insert/update/delete playlists` | create, rename, describe, privacy, delete | owner | zod-validated | row | F05 |
| `rpc playlist_add_track(p, t)` | append at end | owner | uuids | position | F05 |
| `rpc playlist_remove_track(p, t)` | delete and close the gap | owner | uuids | void | F05 |
| `rpc playlist_move_track(p, t, to)` | reorder | owner | uuids, index | void | F05 |
| `upsert/delete liked_tracks` | like / unlike | self | track id | — | F06 |
| `upsert/delete saved_playlists / saved_albums / followed_artists` | library | self | id | — | F09 |
| `insert listening_history` | log a play | self | track id, context | — | F10 |

Webhooks: none. Jobs: none.

## Player architecture

- `lib/player/queue.ts`: **pure** functions (build play order, shuffle keeping the current track
  first, next/previous with repeat semantics, queue insert/move/remove). Unit tested.
- `store/player.ts` (Zustand): queue + transport state + actions; persists volume, mute, shuffle,
  repeat and the last queue (without autoplay) to localStorage behind try/catch.
- `components/player/AudioEngine.tsx`: the **only** `<audio>` element, mounted once in the root
  layout so client navigation never unmounts it. Store -> element (src, play/pause, volume, seek)
  and element -> store (`timeupdate, durationchange, waiting, playing, pause, ended, error`).
  `play()` rejections (autoplay policy) fall back to paused. Media Session metadata + action
  handlers. A play is logged to history once per track start for signed-in users.

## The parts that bite

- autoplay policy: `play()` returns a rejected promise without a user gesture -> paused state, no crash.
- state sync: the element is the truth for time/duration/buffering; the store is the truth for intent.
- races: rapid next/next -> each `src` change cancels the previous load; stale `play()` promises are ignored by load id.
- ordering: positions shifted inside one transaction with a deferred unique constraint.
- RLS: tested with two users in Playwright (user B cannot see A's private playlist or modify it).
- search: accent-insensitive (`unaccent`) + trigram similarity; empty query returns browse view.
- time zones: `timestamptz` everywhere; "added" shown relative.

## Build order

1. Vertical slice: S01 shell, S02 home, S06 album, player (F01, F02), catalogue tables, seed.
2. Must-haves: S03 search (F03), S12/S13 auth (F04), S05 playlists (F05), S08 likes (F06), S07 artist, S04 library, S09 history.
3. Should-haves: queue view S10, mobile full player S11, genre pages S15, media session, toasts, skeletons.
4. Fixes from replica-entrepreneur (see `replica/fixes.md`).
