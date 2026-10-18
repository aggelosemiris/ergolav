# Parity: Nocturne vs the reference web player

Date: 2026-10-18. Tools: `replica-diff/parity.py` (feature parity). `imgdiff.py` was **not run**: the reference
site was unreachable from the build environment (egress proxy 403), so `replica/screens/` is empty and there
is no layout score. Clone screenshots for a later diff are in `replica/clone-screens/`.

**Read the score carefully.** It measures the feature matrix written during recon for this slice (40 must,
14 should, 4 could). It is not a measure against the whole original product, and the matrix was written by
the same agent that built the clone.

## Parity: 99.0 / 100

features 99.0  (58 counted, must-haves 40 of 40 done)

## By area, weakest first
- library                       94.4  (8 features)
- player                        98.8  (17 features)
- shell                        100.0  (4 features)
- home                         100.0  (4 features)
- search                       100.0  (4 features)
- auth                         100.0  (4 features)
- playlists                    100.0  (10 features)
- catalogue                    100.0  (5 features)
- polish                       100.0  (2 features)

## Missing, in build order
- [could] library: Upload your own audio (private tracks), no  (not built: needs a storage bucket, upload limits and per-user track visibility)
- [could] player: Now playing side panel (desktop), partial  (queue opens as a page from the player bar instead of a side panel)

## Left out on purpose (not scored)
- Lyrics: lyrics are licensed content from publishers
- Device handoff (Connect): needs the original's device network
- Podcasts and audiobooks: licensed content and a separate product
- The licensed music catalogue: licensed content - replaced by an original synthesised catalogue
- Friend activity feed: their social graph is not rebuildable
- Premium subscription and payments: not in this slice
- Offline downloads: needs DRM and native apps - out of slice

## Yours, not in the original (not scored)
- Fresh shuffle order on every repeat lap
- Undo after removing a song or unliking
- Music-only home with horizontal shelves

## Layout score
Not measured (no reference screenshots).

## Behaviour differences

| flow | reference does | Nocturne does | keep / fix |
| --- | --- | --- | --- |
| F01 play from Home | play button on card hover | same, plus always visible on touch | keep |
| F02 shuffle | weighted shuffle; reported repetitive (see fixes.md) | uniform shuffle, every track once per lap, fresh order each lap | keep (better) |
| F05 remove from playlist | no undo in most clients (reports in fixes.md) | toast with Undo restores the song in place | keep (better) |
| F06 unlike | remove from Liked Songs, no undo reported | Undo in the toast (the liked date resets) | keep |
| F08 queue | upNext before context; a separate queue panel | same model; queue is a page, not a side panel | fix later (could) |
| F04 sign up | email, OAuth, age, etc. | email + password + display name only | keep for the slice |
| catalogue | licensed catalogue | 41 original synthesised tracks | by design |

## Verdict
**Shippable by the skill's rule for this slice** (all 40 must-haves done, feature score 99, no open S1/S2 bugs),
with the caveats above: no layout comparison, a small demo catalogue, and trademark and domain checks still to be run by a person
(see brand.md). Two fixes from replica-entrepreneur are in, which the skill counts towards "better than the original"
for those flows.

## Next five things to build
1. Desktop queue side panel next to the main view.
2. Uploading your own audio to a private Storage bucket (could-have, not built).
3. A licensed or CC catalogue provider behind `track_streams` (Jamendo API) when the network allows it.
4. Password reset and account deletion screens.
5. Layout diff against reference screenshots captured by a person from the public site.
