# Test results: Nocturne

Run on 2026-10-18 against a production build (`next build && next start`) with the local Supabase stack and the
generated seed. Browser: Playwright Chromium 1194.

| check | command | result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | 0 errors |
| ESLint (next core-web-vitals + typescript) | `npm run lint` | 0 problems |
| Unit tests (Vitest) | `npm test` | 4 files, **57 passed** |
| End-to-end (Playwright, desktop 1440x900 + phone 390x844) | `npm run test:e2e` | 8 files, **38 passed**, 0 failed, 0 flaky |
| Production build | `npm run build` | compiled, 15 routes |
| Dependency audit | `npm audit --omit=dev` | 0 vulnerabilities |
| WCAG contrast on tokens | `contrast.py replica/design/tokens.json` | 19 pairs, 0 AA failures |
| axe (serious/critical, WCAG 2 A/AA) | inside the e2e suite | 0 violations on Home, Search, Album, Log in |
| Brand sweep | `sweep.py . --config replica/brand.json` | clean |
| Feature parity | `parity.py replica/features.csv` | 99.0, must-haves 40/40 (self-scored; see parity.md) |

The same 37 e2e tests (before the undo test was added) also passed against `next dev`.

E2E specs: `navigation` (6), `playback` (8), `search` (5), `auth` (5), `playlists` (7: playlists, likes, saves,
history), `security` (4: RLS with two users and an anonymous client), `mobile` (2: 390 px flows and overflow on 9 screens).
Each test fails on any console error, uncaught page error or 5xx response.
