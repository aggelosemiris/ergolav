# Recon map: a premium music-streaming web player (web, desktop + mobile web)

Reference product: the publicly accessible web player at open.spotify.com.
Scope: the listening core loop — browse, search, play, queue, like, build playlists — plus
artist and album pages, auth and a persistent personal library.
For: an original, independently branded streaming app ("Nocturne") with its own licensed catalogue.
Date: 2026-10-18

## Sources and their limits (read this first)

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | the public web player | https://open.spotify.com/ | **Not reachable from this build environment**: the egress proxy answers `403` to `CONNECT open.spotify.com:443` (logged 2026-10-18 13:03 UTC). No live click-through and no screenshots were possible. |
| 2 | public help center | https://support.spotify.com/ | Not fetched (same egress policy). Used only as general product knowledge of documented features: queue, liked songs, playlists, shuffle/repeat, library filters. |
| 3 | general public knowledge of the product's UX patterns | — | The layout patterns below are widely documented, publicly visible conventions of streaming players (left library sidebar, top search, persistent bottom transport bar, mobile tab bar + mini player). Recorded as patterns, never as copied assets, code or copy. |

Consequences, stated honestly:
- `replica/screens/` is empty. replica-diff's screenshot layout diff **cannot** be run against the original; only feature parity is scored.
- No code, network calls, bundles, artwork or copy of the original were read or saved (clean room).
- No account of the original was used.

## Core loop

Find music (home shelves or search) -> press play -> keep listening while browsing (queue, next, shuffle)
-> save what you like (like / add to playlist) -> come back to your library.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen / required |
| --- | --- | --- | --- | --- | --- |
| S01 | App shell | every route | persistent sidebar (library), top bar (back/forward, search, profile), bottom player | Sidebar, TopBar, PlayerBar, MobileTabBar, MiniPlayer | desktop, tablet (collapsed sidebar), mobile |
| S02 | Home | `/` | greeting, quick-access grid, shelves of playlists/albums/artists | Greeting, ShortcutTile, Shelf (horizontal scroller), MediaCard | loading (skeletons), filled, signed-out, empty history |
| S03 | Search | `/search` | input + browse genres, live results | SearchInput, GenreTile, TopResult, TrackRow, Shelf, FilterChips | idle (browse), typing/loading, results, no results, error |
| S04 | Your Library | `/library` (+ sidebar) | user's playlists, saved albums, followed artists, liked songs | LibraryItem, FilterChips (Playlists/Albums/Artists), Sort, CreatePlaylist | signed-out, empty, filled |
| S05 | Playlist detail | `/playlist/[id]` | header, actions, track table; owner can edit | DetailHeader, ActionBar, TrackTable, EditDialog, ContextMenu | loading, empty playlist, filled, not found, private (no permission), owner vs visitor |
| S06 | Album detail | `/album/[id]` | cover, title, artist, year, track list, total duration | DetailHeader, ActionBar, TrackTable | loading, filled, not found |
| S07 | Artist detail | `/artist/[id]` | banner, bio, popular tracks, discography, related artists | ArtistHero, TrackRow, Shelf, FollowButton | loading, filled, not found |
| S08 | Liked songs | `/collection/tracks` | all liked tracks, play/shuffle | DetailHeader, TrackTable | signed-out, empty, filled |
| S09 | Recently played | `/history` | listening history, newest first | TrackTable | signed-out, empty, filled |
| S10 | Queue | `/queue` (+ side panel on desktop) | now playing, next up, reorder/remove | QueueList, TrackRow | empty, filled |
| S11 | Now playing (mobile full screen) | tap mini player | big artwork + transport + seek + volume | FullPlayer | playing, paused, buffering, error |
| S12 | Log in | `/login` | email + password | AuthForm | idle, submitting, error (wrong password) |
| S13 | Sign up | `/signup` | email, display name, password | AuthForm | idle, submitting, error (taken, weak password) |
| S14 | Profile | `/profile` | display name, avatar initial, stats, public playlists, log out | ProfileHeader, Shelf | signed-out, filled |
| S15 | Genre page | `/genre/[id]` | tracks/albums for a genre tile | Shelf, TrackTable | filled, empty |
| S16 | Not found | any bad route | friendly 404 | EmptyState | — |

## Flows

```
F01 Play something from Home
    S02 hover card -> play button
    happy path clicks: 1
    edge: audio fails to load, unsupported source, slow network (buffering), autoplay blocked
F02 Control playback while browsing
    S01 player: pause/resume, seek (click/drag/keyboard), next/prev, volume/mute, shuffle, repeat off/all/one
    happy path clicks: 1 per action; navigation must not interrupt audio
    edge: prev after 3s restarts track, end of queue with repeat off stops, repeat one loops, shuffle keeps current track
F03 Search and play
    S03 type query -> results update as you type -> play a song / open artist/album/playlist
    happy path clicks: 2 (type, play)
    edge: no results, accents ("Café"), very long query, offline/error
F04 Sign up / log in / log out
    S13 -> S02 signed in; S12 -> S02; profile menu -> log out
    edge: wrong password, existing email, weak password, session survives reload
F05 Create and edit a playlist
    S04/sidebar "+" -> S05 new playlist -> rename/describe -> add tracks (context menu "Add to playlist" or in-page search) -> remove -> reorder -> delete
    happy path clicks: 1 to create, 2 to add a track
    edge: empty name, 100-char name, other user's playlist (read-only), delete confirmation
F06 Like a song
    heart on player bar or track row -> S08 shows it
    edge: signed-out prompts sign-in, double click toggles cleanly
F07 Browse an artist / album
    any artist link -> S07 -> album -> S06 -> play / shuffle
F08 Manage the queue
    context menu "Add to queue" -> S10 shows it -> remove / reorder / play from queue
F09 Save someone else's playlist to library
    S05 (visitor) -> "Save to library" -> appears in S04
F10 Recently played
    play tracks -> S09 lists them, newest first, persisted per user
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary (accent pill), secondary (outline pill), ghost/icon, danger | default, hover, active, focus-visible, disabled, loading | all |
| IconButton | sm 32, md 40; toggle (aria-pressed) | default, hover, active(on), disabled | player, rows, headers |
| PlayButton (round, floating) | sm 40 (cards), lg 56 (headers) | play, pause, loading | S02, S05–S08 |
| MediaCard | square (album/playlist), round (artist) | default, hover (reveal play), playing | S02, S03, S07, S14 |
| ShortcutTile | wide tile with art + title | default, hover, playing | S02 |
| Shelf | horizontal scroller with title + scroll buttons | loading skeleton, filled, empty (hidden) | S02, S03, S07 |
| TrackRow / TrackTable | with/without album column, with index or art | default, hover (index -> play), playing (eq bars), focus | S03, S05–S10 |
| ContextMenu | track menu, playlist menu | open, keyboard nav, submenu (add to playlist) | rows, cards, headers |
| Slider | seek, volume | idle, hover (thumb appears), dragging, keyboard | player |
| PlayerBar | desktop | empty, loading, playing, paused, buffering, error | S01 |
| MiniPlayer + FullPlayer | mobile | collapsed, expanded | S01, S11 |
| Sidebar / LibraryItem | expanded, collapsed | active route, playing | S01, S04 |
| Input / SearchInput | text, email, password, search | default, focus, error, disabled | S03, S12, S13, dialogs |
| Dialog | edit playlist, confirm delete | open, submitting, error | S05 |
| Toast | info, error | enter/exit | global |
| Skeleton | card, row, header | animating | everywhere data loads |
| EmptyState | with action | — | S04, S05, S08, S09, S03 |

## Inferred data model

```
Profile       id (= auth user id), display_name, created_at
              evidence: profile page, account menu      confidence: high
Artist        id, name, bio, image, monthly listeners (display stat)
              evidence: artist page                     confidence: high
Album         id, artist_id, title, release_year/date, cover, type (album|single|ep)
              evidence: album page, discography         confidence: high
Track         id, album_id, artist_id, title, duration, track_number, audio source, plays
              evidence: track table, player bar         confidence: high
              (features: multiple artists per track exist in the original — guess: modelled as primary artist only here)
Playlist      id, owner_id, name, description, cover (or mosaic), is_public, created_at, updated_at
              evidence: playlist page, edit dialog      confidence: high
PlaylistTrack playlist_id, track_id, position, added_at, added_by
              evidence: "date added" column, drag reorder  confidence: high
LikedTrack    user_id, track_id, liked_at
              evidence: liked songs page                confidence: high
SavedPlaylist / SavedAlbum / FollowedArtist   user_id + target id + saved_at
              evidence: library filters                 confidence: high
ListeningEvent user_id, track_id, played_at, context
              evidence: recently played                 confidence: medium
Genre         id, name, colour; Track/Album n-n Genre    confidence: medium
```

Relationships: Artist 1-n Album 1-n Track; User 1-n Playlist n-n Track (ordered); User n-n Track (likes);
User n-n Playlist (saves), n-n Album (saves), n-n Artist (follows); User 1-n ListeningEvent.

## Feature matrix

See `features.csv`. Must: 40, should: 14, could: 4, skip: 7.

## Out of scope (cannot or should not be cloned)

- The licensed music catalogue, its artwork and its metadata. Replaced by an original catalogue
  synthesised for this project (see `architecture.md` -> Music data).
- Podcasts, audiobooks, video: licensed content and a separate product.
- Connect (playing on other devices): needs the original's device network.
- Social graph (friend activity), collaborative editing in real time: network effects, later.
- Algorithmic personalisation trained on hundreds of millions of users: replaced by simple
  rules (recent history + genre affinity).
- Paid tiers/payments, ads: no billing in this slice.
- Offline downloads (DRM'd encrypted cache in the original): out of slice.

## Size

Screens 16, flows 10, entities 11. Hard parts: a single persistent audio element shared across
client-side navigation with correct state sync (buffering, errors, end-of-queue, shuffle/repeat
semantics); ordered playlist positions under reorder; RLS so one user can never touch another's
data. Size: **M** (a few weeks for a team; this slice is built in one pass, gaps listed honestly).
