# Brand: Nocturne

Angle (from `fixes.md`): a quiet, music-only player for late listeners, with a shuffle that really shuffles and
undo for every removal.

## Name

Candidates considered (descriptive, compound, invented, metaphor, verb): Nocturne, Lanternfly, Afterhour, Moonwell,
Hushtone, Velvetine, Nightjar, Quietroom, Lowlight, Orrery, Calla, Tidewell, Sundown, Murmur, Sonder, Halcyon,
Vesper, Lull, Ember, Drift. Cut to five that do not echo the reference product's name, sound or meaning and are not an
obvious twin of another well-known streaming brand: **Nocturne, Vesper, Lowlight, Nightjar, Lull**.

Chosen: **Nocturne** (a night piece in music; fits the dark interface, the late-listening angle and the moon mark).

Checks. None have been run from this environment (no network to registries). Every row is **to run**, by a person,
before spending money on the name. These are screening checks, not legal clearance.

| check | Nocturne | Vesper | Lowlight | Nightjar | Lull |
| --- | --- | --- | --- | --- | --- |
| US trademark (tmsearch.uspto.gov, classes 9 and 42) | to run | to run | to run | to run | to run |
| EU trademark (euipo.europa.eu / TMview) | to run | to run | to run | to run | to run |
| WIPO Global Brand Database | to run | to run | to run | to run | to run |
| domain (.com / .app) | to run | to run | to run | to run | to run |
| App Store and Google Play exact name | to run | to run | to run | to run | to run |
| handles (X, Instagram, TikTok, GitHub) | to run | to run | to run | to run | to run |
| web search "name + music app" | to run | to run | to run | to run | to run |

"Nocturne" is a common word and likely used by other products; expect to need a qualifier (for example
"Nocturne Music") after the search.

## Palette
Primary hue: **moon gold** `#f2b544` on blue-black night neutrals (`#0a0a0f` -> `#272734`). A warm amber family,
deliberately away from the reference product's green, which is listed in `brand.json` so the sweep catches it.
Contrast: `python3 contrast.py replica/design/tokens.json` -> 19 pairs, 0 AA failures (`design/contrast-report.txt`).
Genre tile colours were checked by axe in the e2e suite.

## Logo brief
- Idea: a crescent moon cradling three sound bars; night + music in one mark. (A working version is in
  `components/brand/Logo.tsx` and `app/icon.svg`.)
- Mark type: symbol + lowercase wordmark "nocturne".
- Must work at 16 px (favicon: crescent and bars only) and as a 1024 px app icon on the night background.
- Deliverables: SVG, 1024x1024 iOS icon without transparency, favicon set, 1200x630 social image.
- Must not resemble the reference mark: no circle with stacked curved lines, no green, no sound-wave arcs.

## Voice
Three words: **calm** (not sleepy), **plain** (not curt), **warm** (not cute).

| do | don't |
| --- | --- |
| "Nothing to play here yet." | "Oops! Looks like this is empty 😅" |
| "Could not reach the server. Check your connection and try again." | "Something went wrong" with no next step |
| "Removed from Late Night Drive. Undo" | silent removals |
| "Start your first playlist" | "Unlock your music journey" |
| name the thing ("Liked Songs", "Your Library") | invent cute names for basic features |

Rewritten most-seen strings (all in the app now): sign-up title "Sign up to start listening"; log-in title "Welcome
back"; main button "Create account"; empty Liked Songs "Songs you like will appear here"; empty playlist "Let's find
something for your playlist"; search empty "No results for “…”" with a next step; search error "Search is not
responding"; audio error "This track's audio is missing or in a format your browser can't play."; page error "This
page didn't load ... Your music keeps playing."; 404 "We couldn't find that".

## Sweep
`python3 sweep.py . --config replica/brand.json` -> **Clean** (2026-10-18). One hit was removed on the way: a provider
list in a generated comment in `supabase/config.toml`. The `replica/` planning folder is skipped by design and still
names the reference product, which is correct for recon notes.
Checked by eye: favicon (`app/icon.svg`), page titles (`%s · Nocturne`), logo, no OG image yet.
