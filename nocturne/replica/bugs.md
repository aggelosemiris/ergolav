# Bugs: Nocturne

Found by the Playwright and axe runs on 2026-10-18. All reproduced, all fixed, each covered by a test.

### BUG-001: a like made right after page load could disappear
- Severity: S2 · Flow F06 · Screen S06
- Steps: log in, open an album, immediately press the heart on a song.
- Expected: the song stays liked. Actual: the initial library load finished afterwards and replaced the likes
  with its older snapshot; the heart went grey again.
- Evidence: `e2e/playlists.spec.ts` "like and unlike songs" failed (Remove button not found).
- Fix: `store/library.ts` counts writes; a load that overlapped a write reads again. Status: fixed.

### BUG-002: search did not tolerate typos inside longer names
- Severity: S3 · Flow F03 · Screen S03
- Steps: search "lamplite". Expected: The Lamplight Quartet. Actual: no results (whole-string similarity too low).
- Fix: `search_catalog` scores with `word_similarity`. Status: fixed (`e2e/search.spec.ts`).

### BUG-003: "8-bit" genre tile failed contrast (2.88:1)
- Severity: S3 · Screens S02, S03 · Evidence: axe `color-contrast` on / and /search.
- Fix: genre colour #3fa34d -> #2e8540 (>= 3:1 for its 20px bold label). Status: fixed.

### BUG-004: adding a song that is already in a playlist logged a 409 in the console
- Severity: S4 · Flow F05 · Evidence: console error caught by the e2e problems fixture.
- Fix: `playlist_add_track` returns null for "already there" instead of raising. Status: fixed.

### BUG-005: the top bar sat inside the `main` landmark
- Severity: S4 · All screens · Evidence: duplicate "Log in" links inside `main` in tests; screen-reader landmark noise.
- Fix: top bar is a `<header>` before `<main>`. Status: fixed.

### BUG-006: tapping a track row did nothing on phones
- Severity: S3 · Flow F01 on touch · Found in manual review of the 390 px screenshots (rows only played on double-click).
- Fix: rows play on tap when the device has no hover. Status: fixed (`e2e/mobile.spec.ts`).

### BUG-007: changing tracks mid-play could pause the new track
- Severity: S2 · Flow F02 · Found while building the engine: the `pause` event queued by the source change arrived
  after the new `play()`.
- Fix: `AudioEngine` ignores `pause` events while the element is not actually paused. Status: fixed (e2e next/previous).

Open: none at S1/S2.

To check (not reproduced)
- Very slow networks: buffering spinner shown via `waiting`/`stalled`, not exercised with throttling.
