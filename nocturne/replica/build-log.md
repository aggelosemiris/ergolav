# Build log: Nocturne

| ID | screen | date | status | missing / notes |
| --- | --- | --- | --- | --- |
| S01 | App shell | 2026-10-18 | done | sidebar (3 widths), top bar, desktop player bar, phone tab bar + mini player |
| S02 | Home | 2026-10-18 | done | greeting, quick grid, recently played, featured, recommended (genre affinity), artists, trending, new releases, moods |
| S03 | Search | 2026-10-18 | done | live results, filters, top result, idle browse, loading skeleton, empty, error + retry |
| S04 | Your Library | 2026-10-18 | done | filters (URL), recents / A-Z, create playlist, signed-out, empty, loading |
| S05 | Playlist | 2026-10-18 | done | owner editing (details, privacy, delete, reorder by drag and menu, remove + undo, in-page song finder); visitor save |
| S06 | Album | 2026-10-18 | done | year, track list, total duration, play, shuffle, save, more by artist |
| S07 | Artist | 2026-10-18 | done | hero, follow, popular (5/10), discography, fans also like, about |
| S08 | Liked Songs | 2026-10-18 | done | unlike removes the row at once, with undo |
| S09 | Recently played | 2026-10-18 | done | last 100 plays |
| S10 | Queue | 2026-10-18 | done | now playing, next in queue (reorder, remove, clear), next from context (jump) |
| S11 | Full player (phone) | 2026-10-18 | done | |
| S12 | Log in | 2026-10-18 | done | wrong password, validation, ?next= return |
| S13 | Sign up | 2026-10-18 | done | email-confirmation projects show "check your inbox" |
| S14 | Profile | 2026-10-18 | done | stats, edit name, log out, playlists |
| S15 | Genre | 2026-10-18 | done | |
| S16 | Not found | 2026-10-18 | done | also for private playlists of other users (RLS hides them) |

Harder than expected
- **Audio.** No CC music host was reachable from the build machine, so the catalogue is composed by a synthesiser
  written for this project (`scripts/catalog/`). 41 tracks, about 55 minutes, rendered to MP3 in pure JS.
- **Player state sync.** Changing `src` while playing queues a `pause` event that arrived after the new `play()`
  and paused the new track; the engine now ignores pauses while the element is not actually paused.
- **Library load race.** A like made in the first second after page load could be overwritten by the initial load;
  loads now restart when a write overlapped them (found by Playwright).

Screenshots for replica-diff: `replica/clone-screens/` (1440x900 desktop, 390x844 phone).
