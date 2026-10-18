# Nocturne

A music streaming web app with a polished dark interface, real audio playback, playlists, search, accounts and a
persistent personal library. Built with Next.js (App Router), React, TypeScript, Tailwind CSS, Zustand and Supabase.

The catalogue is **original music made for this project**: 41 tracks by 8 fictional artists across 12 albums,
composed and rendered by the synthesiser in `scripts/catalog/` and released as CC0. Nothing is streamed from, or
copied from, any commercial service.

## Quick start (local)

Requirements: Node 20+ (tested on 22), Docker (for the local Supabase stack).

```bash
cd nocturne
npm install
npm run catalog          # renders the 41 MP3s into public/media/audio (about 2 minutes) + art + seed.sql
npm run db:start         # starts Supabase in Docker (prints the API URL and keys)
npm run db:reset         # applies supabase/migrations and supabase/seed.sql
cp .env.example .env.local   # then fill in the values printed by db:start (see below)
npm run dev              # http://localhost:3000
```

`.env.local` for the local stack:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY or ANON_KEY from `npx supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<SECRET_KEY from `npx supabase status`>   # only used by the e2e tests
```

Local demo account (created by the seed, local only): `demo@nocturne.local` / `nocturne-demo`.
You can also sign up; the local stack does not require email confirmation.

If Docker cannot pull from ghcr.io, pull the same images from Docker Hub first (for example
`docker pull supabase/realtime:<tag>`); `supabase start` then reuses them.

## Commands

| command | does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | unit tests (Vitest): queue logic, player store, playlist ordering, formatting |
| `npm run test:e2e` | Playwright end-to-end tests (needs the Supabase stack and `.env.local`; reuses a running server on `PORT`, else starts `next dev`) |
| `npm run catalog` | regenerate audio (missing files only), art and `supabase/seed.sql`; `--force` re-renders everything |
| `npm run catalog:seed` | regenerate art and seed without rendering audio |
| `npm run db:start` / `db:stop` / `db:reset` | local Supabase |

## Hosted Supabase

1. Create a project, then `npx supabase link --project-ref <ref>` and `npx supabase db push` to apply the migration.
2. Load the catalogue: run the parts of `supabase/seed.sql` you want in the SQL editor. **Remove the demo account
   block** (it is for local use only).
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your host. Add your site URL to Auth ->
   URL configuration. With email confirmation on, sign-up shows a "check your inbox" screen.
4. Host the audio: `public/media/audio` is generated and git-ignored. Either run `npm run catalog` in your build,
   or upload the files to a bucket/CDN and point `track_streams.url` at them.

## How it is built

```
app/(app)/            screens inside the shell: home, search, library, playlist, album, artist, genre,
                      collection/tracks (Liked Songs), history, queue, profile
app/(auth)/           log in, sign up
components/player/    AudioEngine (the only <audio>), PlayerBar, MiniPlayer, FullPlayer, controls
components/shell/     Sidebar, TopBar, MobileNav, AppShell (keyboard shortcuts)
components/media/     cards, shelves, TrackList, headers, skeletons
components/ui/        Button, Menu (one host for all context menus), Dialog, Toaster, feedback
lib/player/queue.ts   pure queue logic (shuffle, repeat, next/previous, hand-queued tracks)
lib/data/catalog.ts   Supabase queries, shared by server components and the browser
store/                Zustand: player (persisted), library (likes, playlists, saves), ui (toasts)
supabase/migrations/  schema, RLS policies, playlist and search functions
scripts/              catalogue generator (synth, arrangements, art, seed)
e2e/, tests/unit/     Playwright and Vitest suites
replica/              Replica skill artifacts: recon, architecture, design, build log, tests, parity, fixes, brand
```

- **Playback.** The root layout mounts one `<audio>` element, so navigation never interrupts it. The Zustand store
  holds intent (what to play, play/pause, volume, seek requests); `AudioEngine` applies it and reports back time,
  duration, buffering, errors and track end. Autoplay refusals fall back to paused; missing or unsupported files show
  an error and you can skip on. Media Session metadata and handlers are set for OS media keys.
- **Data and security.** Metadata (`artists`, `albums`, `tracks`), artwork URLs and stream URLs (`track_streams`) are
  separate. Every table has row level security: the catalogue is read-only, playlists are visible when public or
  yours and editable only by you, likes/saves/history are yours alone. Playlist edits go through database functions
  that keep positions contiguous. Tested with two users in `e2e/security.spec.ts`.
- **Search.** `search_catalog` matches songs, artists, albums and visible playlists, ignoring case and accents and
  tolerating small typos.

## Feature status

Verified by automated tests unless noted.

| area | status |
| --- | --- |
| Navigation: sidebar (desktop), icon rail (tablet), tab bar + mini player (phone), back/forward, 404 | done |
| Home: greeting, quick grid, recently played, featured playlists, recommended albums, popular artists, trending, new releases, moods | done |
| Player: play, pause, resume, next, previous (restart after 3 s), seek (drag, click, keys), times, volume, mute, shuffle, repeat off/all/one, queue, artwork, title, artist | done |
| Player: persists across pages; volume, shuffle, repeat and last queue survive reloads | done |
| Player: loading/buffering spinner, error state for missing/unsupported audio | done (buffering only checked by code, not by throttled tests) |
| Media Session (OS media keys, lock screen) | done; not testable headless |
| Search: songs, artists, albums, playlists; live updates; filters; empty, loading, error with retry | done |
| Playlists: create, rename, describe, public/private, delete, add (menu or in-page finder), remove with undo, reorder (drag or menu), play, shuffle play, save others' playlists | done |
| Liked Songs (with undo), saved albums, followed artists, Your Library with filters and sort | done |
| Recently played (persisted per user) | done |
| Artist pages (profile, popular tracks, discography, fans also like, about) and album pages (cover, year, tracks, total duration, play, shuffle, save) | done |
| Auth: sign up, log in, log out, session persistence, protected data, profile with editable name | done |
| Mobile: full-screen player, tap to play, no horizontal overflow | done |

Test results: `replica/test-results.md` (57 unit, 38 end-to-end, all passing on a production build).

## Limitations and what is not done

- **Catalogue size.** 41 short synthesised tracks (about 1 to 1.5 minutes each). They are real, playable audio but
  not commercial music. No third-party CC service was reachable from the build environment, so none is integrated;
  `track_streams` is where a licensed provider (for example the Jamendo API with your own client id) would plug in.
- **Not built:** uploading your own audio (Supabase Storage), lyrics, podcasts, device handoff, social features,
  payments, offline downloads, password reset, OAuth sign-in, an account deletion screen, a desktop queue side panel
  (the queue is a page).
- **Undoing an unlike** re-creates the like, so its "liked" date becomes now.
- **Recommendations** are simple: genre affinity from your recent listening.
- **Browsers:** tests run in Chromium only. Safari and Firefox were not tested here.
- **Recon and comparison:** the reference site and review sites were blocked by this environment's network policy,
  so no reference screenshots or verbatim user reviews were collected. See `replica/recon.md`, `replica/parity.md`
  and `replica/fixes.md` for what that means for the analysis.
- **Name:** "Nocturne" has not been checked against trademark registers or domains (`replica/brand.md` lists the checks).
