# Test plan: Nocturne

Build: c7cf3ed (+ working tree)  Date: 2026-10-18  Env: local Supabase, seed data, Chromium 1194 (Playwright 1.56.1)
Automated: `npm test` (Vitest, pure logic) and `npm run test:e2e` (Playwright, `e2e/`). Every spec fails on console
errors, page errors and 5xx responses; axe (WCAG 2 A/AA, serious + critical) runs on Home, Search, Album, Log in.

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F01-H1 | play from home | happy | home -> shelves render, cards link | greeting, 6 shelves, no errors | e2e navigation | pass |
| F01-E1 | play | edge: missing audio file | route the MP3 to 404, press play | error message, status error, Next still works | e2e playback | pass |
| F02-H1 | transport | happy | play album, pause, resume, seek by bar and keyboard, next, previous | audio element follows; times shown | e2e playback | pass |
| F02-E1 | transport | edge: previous after 3 s | seek to 20 s, previous | same track restarts | e2e + unit | pass |
| F02-E2 | transport | edge: end of queue, repeat off | seek near end of a single | stops, play button shown | e2e + unit | pass |
| F02-E3 | transport | edge: repeat all / one | seek near end | wraps / same track restarts | e2e + unit | pass |
| F02-E4 | shuffle | edge | shuffle on mid-album, 4 x next | current kept, every track once | e2e + unit | pass |
| F02-E5 | volume | happy | slider to 0.25, mute, unmute, reload | element volume/muted follow; volume persists | e2e | pass |
| F02-E6 | navigation | edge | play, move across 3 pages | same source keeps playing | e2e | pass |
| F02-E7 | keyboard | edge | space outside inputs | toggles playback | e2e | pass |
| F03-H1 | search | happy | type, results update, play a song | top result, songs, artists... | e2e search | pass |
| F03-E1 | search | edge: accents, case, typos | "Mïra Sölenne", "lamplite" | finds Mira Solenne, The Lamplight Quartet | e2e | pass |
| F03-E2 | search | edge: no results | "CAFÉ" | empty state, not an error | e2e | pass |
| F03-N1 | search | negative: network failure | abort the RPC, retry | error state, retry recovers | e2e | pass |
| F04-H1 | auth | happy | sign up, reload, log out, log in | name in greeting; session survives reload | e2e auth | pass |
| F04-N1 | auth | negative | empty form, short password, wrong password, existing email | specific messages | e2e | pass |
| F04-E1 | auth | edge: return path | /library -> log in | back on /library | e2e | pass |
| F04-H2 | profile | happy | edit display name, reload | persists | e2e | pass |
| F05-H1 | playlist | happy | create, rename + description, add x3 (finder), add from menu, duplicate refused, reorder, remove, reload, play, shuffle, private, delete | all persisted; DB empty after delete | e2e playlists | pass |
| F05-E1 | playlist | edge: drag and drop | drag row 1 onto row 3, reload | order persisted | e2e | pass |
| F05-E2 | playlist | edge: undo remove | remove, Undo, reload | back in its old position | e2e | pass |
| F05-N1 | playlist | negative: blank name | save "   " | error, dialog stays, name unchanged | e2e | pass |
| F06-H1 | likes | happy | like from row and menu, Liked Songs, unlike + Undo, reload | persisted per user | e2e | pass |
| F07-H1 | artist/album | happy | artist page, discography -> album, back | year, song count, duration | e2e | pass |
| F07-E1 | not found | edge | unknown uuid, bad id, unknown route | friendly 404 | e2e | pass |
| F08-H1 | queue | happy | add to queue, play next, reorder, remove, next, jump | order respected | e2e + unit | pass |
| F09-H1 | save playlist | happy | save a curated playlist, reload | in Your Library | e2e | pass |
| F09-H2 | save album / follow | happy | save album, follow artist | in library filters | e2e | pass |
| F10-H1 | history | happy | play a song | on /history and Home "Recently played" | e2e | pass |
| SEC-1 | RLS | negative: second user | private playlist, edits via tables and RPCs, likes, history, profile, anonymous writes | all refused / invisible | e2e security | pass |
| MOB-1 | phone | happy | tab bar, search, tap row to play, mini player, full player controls, close | works at 390 px | e2e mobile | pass |
| MOB-2 | phone | edge | 9 screens | no horizontal overflow | e2e mobile | pass |
| A11Y-1 | all | a11y | axe on 4 screens | no serious/critical violations | e2e | pass |

Manual / not automated
- OS media keys and lock-screen controls (Media Session): wired, not testable headless.
- Real slow networks (buffering spinner) beyond the aborted-request case; Safari and Firefox were not run.
- Email confirmation flow on a hosted project (local stack has it off).
