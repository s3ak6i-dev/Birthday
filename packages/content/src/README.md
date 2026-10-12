# Content packs

Each `<game>/<pack>.json` file is a JSON array validated against the matching
schema in `../src/schemas` (see masterdoc.md section 5.2). Every item is
currently an empty placeholder — content has to be written from real sources
(section 5.4) and is deliberately **not** fabricated here, since every item
needs a genuine citation (`source`) and starts `reviewed: false` until
Lakshmi has actually seen it in play (section 5.3/10.3).

## Minimum volume for v1 launch (section 5.5)

| Pack | File | Minimum |
|---|---|---|
| Guess the Diagnosis, General + OB-GYN | `guess-the-diagnosis/general.json`, `ob-gyn.json` | 48 cards total (24 each) |
| Triage Dial | `triage-dial/general.json` | 24 spectrums |
| Wordle Daily, General + OB-GYN | `wordle/daily-general.json`, `daily-ob-gyn.json` | 60 words total |
| Wordle Duel, Inside-Jokes | `wordle/duel-inside-jokes.json` | 10 words |

Code Red (`code-red/scenarios.json`) and Case Files (`case-files/cases.json`)
targets are 3 scenarios and 8 cases respectively, for v1.5/v2 (sections
3.4/3.5) — not required for the v1 cut line.

Run `npm run validate-content -w @ward-games/content` (see `scripts/validate.ts`)
to check every pack against its schema before committing new content.
