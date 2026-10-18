# Fixes and angle: what listeners of the reference product complain about

Date: 2026-10-18.

## Sample size and method (read first)

- **Verbatim reviews collected: 0.** App Store RSS, Google Play, Trustpilot, Reddit, Hacker News (Algolia) and the
  vendor's community forum were all refused by this environment's egress proxy (403), so no review pages were read
  and `reviews.py` was **not** run. There is no `reviews.csv`, because the skill forbids rows that were not copied
  from a page.
- What *was* possible: four web searches. The search tool returns links plus a summary written by the tool, not the
  pages' own words. Everything below is therefore **secondary evidence**: a theme, the links where it appears, and
  no quotes. Treat every theme as **thin** until someone reads the linked threads and fills `replica/reviews.csv`.
- No numbers below are review counts. Where a source gives a number, it is that source's claim.

## 1. What they hate

| theme | evidence (links) | strength |
| --- | --- | --- |
| Shuffle feels repetitive: the same small set of songs, or the same sequence on different days | [Android Authority, Sept 2026](https://androidauthority.com/spotify-shuffle-repeating-song-queue-3708815), [Android Authority](https://www.androidauthority.com/spotify-shuffle-isnt-shuffling-3474262), [SlashGear](https://www.slashgear.com/1546972/how-to-fix-spotify-shuffle-feature/), community idea thread "Implement an actual shuffle function" ([1](https://community.spotify.com/t5/Implemented-Ideas/Implement-an-actual-shuffle-function/idc-p/1769228/highlight/true), [2](https://community.spotify.com/t5/Implemented-Ideas/Implement-an-actual-shuffle-function/idc-p/1767830/highlight/true)) | press + forum; thin (no verbatim rows) |
| Accidental removals (playlist songs, Liked Songs) are hard or impossible to undo | community threads: [removed from a playlist](https://community.spotify.com/t5/Content-Questions/How-to-retrieve-song-that-I-accidentally-removed-from-an/m-p/5443207/highlight/true), [deleted entire Liked Songs](https://community.spotify.com/t5/Your-Library/I-accidentally-deleted-my-entire-Liked-Songs-library-and-Spotify/m-p/5454549/highlight/true), [removed from Liked](https://community.spotify.com/t5/Your-Library/I-accidentally-removed-songs-from-my-quot-Liked-quot-songs-how/td-p/4881194) | forum only; thin |
| Home redesign: big vertical cards, fewer items per screen, podcasts and audiobooks crowding music | [Trusted Reviews opinion](https://www.trustedreviews.com/opinion/the-spotify-redesign-is-a-mess-4312654), community thread "What's up with this new Home screen" ([p.22](https://community.spotify.com/t5/iOS-iPhone-iPad/What-s-up-with-this-new-Home-screen/td-p/5435858/page/22)), [vertical view issue](https://community.spotify.com/t5/Ongoing-Issues/Home-page-of-Spotify-turned-into-vertical-view-Even-after/idi-p/5219441) | press + forum, mostly 2022-2023; thin and possibly outdated |
| Queue: albums added to the queue play before the rest of the current album; queue hard to clear | ["Clear play queue" idea](https://community.spotify.com/t5/Implemented-Ideas/Clear-play-queue/idc-p/493226/highlight/true), [album added to the front of the queue](https://community.spotify.com/t5/Desktop-Linux/adding-an-album-to-the-queue-adds-it-to-the-front-of-the-queue/m-p/2910397/highlight/true) | forum; thin; clear-queue was later shipped by the vendor |

## 2. What is missing (requested by name)
- A "true" shuffle option without popularity weighting (shuffle threads above).
- Undo for removals / restoring removed songs with their original date (removal threads above).
- An opt-out from the redesigned Home (redesign threads above).

## 3. What is unsolved (positioning)
- People who use a streaming app **only for music** and want a calm, dense library view, without podcast and audiobook
  promotion. Evidence: redesign theme above (thin).

## Fix plan (built in this pass)

| fix | size | where | status |
| --- | --- | --- | --- |
| Uniform shuffle: every track exactly once per lap, a **fresh** order on every repeat lap, never the just-heard track first | S | `lib/player/queue.ts` (`next`, `shuffledOrder`), unit tests | done |
| Undo after "Remove from this playlist" (restores the original position) and after unliking | S | `PlaylistView.tsx`, `store/library.ts`, toast actions | done, e2e covered |
| Music-only Home with horizontal shelves and a dense quick-access grid | S | `app/(app)/page.tsx` | done (by design) |
| "Clear queue" and explicit "Play next" vs "Add to queue" | S | queue page, track menu | done |

Not done: keeping the original "date added" on undo of an unlike (the like is re-created with a new date).

## Angle options

```
For listeners who just want their music, without podcasts and upsells on every screen,
Nocturne is a quiet, music-only player whose shuffle actually shuffles and lets you undo mistakes.
Evidence: shuffle + undo + redesign themes (all thin, secondary).
```
```
For people with big playlists who are tired of hearing the same 50 songs,
Nocturne shuffles every song once before any repeats, with a new order each lap.
Evidence: shuffle theme (thin, secondary).
```
```
For careful library builders,
Nocturne never makes a removal permanent by accident: every removal can be undone.
Evidence: removal theme (thin, secondary).
```

**Recommended:** the first one (music-only, honest shuffle, undo). It drives the brand voice in `brand.md`.

Before relying on any of this: read the linked threads, copy real rows into `replica/reviews.csv`, and run
`python3 reviews.py replica/reviews.csv --out replica/feedback.md`.
