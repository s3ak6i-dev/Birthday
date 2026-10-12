# Dr. Chandra's Waiting Room: Master Product, Technical, Content, and Art Document

*A private, multiplayer, doctor-themed game site, built as a long-distance birthday gift.*

| | |
|---|---|
| **Working title** | Dr. Chandra's Waiting Room (named) |
| **Version** | 1.0 (draft) |
| **Date** | 11 October 2026 |
| **Builder** | Surya |
| **Recipient** | Lakshmi (MBBS student, aiming for OB-GYN) |
| **Birthday / launch date** | [BIRTHDAY DATE] (fill in; section 12 plans backwards from it) |
| **Time zone** | Both players are in India, so IST (UTC+05:30) everywhere |
| **Status** | Design complete, build not started |

This single file replaces the earlier separate notes. It contains the PRD, the experience and screen design, all five game specs, the technical requirements document (TRD), the content plan, the art and asset plan with prompts, the delivery plan, and the appendices.

---

## Table of contents

0. Executive summary and decision log
1. Product requirements (PRD)
2. Experience design: screens, controls, story layer, meta systems, audio, accessibility
3. Game specifications (five games)
4. Technical requirements (TRD)
5. Content plan, schemas, and review workflow
6. Art and asset plan, prompts, and audio plan
7. Delivery plan: milestones, backlog, estimates, cut lines
8. Testing and QA plan
9. Risks and mitigations
10. Launch plan and the surprise
11. Open questions and fill-in list
12. Appendices (glossary, env vars, message catalog, checklists)

---

## 0. Executive summary and decision log

### 0.1 What this is

A private website where Surya and Lakshmi play short, funny, doctor-themed games together in real time, plus a small visual-novel story that ties it together. Five games take familiar formats (Guess Who, Wavelength, Wordle, Keep Talking and Nobody Explodes, Murdle) and turn them into medical games, with a heavy tilt toward OB-GYN. Everything is wrapped in a cozy violet pixel-art world: a Staff Lounge hub, characters of the two of them, a mascot, a ward cat, a cast of side characters, stickers to collect, and a garden that grows when they play on the same day.

### 0.2 The five games

| # | Game | Inspired by | Mode | One-line pitch |
|---|---|---|---|---|
| 1 | Guess the Diagnosis | Guess Who | Live, versus | Secretly pick a condition and question each other until someone cracks it |
| 2 | Triage Dial | Wavelength | Live, co-op or versus | One gives a clue, the other places the dial between two clinical extremes |
| 3 | Medical Wordle | Wordle, Meddle | Daily and live | Medical words, daily shared puzzle, race mode, duel mode with inside-joke words |
| 4 | Code Red | Keep Talking and Nobody Explodes | Live, co-op, asymmetric | One sees the patient, the other has the protocol, and they must talk it through |
| 5 | Case Files | Murdle | Co-op campaign | Split-evidence medical mysteries that unlock a hidden story and a photo reveal |

### 0.3 Stack and cost at a glance

- **Front end:** React, TypeScript, Vite, hosted on Vercel.
- **Database and auth:** Supabase (Postgres, row-level security, password login for exactly two users).
- **Realtime rooms:** PartyKit-style rooms using the `partyserver` package on Cloudflare Workers and Durable Objects (SQLite-backed, hibernating).
- **Art:** cozy pixel art in a locked violet palette, generated with Surya's image model, cleaned and quantized by a small script, with all UI built in code.
- **Cost:** free tiers throughout. The only optional spend is a custom domain. See section 4.12 for the limits that matter.

### 0.4 Biggest risks (details in section 9)

1. Medical accuracy of content, since the builder is not a clinician and the recipient is.
2. Scope, because five games plus art plus story is a lot to finish before a fixed date.
3. Art consistency across many AI-generated assets.
4. Free-tier behaviors (Supabase pausing after inactivity, Cloudflare daily quotas).
5. Keeping it a surprise while still testing it.

### 0.5 Decision log

| ID | Decision | Notes |
|---|---|---|
| D1 | No game engine; plain web app | Most games are UI-driven (cards, dials, grids). Canvas only for the Lounge scene and one mini-game |
| D2 | Cozy pixel art as the art style | Chosen over sticker-book, painterly, and paper-cut |
| D3 | Violet palette from Coolors plus black and white | Ten violets, ink, white, and three functional colors |
| D4 | React + TypeScript + Vite | |
| D5 | Supabase Postgres for persistence | Single-tenant data model (one couple) |
| D6 | Vercel for the web front end | |
| D7 | PartyKit-style rooms via `partyserver` on Cloudflare | Replaces the earlier idea of host-authoritative rooms over Supabase Realtime |
| D8 | Two fixed Supabase accounts with password login and public signups disabled | Replaces the earlier idea of anonymous sign-in plus a couple join code; simpler and safer |
| D9 | Server-authoritative games; secrets live on the server | Hidden cards, secret words, and evidence tags never reach the other player's device |
| D10 | Game content is JSON in the repo, validated at build time | Only Peer Review flags and progress live in the database |
| D11 | Daily puzzle rolls over at midnight IST | Both players are in the same zone |
| D12 | Story and dialogue scripted in Ink (`inkjs`) | Persona-style layout (portrait, name tag, dialogue box, date tag), all original art |
| D13 | Characters, scenes, stickers, and key art are generated; UI chrome is built in code | Image models are unreliable for tiny precise UI |
| D14 | Avatar setup is included | Customization is clothing and accessories only; faces and hair stay fixed |
| D15 | Live play is the default; async is limited to daily puzzles and Case Files | Same time zone makes live easy |

---

## 1. Product requirements (PRD)

### 1.1 Background and problem

Surya and Lakshmi are in a long-distance relationship. Lakshmi is studying MBBS and wants to specialise in OB-GYN. Video calls and texting are fine, but they lack a shared activity that is fun, personal, and a little bit about her world. Existing medical games are solo and generic, none focus on OB-GYN, and none are built for two people playing together.

### 1.2 Vision

A cozy little world that feels like a staff lounge the two of them share, where quick, funny, genuinely clever games happen on a call, and where each win nudges a story forward and grows something together.

### 1.3 Goals

- **G1. Feel personal.** Their characters, their inside jokes, their photo reveal, her specialty.
- **G2. Be fun first, educational second.** Short rounds, instant rematches, humor, juicy feedback.
- **G3. Work on a call.** Games are designed so talking to each other is part of the play.
- **G4. Be cozy.** Warm, violet, pixel-art, lo-fi sound, no stress.
- **G5. Be accurate.** Clinical content is sourced, flagged for review, and never presented as medical advice.
- **G6. Be reliable.** Reconnects gracefully, loads fast on a phone, costs nothing to run.
- **G7. Have staying power.** Daily ritual, streaks, collectibles, and a roadmap beyond launch day.

### 1.4 Non-goals

- Not a study tool or exam-prep product, even though it will teach.
- Not a public product. No marketing, accounts for strangers, monetization, or analytics.
- Not a competitive ranked game. No anti-cheat beyond keeping secrets on the server.
- Not a replacement for the call. No in-app voice or video in v1.
- Not graphic medical content. OB-GYN subjects are handled in a friendly, tasteful way.

### 1.5 Users and personas

| Persona | Description | Needs |
|---|---|---|
| **Lakshmi** | MBBS student, aiming for OB-GYN. Busy schedule, probably plays on her phone, may also use a laptop | Quick sessions, content that respects her expertise, an easy way to flag mistakes, delight |
| **Surya** | Full-stack developer, builder and co-player. Plays on laptop or phone | Maintainable codebase, easy content authoring, clear admin view of flagged content |

Lakshmi's device and exam-schedule constraints are open questions (section 11).

### 1.6 Product principles

1. **Short rounds.** 30 to 90 seconds per decision. A game lasts 5 to 15 minutes.
2. **The call is the multiplayer.** Information is split so you must talk.
3. **Never block play.** Story scenes are skippable. Tutorials are skippable. Settings are reachable at all times.
4. **Cozy over punishing.** Failure is funny, never harsh. Streaks are forgiving.
5. **She is the attending.** Every piece of content can be flagged for review in two taps.
6. **Content is data.** Questions, cases, and words live in sourced, validated JSON.
7. **One pixel size.** Visual consistency is a hard rule.

### 1.7 Success criteria

This is a gift, so success is mostly qualitative, with a few checkable signals.

| Signal | Target |
|---|---|
| She opens it within 24 hours of the reveal | Yes |
| Sessions together in the first week | At least 3 |
| Shared daily streak reaches | 7 days |
| She uses the Peer Review flag | At least once (and it works) |
| Load time on a mid-range Android phone over 4G | Under 3 seconds to the Lounge |
| Disconnect in a live game recovers without losing the game | Always, within 2 minutes |
| No data loss of streaks, stickers, or progress | Zero incidents |

### 1.8 Scope tiers

| Tier | Contents |
|---|---|
| **Must (v1, launch)** | Gate and login, Staff Lounge hub, visual-novel scene player, avatar setup, Triage Dial, Guess the Diagnosis, Medical Wordle (daily, race, duel), settings, Peer Review, sticker album (basic), XP and ranks, shared daily streak |
| **Should (v1.5)** | Code Red (3 scenarios), stats and scoreboard screen, more stickers, cast portraits (Professor, Nurse) |
| **Could (v2)** | Case Files campaign (8 cases), Bond gallery and memory photo reveal, garden, cast codex, Steady Hands mini-game, key stills |
| **Won't (for now)** | In-app voice, spectators, multiple couples, public sharing, account recovery flows, localization |

If time is short, cut from the bottom of Should and Could, never from Must. Section 7.4 defines the cut line precisely.

### 1.9 Functional requirements

**Access and identity**

- FR-01. The site is unlisted, `noindex`, and gated by a sign-in screen ("Staff Entrance") — privacy comes from the URL itself being unlisted, not from a secret typed at the gate (see FR-02).
- FR-02. Exactly two users exist. Login is a character picker ("Who is entering?") only — tap your character, tap Enter, no typed passcode. Still backed by Supabase email and password (D8), but the credentials are supplied by the client per character rather than typed in; privacy comes entirely from the URL being unlisted (FR-01), not from this login step. Public signups are disabled.
- FR-03. Sessions persist on the device and refresh silently. If a session is lost, the gate reappears with no data loss.

**Hub (Staff Lounge)**

- FR-10. The Lounge is a pixel scene with tappable objects for each game, a window that changes with the real time of day (IST), the garden, a sticker shelf, and a trophy shelf.
- FR-11. A persistent navigation bar (Home, Games, Album, Stats, Settings) always provides a plain, non-pixel-hunt way to navigate.
- FR-12. The Lounge shows whether the other player is online, the status of today's daily puzzle for both, the shared streak, XP and rank for both, and a "come play" nudge button.

**Rooms and multiplayer (shared by all live games)**

- FR-20. Creating a room yields a 4-letter room code and a share link. Joining via link or code requires being signed in as one of the two users.
- FR-21. Rooms hold exactly two players. Both tap Ready to start. A 3-2-1 countdown precedes play.
- FR-22. If a player disconnects, the game pauses and the seat is held for 2 minutes. Reconnecting restores the exact state.
- FR-23. A reaction bar (6 emoji) is available in every live game, with reactions floating over the partner's screen.
- FR-24. Every game ends with a results screen offering Rematch, Back to Lounge, and (where relevant) the debrief.

**Games**

- FR-30 to FR-39: Guess the Diagnosis (section 3.1).
- FR-40 to FR-49: Triage Dial (section 3.2).
- FR-50 to FR-59: Medical Wordle (section 3.3).
- FR-60 to FR-69: Code Red (section 3.4).
- FR-70 to FR-79: Case Files (section 3.5).

**Story layer**

- FR-80. A reusable scene player renders portrait, name tag, typewriter dialogue, expression changes, backgrounds, choices, a log, and skip.
- FR-81. Scenes are authored in Ink text files and referenced by ID. Scenes can play at: first visit, game intros and outros, rank-ups, bond milestones, and the final reveal.
- FR-82. A date and time-of-day tag appears on scenes and in the Lounge (examples: After Rounds, Night Duty, Late Night Call).

**Avatars and progression**

- FR-90. Avatar setup lets each player choose scrubs color, coat on or off, stethoscope color, glasses, headphones, hair accessory, and backpack charm. Faces and hair are fixed.
- FR-91. XP and five ranks (Intern, Resident, Registrar, Consultant, Professor). Ranks unlock accessories and scenes.
- FR-92. Bond rank rises from playing together and unlocks memory scenes.
- FR-93. Twenty stickers with defined unlock conditions, shown in a sticker album.
- FR-94. A shared daily streak counts days both players complete the daily puzzle. A growing garden accumulates growth points from those days.
- FR-95. A Doctor vs Engineer scoreboard records head-to-head results across games.

**Content review**

- FR-100. Every question, clue, case, word, and card has a flag icon. Flagging opens a two-field form (what's wrong, suggested correction) and saves to the database.
- FR-101. A Peer Review inbox ("The Attending's Office") lists flags with status (open, fixed, rejected) so Surya can track fixes.
- FR-102. Content items carry a `reviewed` flag, and unreviewed items show a small badge during testing.

**Settings and platform**

- FR-110. Settings cover sound effects, music volume, reduced motion, text size, dialogue speed, colorblind shape cues, haptics, display name, and avatar.
- FR-111. The app is an installable PWA with cached static assets.
- FR-112. A "How to play" card exists for every game, and a credits screen includes a short disclaimer that this is for fun and learning, not medical advice.

### 1.10 Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Initial load under 3 s on mid-range Android over 4G; 60 fps animation on typical phones; assets lazy-loaded per game |
| Latency | Round-trip under 150 ms typical within India; needle and reaction updates feel instant |
| Reliability | Reconnect within 2 min restores state; no data loss for progress tables |
| Compatibility | Latest Chrome and Edge on Windows, Chrome on Android, Safari on iOS (at least the last two major versions) |
| Accessibility | WCAG 2.1 AA contrast for text, keyboard operable, reduced-motion support, colorblind shape cues, no flashing above 3 Hz |
| Privacy | No third-party analytics or trackers; photos stay in a private repo; site is `noindex` |
| Security | Row-level security on every table; JWT verified on every WebSocket connect; origin allowlist; per-connection rate limits |
| Cost | Free tiers only, with documented limits and headroom |
| Maintainability | One monorepo, shared types and engines, content validated in CI |

### 1.11 Assumptions and constraints

- Both players have reliable internet most of the time and play at the same time for live games.
- The recipient will not see this document before launch (it contains the surprise plan).
- The builder works on this part-time alongside a full-time job. Estimates in section 7 are in focused dev-days.
- Free-tier terms were checked in October 2026 and must be re-checked before launch (section 4.12).
- Medical content is authored from standard references, reviewed by a clinician (Lakshmi) before it is treated as final, and framed as a game.

### 1.12 Dependencies

Image model (art generation), a pixel editor (Piskel, LibreSprite, or Aseprite), royalty-free or self-made audio, Lakshmi's time for content review, and accounts on Vercel, Supabase, Cloudflare, and GitHub.

---

## 2. Experience design

### 2.1 Visual language

**Palette roles** (full table in section 6.2)

| Use | Colors |
|---|---|
| Page backgrounds, cards, "daytime" scenes | `DEC9E9`, `DAC3E8`, `D2B7E5`, white |
| Secondary surfaces, tiles, hover | `C19EE0`, `B185DB` |
| Mid-tones, clothing, glow | `A06CD5`, `9163CB` |
| Buttons, headers, active states | `815AC0`, `7251B5` |
| Night scenes, Code Red, deep UI | `6247AA`, ink `14101F` |
| Text and outlines | ink `14101F`, white |
| Functional | mint `8FE3B0` (correct), butter `FFE08A` (present), coral `FF7A7A` (danger) |

**Contrast rule of thumb** (verify with a contrast checker): white text on `815AC0` and darker; ink text on `9163CB` and lighter. Avoid small text on the middle violets.

**Typography:** a pixel font such as Pixelify Sans for UI and dialogue, with a monospace fallback. Minimum body size is 16 CSS px on phones. Fonts must stay legible at the player's text-size setting (S, M, L).

**Layout system**

- **Landscape and desktop:** a 480x270 "stage" scaled by an integer factor and centered, with UI panels beside or beneath it as the screen allows.
- **Portrait phones:** a square stage showing the center 270x270 of the scene, scaled by an integer factor of device pixels, with the controls in a panel below. All backgrounds are composed so the important content sits in that center square.
- **Scale function:** `scale = max(1, floor(containerCssWidth * devicePixelRatio / artWidth)) / devicePixelRatio`. Render with `image-rendering: pixelated` and never at a fractional device-pixel scale.
- **Touch targets:** at least 44 CSS px.

### 2.2 Screen inventory

Phase column: v1, v1.5, v2 (matching section 1.8).

| ID | Screen | Route | Purpose and key elements | Phase |
|---|---|---|---|---|
| S01 | Staff Entrance gate | `/gate` | Door entrance animation, "Who is entering?" character picker, Enter button, mascot | v1 |
| S02 | Intro scene | `/scene/intro` | One-time cutscene with the mascot and birthday message | v1 |
| S03 | Avatar setup | `/avatar` | Portrait and sprite preview, scrubs swatches, accessory slots, name | v1 |
| S04 | Staff Lounge | `/` | Pixel hub, hotspot objects, window time-of-day, garden, shelves, status chips | v1 |
| S05 | Games list | `/games` | Plain list of the five games with status, best score, and Play buttons (the non-pixel-hunt route) | v1 |
| S06 | Game intro card | `/g/:game` | Rules summary, pack and difficulty pickers, Create Room or Join Room, How to play | v1 |
| S07 | Skippable tutorial | `/scene/tut-:game` | Short VN scene teaching the game | v1 |
| S08 | Waiting room | `/g/:game/:code` | Room code, share link, both avatars, Ready toggles, reaction bar | v1 |
| S09 | Pause and disconnect overlay | overlay | "Partner reconnecting" with a 2-minute hold timer, Leave option | v1 |
| S10 | Guess the Diagnosis: pick | in-room | Choose your secret patient from the board | v1 |
| S11 | Guess the Diagnosis: board | in-room | 24 cards, question drawer, lives, lifelines, turn timer | v1 |
| S12 | Guess the Diagnosis: guess confirm | modal | Confirm final guess | v1 |
| S13 | Triage Dial: clue-giver view | in-room | Dial with hidden target visible, spectrum labels, clue field | v1 |
| S14 | Triage Dial: dialer view | in-room | Dial with needle, Lock In | v1 |
| S15 | Triage Dial: reveal and debate | in-room | Dial opens, points, 10-second argue beat, reaction bar | v1 |
| S16 | Medical Wordle: mode select | `/wordle` | Daily, Race, Duel, pack picker, streak display | v1 |
| S17 | Medical Wordle: board | `/wordle/daily` or in-room | Grid, on-screen keyboard, hint button | v1 |
| S18 | Medical Wordle: duel word setter | in-room | Type a secret word and optional hint | v1 |
| S19 | Medical Wordle: result and share | overlay | Explanation card, share text copy, side-by-side with partner | v1 |
| S20 | Results and debrief | in-room | Score, XP, stickers, teaching notes, Rematch | v1 |
| S21 | Scene player | `/scene/:id` | Portrait, name tag, dialogue, log, skip, choices | v1 |
| S22 | Sticker album | `/album` | 20 stickers, locked silhouettes, unlock hints | v1 |
| S23 | Peer Review flag form | modal | What's wrong, suggested correction | v1 |
| S24 | Peer Review inbox | `/review` | "The Attending's Office": flags, status, Mark fixed | v1 |
| S25 | Settings | `/settings` | Audio, motion, text size, dialogue speed, colorblind cues, haptics, name | v1 |
| S26 | How to play | `/help/:game` | Per-game rules reference | v1 |
| S27 | Credits and disclaimer | `/credits` | Made-for-you note, "for fun and learning, not medical advice" | v1 |
| S28 | Loading screen | overlay | Mascot walking loader on the skyline | v1 |
| S29 | Error and offline states | overlay | Connection lost, partner left, backend unavailable | v1 |
| S30 | 404 "Wrong Ward" | `/404` | Empty corridor with a blank sign | v1 |
| S31 | Code Red: briefing and roles | in-room | Patient story, role assignment, difficulty | v1.5 |
| S32 | Code Red: Bedside | in-room | Monitor, observations, examine tiles, orders tray | v1.5 |
| S33 | Code Red: Protocol Binder | in-room | Tabbed binder, pinned cards, timer | v1.5 |
| S34 | Stats and scoreboard | `/stats` | Doctor vs Engineer record, streaks, per-game history, trophies | v1.5 |
| S35 | Case Files: case map | `/cases` | Eight cases, locked and solved, polaroid progress | v2 |
| S36 | Case Files: briefing | in-room | Case intro, patient, five differentials | v2 |
| S37 | Case Files: evidence hand | in-room | Your cards, Share button, shares remaining | v2 |
| S38 | Case Files: deduction grid and corkboard | in-room | Shared grid, pinned cards, hint, Submit | v2 |
| S39 | Case Files: result and memory fragment | in-room | Stars, tokens, new polaroid tiles | v2 |
| S40 | Bond gallery | `/bond` | Bond rank, unlocked memory scenes, the developing photo | v2 |
| S41 | Cast codex | `/codex` | Profiles of the mascot, dog, Professor, Nurse, Consultant | v2 |
| S42 | Rank-up and daily-complete celebrations | overlay | Confetti, new accessory or sticker | v1 |
| S43 | Garden view | in Lounge | Plants grow with shared daily completions | v2 |

### 2.3 Wireframes

ASCII sketches, drawn for the 480x270 stage. Portrait phones show the center square with controls beneath.

**S04 Staff Lounge**

```
+--------------------------------------------------+
| [online: Lakshmi]  [daily: you ok | her ..] [7d] |
|                                                  |
|  [corkboard]      ( window: dusk )     [radio]   |
|   Case Files                           Triage    |
|                                                  |
|  [whiteboard]      [ sofa + dog ]    [desk lamp] |
|   Guess Dx                            Wordle     |
|                                                  |
|  [sticker shelf]   [garden]   [trophies] [DOOR]  |
|                                          Code Red|
|  you [sprite]                her [sprite]        |
+--------------------------------------------------+
|  Home | Games | Album | Stats | Settings         |
+--------------------------------------------------+
```

**S21 Scene player (visual novel)**

```
+--------------------------------------------------+
|                         [11/10 · Night Duty]     |
|  (background)                                    |
|                              +----------------+  |
|    [portrait: PIP]           |  portrait:     |  |
|                              |  LAKSHMI       |  |
|                              |   (smug)       |  |
|  +------------------------------------------+    |
|  | [LAKSHMI]                                |    |
|  | Famous last words from a man who...      |    |
|  |                              [log][skip] |    |
|  +------------------------------------------+    |
+--------------------------------------------------+
```

**S14 Triage Dial (dialer view)**

```
+--------------------------------------------------+
|  Round 3 / 8        Score 9         [45s]        |
|                                                  |
|    Can wait  <---- ( dial arc, needle ) ---->    |
|                      Needs theatre now           |
|                                                  |
|   Clue-giver says: "BP 170/110 at 36 weeks"      |
|                                                  |
|        [ drag needle ]       [ LOCK IN ]         |
|  reactions:  clap heart skull brain laugh steth  |
+--------------------------------------------------+
```

**S17 Medical Wordle**

```
+------------------------------+
|  Daily #12 · OB-GYN · streak 5|
|   [ ][ ][ ][ ][ ]            |
|   [ ][ ][ ][ ][ ]            |
|   [ ][ ][ ][ ][ ]   (6 rows) |
|   hint after guess 4: [Hint] |
|   Q W E R T Y U I O P        |
|    A S D F G H J K L         |
|     Z X C V B N M  [Enter][<]|
+------------------------------+
```

**S11 Guess the Diagnosis (board)**

```
+--------------------------------------------------+
| Your turn · 45s · Lives: 3 · Lifelines: C S      |
| +----+ +----+ +----+ +----+ +----+ +----+        |
| |card| |card| |card| |card| |card| |card|  x24   |
| +----+ +----+ +----+ +----+ +----+ +----+        |
| Remaining: 14        Last answer: YES (fever)    |
| [ ASK ]  [ FINAL GUESS ]  [ Consult ] [ 2nd op ] |
+--------------------------------------------------+
```

**S32 / S33 Code Red (two roles)**

```
BEDSIDE                         PROTOCOL
+---------------------------+   +---------------------------+
| HR 112  BP 98/60  SpO2 97 |   | Time left 05:12           |
| Blood loss 850 ml  [!]    |   | [Algorithm][Drugs][Notes] |
| Patient: pale, anxious    |   | 1. Call for help          |
| EXAMINE: [fundus][perin.] |   | 2. ...                    |
| ORDERS tray: [..][..][..] |   |  (pin card) (pin card)    |
| [Radio phrases] [Call]    |   | [Radio phrases]           |
+---------------------------+   +---------------------------+
```

**S38 Case Files (deduction grid)**

```
+--------------------------------------------------+
| Case 3 · Shares left: 4 · Tokens: 3              |
|            Card1 Card2 Card3 Card4 Card5         |
| Dx A        ?     x     ?     v     ?            |
| Dx B        v     ?     ?     ?     x            |
| Dx C        ?     ?     x     ?     ?            |
| Dx D        x     ?     ?     ?     ?            |
| Dx E        ?     v     ?     ?     ?            |
| [my cards] [corkboard] [Hint] [SUBMIT]           |
+--------------------------------------------------+
```

### 2.4 Shared controls

| Action | Touch | Desktop |
|---|---|---|
| Select or place | Tap | Click |
| Drag | Press and drag | Click and drag |
| Reaction | Tap emoji bar | Keys 1 to 6 |
| Flag content (Peer Review) | Tap flag icon | Key F |
| Pause or leave | Menu button | Esc |
| Sound toggle | Speaker icon | Key M |
| Rematch | Results button | Enter |

Per-game controls are in section 3.

### 2.5 Story layer

**Scene player behavior**

- Typewriter text at a speed set in Settings (slow, normal, fast, instant). Tap or Space finishes the current line, tap again advances.
- A blip sound per speaker plays every second character.
- Portraits slide in from the side, swap expression mid-line on an expression tag, and shake briefly on a shout tag.
- A log button opens the history of lines. Skip fast-forwards through lines already seen.
- Choices appear as a short vertical menu and can set small flags (flavor), never block gameplay.
- A date and time-of-day tag shows in a corner. Time-of-day labels: After Rounds, Night Duty, Late Night Call, Weekend, Exam Week.

**Ink conventions** (scenes are `.ink` files compiled to JSON by `inkjs`)

- One knot per scene, named by scene ID. Tags after a line set speaker and expression: `# speaker:gyna # expr:happy`.
- Scene-level tags at the top set the background, music, and time tag: `# bg:lounge_dusk # music:lounge_night # time:Night Duty`.
- Variables track flags (for example `met_dog`, `bond_rank`).

**Sample scene (placeholders to rewrite in your own voice)**

```ink
=== triage_intro ===
# bg:lounge_dusk # music:lounge_night # time:After Rounds
Okay, rookies. Rule one of Triage Dial: the clue-giver talks, the dialer shuts up and drags. # speaker:gyna # expr:happy
I have fixed production at 3 a.m. How hard can triage be? # speaker:you # expr:smug
Famous last words from a man who thinks a rash and a hemorrhage are both red. # speaker:her # expr:smug
Lock in, then argue. That is the whole game! # speaker:gyna # expr:excited
-> END
```

**Scene triggers**

| Scene ID | When it plays |
|---|---|
| `intro` | First login on each device |
| `tut_guess`, `tut_triage`, `tut_wordle`, `tut_codered`, `tut_cases` | First time entering each game (skippable) |
| `rank_up_1` to `rank_up_4` | On reaching each new rank |
| `bond_1` to `bond_5` | On reaching each bond rank (memory scenes with stills) |
| `case_1_intro` to `case_8_intro`, `case_1_outro` to `case_8_outro` | Around each Case Files case |
| `streak_7`, `streak_30` | On shared streak milestones |
| `finale` | After all memory tiles are revealed |

**Cast** (names and looks are placeholders until filled in section 11)

- **You and her:** the two leads, drawn from the character bible.
- **Gyna (mascot):** a barn owl, narrator and heckler — name pronounced "Gina," a wink at OB-GYN. Wears a small stethoscope. Opens the door for new arrivals and gives the tour.
- **The Ward Dog:** a scruffy golden mutt, endlessly enthusiastic, a terrible secret-keeper.
- **The Professor:** gives hints ("Ask the Professor").
- **The Grumpy Consultant** and **the Nurse Who Knows Everything:** recurring in Case Files and Code Red.
- **Patients:** recurring, friendly, with small running side stories.

### 2.6 Meta systems

**XP awards** (tunable constants in `packages/shared/src/config.ts`)

| Event | XP |
|---|---|
| Finish any live game | 20 |
| Win a versus game | +10 |
| First time playing each game | +30 |
| Complete the daily puzzle | 15 |
| Both complete the daily puzzle the same day | +10 each |
| Shared streak bonus | +5 per streak day, capped at +50 |
| Code Red, per star | 15 |
| Case solved | 40, plus 10 per star |

**Ranks** (total XP per player)

| Rank | XP needed | Unlocks |
|---|---|---|
| Intern | 0 | Base accessories |
| Resident | 200 | New stethoscope colors, glasses |
| Registrar | 600 | Headphones, hair accessories |
| Consultant | 1400 | Backpack charms, rare scrubs colors |
| Professor | 3000 | Gold name tag, a special scene |

**Bond rank** (shared, rises from co-play)

- +10 bond XP for each completed co-op game, +5 for each day both complete the daily, +20 for each Case Files case.
- Thresholds: 50, 150, 300, 500, 800 for bond ranks 1 to 5. Each unlocks a memory scene with an illustrated still.

**Shared daily streak and garden**

- A day counts when both players have a result row for that IST date (solved or failed).
- Streak increments when the previous day also counted, otherwise it restarts at 1. Best streak is kept.
- Every counted day adds 1 garden growth point. Five points mature a plant, and a new seed appears. The garden holds 12 plants. Missing a day resets the streak but never harms the plants.

**Sticker album (20)**

| # | Sticker | Unlock condition |
|---|---|---|
| 1 | First Delivery (stork) | Finish your first Code Red scenario |
| 2 | Zero Flatlines (heart with ECG) | Win a Code Red scenario with 3 stars |
| 3 | Overconfident (peacock) | Make a wrong final guess on your first turn in Guess the Diagnosis |
| 4 | Phone a Friend (phone) | Use the Consult lifeline |
| 5 | Detective (magnifier) | Solve a case with all tokens remaining |
| 6 | On a Roll (flame) | 3-day shared streak |
| 7 | Minor Setback (bandage) | Lose any live game |
| 8 | In Sync (stethoscope heart) | Get 3 bullseyes in one Triage Dial game |
| 9 | Fuel (coffee cup) | Play 3 days in a row |
| 10 | Big Brain (brain) | Solve the daily Wordle in 2 guesses |
| 11 | Pharma Pro (pill) | Win a Wordle in the Pharmacology pack |
| 12 | Fever Streak (thermometer) | 7-day shared streak |
| 13 | Dog Whisperer (ward dog) | Tap the Ward Dog 10 times |
| 14 | Best Friend (mascot) | Reach bond rank 2 |
| 15 | Rising Star (star) | First rank-up |
| 16 | Champion (trophy) | Win 5 versus games (either player) |
| 17 | Master Key (key) | Play all five games at least once |
| 18 | Night Owl (moon) | Play after midnight IST |
| 19 | Green Thumb (plant) | First garden plant fully grown |
| 20 | Memory Lane (polaroid) | Reveal the full memory photo |

**Doctor vs Engineer scoreboard**

Lifetime wins per player per game, current win streak, and a champion banner on the Stats screen.

### 2.7 Audio design

- **Music (loops, toggle and volume in Settings):** Lounge day, Lounge night (lo-fi), a gentle game loop, a tense low loop for Code Red, a soft piano loop for story scenes.
- **SFX list:** tap, card flip, correct, wrong, lock-in, reveal sting, countdown ticks, ECG beep (rate follows heart rate), alarm (Code Red), order applied, rank-up fanfare, sticker unlock, garden grow, reaction pop, dialogue blip (one pitch per speaker).
- **Sourcing:** make SFX yourself with a free browser tool such as jsfxr, and use CC0 or properly licensed music, or generate original tracks. Check the license for every file and keep a credits list.
- **Rules:** sound never carries essential information. All audio starts muted until the first tap (browser autoplay rules) and respects the sound settings.

### 2.8 Accessibility and settings

- WCAG 2.1 AA contrast for text. Verify every text-on-background pair, especially on mid violets.
- Fully keyboard operable on desktop, with visible focus rings in a high-contrast color.
- Reduced motion: disables shake, parallax, confetti, and the alarm pulse (replaced by a static color change).
- Colorblind cues: Wordle tiles always carry a shape or symbol in addition to color (check, tilde, dot). Dial score bands carry patterns.
- Screen reader labels on controls, `aria-live` regions for game events (answers, scores, feedback).
- No flashing faster than 3 times per second, so the Code Red alarm pulse stays at 2 Hz or slower.
- Text size S, M, L. Dialogue speed slow, normal, fast, instant.

### 2.9 Copy and tone guide

Friendly, a little cheeky, never mocking. Failure states are funny, success states are warm.

- Loss: *Patient flatlined. Cause of death: overconfidence.* / *Differential: too differential.*
- Win: *Discharged with a clean bill of health.*
- Disconnect: *Your partner stepped out for rounds. Holding the ward for 2:00.*
- Error: *This ward is closed for cleaning. Try again in a moment.*
- Review thanks: *Noted, Attending. Correcting the chart.*

Tone for OB-GYN content: warm, respectful, and never graphic. Use friendly illustrations and clean diagrams.

---

## 3. Game specifications (five games)

Every game's rules live as a pure, server-authoritative TypeScript reducer (D9, section 4.7). The client only ever renders a redacted state slice; it never computes outcomes, reveals hidden information to the wrong screen, or trusts a client-side guess. FR ranges below match the stubs in section 1.9.

### 3.1 Guess the Diagnosis (FR-30 to FR-39)

Inspired by Guess Who. A 24-card deck of conditions; each player secretly holds one (their own "patient"), and the two take turns asking free-form yes/no questions out loud, answered honestly by whichever player holds the matching card. The app's job is state, not language — it never auto-answers.

| ID | Requirement |
|---|---|
| FR-30 | A pre-game pack/difficulty picker sets the deck; deck size is fixed at 24 cards, built from 1 to 3 selected packs. |
| FR-31 | At room start the server deals each player one secret card from the shared deck; the secret never reaches the other client. |
| FR-32 | Turn order alternates. The active player asks a question aloud and taps **Ask** to log it and pass the turn. |
| FR-33 | The answering player taps **Yes**, **No**, or **Not sure** — logged with a timestamp to a shared question log both can see. |
| FR-34 | Either player may tap cards on their own 24-card board to mark them eliminated; elimination state is private and never synced (only a remaining-count badge is shared). |
| FR-35 | A 45-second turn timer auto-passes an idle turn with no penalty. |
| FR-36 | A player may tap **Final Guess** on their turn; a confirm modal (S12) precedes the server checking it against the opponent's real secret card. |
| FR-37 | Each wrong final guess costs one life (3 lives total); losing the third life ends that player's chance to win the round. |
| FR-38 | Two one-use lifelines per player: **Consult** (the Professor reveals one true/false tag about the opponent's secret card) and **2nd Opinion** (undoes the life lost on the most recent wrong final guess). |
| FR-39 | The game ends on a correct final guess (winner), both players out of lives (draw), or a player leaving past the reconnect window (opponent wins by default, FR-22). |

**Content schema:** `{id, name, specialty, tags[], blurb, difficultyTier, source, reviewed}` — see section 5.2.

### 3.2 Triage Dial (FR-40 to FR-49)

Inspired by Wavelength. A spectrum card names two clinical extremes (e.g. "Can wait" vs. "Needs theatre now"); the clue-giver sees a hidden target position and gives a one-line clue; the dialer drags a needle and locks it in; the dial opens to reveal how close they got.

| ID | Requirement |
|---|---|
| FR-40 | A pre-game pack/category picker sets the spectrum deck; a game is 8 rounds. |
| FR-41 | Each round the server deals a spectrum card and a hidden target (0–100) to the clue-giver only. |
| FR-42 | The clue-giver locks in a one-line clue; the dialer then has 45 seconds to drag the needle and tap **Lock In**. |
| FR-43 | On lock-in the server reveals the true target and scores by band: bullseye (±10 = 4 pts), close (±20 = 3 pts), edge (±35 = 2 pts), miss (0 pts). |
| FR-44 | A 10-second "argue" beat follows every reveal, with the reaction bar and a free-text taunt field open. |
| FR-45 | Co-op mode: the pair shares one running score across all 8 rounds; roles still swap each round. |
| FR-46 | Versus mode: clue-giver role alternates each round; cumulative points compared head-to-head on results; ties replay the final round. |
| FR-47 | Score bands carry a distinct hatch pattern on the dial arc in addition to color (colorblind cue, section 2.8). |
| FR-48 | The needle position streams live to the clue-giver's screen, throttled to 15 updates/second; the hidden target stays hidden from the dialer until lock-in. |
| FR-49 | Results show per-round bands and best round; the "In Sync" sticker (3 bullseyes in one game) is evaluated server-side at game end. |

**Content schema:** `{id, leftLabel, rightLabel, category, clueExamples[], source, reviewed}`.

### 3.3 Medical Wordle (FR-50 to FR-59)

Inspired by Wordle and Meddle. Five-letter medical words, standard Wordle rules, in three modes: Daily (shared, async), Race (live, simultaneous), Duel (each sets a word for the other).

| ID | Requirement |
|---|---|
| FR-50 | Daily mode uses one shared 5-letter word per IST calendar day (rollover 00:00 IST, D11), chosen deterministically from the pack rotation so no server race decides it. |
| FR-51 | Daily results are solved independently (6 rows each) and shown side-by-side once both finish or opt to reveal early. |
| FR-52 | Race mode: both players solve the same word live; first to solve (or closest after 6 rows) wins; a ghost indicator shows the opponent's guess count without revealing letters. |
| FR-53 | Duel mode: each player privately sets a validated 5-letter secret word and an optional one-line hint, then both solve each other's word live. |
| FR-54 | Feedback tiles carry color (green/yellow/gray) plus a shape glyph (check/tilde/dot) for colorblind accessibility. |
| FR-55 | A hint button unlocks after guess 4, revealing category/definition only; costs a small XP penalty on Daily/Race, free on Duel if the setter allowed it. |
| FR-56 | Packs: General, OB-GYN, Pharmacology, Anatomy, Pediatrics, and an Inside-Jokes pack reserved for Duel only. |
| FR-57 | The shared daily streak (section 2.6) increments only from Daily-mode results. |
| FR-58 | The result/share card (S19) renders a copyable colored-square grid plus the word's teaching note and source. |
| FR-59 | The word list and schedule are build-validated for no repeats in a rolling 365-day window and no word surfacing before its pack unlocks by rank. |

**Content schema:** `{id, word, definition, pack, difficultyTier, source, reviewed}`.

### 3.4 Code Red (FR-60 to FR-69, v1.5)

Inspired by Keep Talking and Nobody Explodes. Asymmetric and co-op: one player sees the patient (Bedside), the other sees the protocol binder (Protocol). Neither sees the other's screen — they must talk it through on the call.

| ID | Requirement |
|---|---|
| FR-60 | Briefing (S31) randomly assigns Bedside or Protocol each game; roles swap on rematch. |
| FR-61 | Bedside (S32) shows live vitals (HR, BP, SpO2) drifting on the scenario's scripted timeline, tappable examine tiles revealing findings, and an orders tray. |
| FR-62 | Protocol (S33) shows a tabbed binder (Algorithm, Drugs, Notes), pinnable cards, and a shared countdown (around 5 minutes). |
| FR-63 | Neither screen shows the other's information; coordination happens only by voice/video. |
| FR-64 | Applying an order (drag from tray onto patient) is validated server-side against the scenario's correct sequence and reveals an immediate consequence. |
| FR-65 | A preset "radio phrases" quick-phrase panel is available on both screens as a fallback if voice drops. |
| FR-66 | Wrong or out-of-sequence orders cost time/vitals rather than instantly failing; three serious errors end the scenario as "code called." |
| FR-67 | Scoring is 1 to 3 stars from time remaining and error count, feeding the XP table (15 XP/star). |
| FR-68 | Three launch scenarios: postpartum hemorrhage, severe pre-eclampsia/eclampsia, shoulder dystocia — each with a sourced debrief. |
| FR-69 | The debrief shows the full correct sequence, where the pair diverged, and the cited source for every teaching note (FR-CNT-1). |

**Content schema:** `{id, title, briefing, vitalsTimeline[], examineFindings[], orderOptions[], correctSequence[], debriefNotes, source, reviewed}`.

### 3.5 Case Files (FR-70 to FR-79, v2)

Inspired by Murdle. A co-op campaign of 8 medical mysteries with split evidence: each player holds a different hand of clues for the same case and must reconcile them on a shared deduction grid.

| ID | Requirement |
|---|---|
| FR-70 | The case map (S35) lists 8 cases, unlocked in order; each opens with a briefing naming the patient, chief complaint, and five differentials. |
| FR-71 | The server deals each player a distinct, non-overlapping evidence hand for the case. |
| FR-72 | A **Share** button reveals a card to both screens' corkboard, consuming one of a limited per-case pool of shares (forces talking, not screenshotting). |
| FR-73 | A shared 5×5 deduction grid (differentials × evidence) is editable by both players in real time (confirm, rule out, unknown). |
| FR-74 | A limited pool of hint tokens (typically 3) each reveal one correct grid cell; unused tokens at submission raise the star rating. |
| FR-75 | Submitting locks the grid and resolves the case: 3 stars for a correct diagnosis, no wrong submissions, and all tokens unused, scaling down otherwise. |
| FR-76 | Each case has narrative intro/outro scenes (`case_N_intro`/`case_N_outro`) advancing a season-long mystery independent of the medical content. |
| FR-77 | Solving a case reveals one Polaroid tile in the Bond gallery; all 8 solved completes the photo and triggers the `finale` scene. |
| FR-78 | Cases are replayable, but replays grant no Polaroid tiles, star-XP, or bond XP (no farming). |
| FR-79 | Case content is build-validated so every evidence card maps to exactly one correct cell per differential row. |

**Content schema:** `{id, title, patientSummary, differentials[5], evidenceCards[], solutionGrid, hints[], introSceneId, outroSceneId, source, reviewed}`.

---

## 4. Technical requirements (TRD)

### 4.1 Architecture overview

Three deployed pieces, each doing one job:

```
Browser (React PWA) <--HTTPS/WS--> Vercel (static + edge)
        |                                   |
        | Supabase JS client                | WebSocket to a room
        v                                   v
   Supabase (Postgres, RLS,          Cloudflare Worker
   email+password auth)              (partyserver, one Durable
                                      Object per room code,
                                      SQLite-backed, hibernating)
```

Persistent, cross-session data (profiles, XP, streaks, stickers, scoreboard, peer-review flags, scene flags) lives in Supabase. Live, ephemeral, secret game state (whose turn, hidden cards, hidden targets, evidence hands) lives only inside the room's Durable Object for the life of that room.

### 4.2 Monorepo layout

```
ward-games/
  apps/
    web/          React + TS + Vite front end, deployed to Vercel
    rooms/        Cloudflare Worker, partyserver rooms (Durable Objects)
  packages/
    shared/       Game engines, types, XP/rank config, room message types
    content/      JSON content packs + Zod schemas + validation scripts
    ui/           Shared pixel-UI component library
  scenes/         .ink source files, compiled to JSON by inkjs at build
  art/            Source art (pre-export) and exported sprites/backgrounds
  scripts/        Content validation, art cleanup/quantize, deploy helpers
```

### 4.3 Front end

React Router maps one route per screen in the inventory (section 2.2). A small global store (context or a lightweight state library) holds the active room's live state, the signed-in profile, and settings; it's hydrated from the room WebSocket, never computed client-side. PWA support via a service-worker plugin caches static assets (FR-111). The integer pixel-scale function from section 2.1 is a single shared helper used by every stage-rendering screen. Settings (text size, dialogue speed, reduced motion, colorblind cues) apply through CSS custom properties and a settings context read by the scene player and every game.

### 4.4 Auth and identity

- One Supabase project, public signups disabled (D8).
- Exactly two rows in `auth.users` — Surya and Lakshmi — created once via the Supabase dashboard or a one-off seed script, each with a password known only to the two of them.
- The gate screen (S01) submits email + password to Supabase Auth; on success the SDK's session persists and refreshes silently (FR-03).
- The "Who is entering?" character picker is a cosmetic front end that maps a tap to the matching account's email before the password field.

### 4.5 Database schema

Every table carries row-level security scoped to the two known `user_id`s; shared rows (streak, garden, bond, scoreboard) are readable by both and writable only by the server logic that computes them.

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | user_id (pk), display_name, avatar_json, rank, xp | One row per player |
| `daily_results` | id, user_id, game, ist_date, result (jsonb) | Unique on (user_id, ist_date, game); drives streak (2.6) |
| `garden` | plant_slot, stage, planted_at | Max 12 rows |
| `stickers_unlocked` | user_id, sticker_id, unlocked_at | |
| `scoreboard` | user_id, game, wins, losses, current_streak | Doctor vs Engineer board |
| `bond` | bond_xp, bond_rank | Singleton row, shared |
| `peer_review_flags` | id, content_type, content_ref, reported_by, what_wrong, suggested_fix, status, created_at, resolved_at | Status: open / fixed / rejected (FR-100/101) |
| `case_progress` | case_id, stars, hints_used, solved_at | Shared per case (v2) |
| `scene_flags` | key, value (jsonb) | Ink variable state (e.g. `met_dog`, `bond_rank`), shared across devices |

### 4.6 Realtime rooms protocol

- `partyserver` on Cloudflare Workers: one Durable Object per room code, SQLite-backed, hibernating when idle to control cost.
- Room code: 4 letters; collision on an active code regenerates (practically never an issue at this scale).
- WebSocket connect requires a valid Supabase JWT; the Worker verifies it against the Supabase JWT secret and checks the user ID against the two known accounts before accepting (origin allowlist + user allowlist, per the security NFR).
- A typed message envelope, shared between client and server:

```ts
type RoomMessage =
  | { t: "join"; userId: string }
  | { t: "ready"; userId: string }
  | { t: "action"; game: GameId; payload: unknown }
  | { t: "state"; game: GameId; state: unknown }   // server -> client, redacted per recipient
  | { t: "reaction"; emoji: string }
  | { t: "pause"; reason: "disconnect" }
  | { t: "resume" }
  | { t: "leave" };
```

- All game state lives in the Durable Object (D9); each client receives only the slice meant for it — secret cards, hidden dial targets, and evidence hands are filtered server-side per recipient and never broadcast whole.
- Reconnect: on disconnect the Durable Object starts a 120-second hold timer (FR-22/FR-ROOM-3), pausing the game; reconnecting with the same JWT and room code replays the latest redacted state; past the timer, the room ends and the other player is notified.
- Rate limiting: high-frequency updates (e.g. the Triage Dial needle) are throttled to 15/second per connection; excess messages are dropped, not queued.

### 4.7 Game engines

Each game's rules are a pure function `(state, action) -> state` in `packages/shared/src/games/<game>/engine.ts`, unit-testable with no networking involved. The Durable Object imports the exact same reducer the tests run against, so client and server can never disagree about what a legal move is — the client only ever renders state it's given.

### 4.8 Story engine

`.ink` files under `scenes/` compile to JSON via `inkjs` at build time. The scene player (FR-80/81) drives the Ink runtime's line-by-line continue and choice calls, reading the tag conventions from section 2.5 for background, music, and time-of-day. Ink variables (`met_dog`, `bond_rank`, etc.) persist to `scene_flags` when a scene ends, so both devices agree on what's already been seen.

### 4.9 Content pipeline and validation

Every content pack is validated against a Zod schema (`packages/content/schemas`) via a `validate-content` script that runs in CI and as a pre-build step (D10, FR-CNT-4). Validation covers: schema shape, ID uniqueness, a solvability check for Wordle lists (valid words, no repeat within 365 days), and a cross-reference check for Case Files (every evidence card resolves to exactly one grid answer). A failing check fails the build.

### 4.10 Build and deployment

`apps/web` deploys to Vercel on push to `main`, with preview deployments on pull requests. `apps/rooms` deploys via `wrangler deploy`, either manually or through a GitHub Action using a Cloudflare API token secret. Supabase schema changes are tracked as migrations under `supabase/migrations` and applied with the Supabase CLI.

### 4.11 Security

RLS on every table (4.5). The rooms Worker is the only runtime holder of game secrets. No Supabase service-role key ever ships to a client. WebSocket connections are restricted by origin allowlist to the production domain and localhost in development. Supabase email/password auth with public signup disabled (D8) is the only identity path — there is no account-recovery flow in v1 (consistent with the Won't list, 1.8).

### 4.12 Free-tier limits and headroom

| Service | Free-tier limit | Expected usage | Headroom |
|---|---|---|---|
| Supabase | ~500 MB DB; pauses after a week of inactivity on the free plan | Low tens of MB; two users | Large — add a trivial keep-alive ping if pausing becomes a problem |
| Cloudflare Workers + Durable Objects | 100k requests/day on the free plan | A handful of rooms/day, a few hundred messages each | Large |
| Vercel Hobby | 100 GB bandwidth/month | A few MB per visit, two users | Large |
| GitHub | Free private repo; 2,000 CI minutes/month | Light CI (lint, test, content validation) | Large |

Re-verify every row above against the live free-tier terms shortly before launch (section 1.11 already flags this).

### 4.13 Observability

No third-party analytics, per the privacy NFR. During development, rely on `wrangler tail` for the rooms Worker and Supabase's built-in dashboard logs. Nothing is retained beyond each platform's own default log window.

---

## 5. Content plan, schemas, and review workflow

### 5.1 Where content lives

One JSON pack per game/specialty combination, under `packages/content/src/<game>/<pack>.json`. Every item shares a base shape — `{id, reviewed: boolean, source: string, tags: string[]}` — plus the game-specific fields given in section 3.

### 5.2 Schemas

```ts
interface GuessCard { id: string; name: string; specialty: string; tags: string[];
  blurb: string; difficultyTier: 1|2|3; source: string; reviewed: boolean; }

interface TriageSpectrum { id: string; leftLabel: string; rightLabel: string;
  category: string; clueExamples: string[]; source: string; reviewed: boolean; }

interface WordleEntry { id: string; word: string; definition: string; pack: string;
  difficultyTier: 1|2|3; source: string; reviewed: boolean; }

interface CodeRedScenario { id: string; title: string; briefing: string;
  vitalsTimeline: VitalsPoint[]; examineFindings: Finding[]; orderOptions: Order[];
  correctSequence: string[]; debriefNotes: string; source: string; reviewed: boolean; }

interface CaseFile { id: string; title: string; patientSummary: string;
  differentials: [string, string, string, string, string]; evidenceCards: EvidenceCard[];
  solutionGrid: Grid; hints: Hint[]; introSceneId: string; outroSceneId: string;
  source: string; reviewed: boolean; }
```

Each is a Zod schema in `packages/content/schemas`, validated at build time (4.9).

### 5.3 Authoring workflow

Surya drafts items from standard references (5.4) and ships them with `reviewed: false`. A debug-only badge (FR-102) marks unreviewed items during testing. Rather than a slow, spoiler-risky pre-launch review pass, Lakshmi reviews content live through ordinary play, using the Peer Review flag (FR-100) — this is the entire reason that flow exists (see section 10.3 on keeping the surprise intact).

### 5.4 Sourcing

Content is written from standard MBBS-curriculum references (e.g. *Williams Obstetrics*, *Harrison's Principles of Internal Medicine*, *DC Dutta's Textbook of Obstetrics*, relevant WHO/national guideline summaries). Each item's `source` field is a short citation string; Code Red debriefs and Case Files outros surface it on screen (FR-CNT-1, FR-69). Exact edition/citation per item is filled in as each item is written (open item in section 11).

### 5.5 Minimum content volume for launch (v1 Must tier)

| Pack | Minimum for launch |
|---|---|
| Guess the Diagnosis decks | 2 packs × 24 cards = 48 cards |
| Triage Dial spectrums | 1 pack × 24 spectrums (enough for 3 full games) |
| Wordle Daily (General + OB-GYN) | 60 words (about two months' runway) |
| Wordle Duel (Inside-Jokes) | 10 words |

Code Red and Case Files volumes follow their own v1.5/v2 targets in sections 3.4 and 3.5 (3 scenarios, 8 cases).

### 5.6 Review workflow

Flagging (S23) writes a row to `peer_review_flags` with the content type, the item's id, what's wrong, and a suggested fix. The inbox (S24, "The Attending's Office") lists flags by status — open, fixed, rejected. Surya edits the source JSON, flips `reviewed: true` where appropriate, and marks the flag fixed. There's no SLA; open-flag count simply badges the Settings/review entry point.

### 5.7 Tagging taxonomy

`specialty` ∈ {General, OB-GYN, Pediatrics, Cardiology, Pharmacology, Anatomy}. `difficultyTier` ∈ {1 easy, 2 medium, 3 hard}. Packs can mix specialties freely, but the Daily Wordle rotation is weighted toward OB-GYN content to match the project's stated tilt (section 0.1).

---

## 6. Art and asset plan, prompts, and audio plan

### 6.1 Style guide recap

One locked virtual pixel size across every asset. A single soft light source, top-left. 1px dark-ink outlines on characters. No anti-aliasing outside the locked palette — every generated asset is quantized back onto it before it ships (6.5).

### 6.2 Full palette

| Name | Hex | Role |
|---|---|---|
| Lilac mist | `DEC9E9` | Backgrounds, daytime cards |
| Soft lilac | `DAC3E8` | Backgrounds |
| Pale violet | `D2B7E5` | Backgrounds |
| White | `FFFFFF` | Backgrounds, text on dark |
| Lavender | `C19EE0` | Secondary surfaces |
| Orchid | `B185DB` | Tiles, hover states |
| Amethyst | `A06CD5` | Mid-tones, clothing |
| Deep amethyst | `9163CB` | Mid-tones, glow |
| Violet | `815AC0` | Buttons, headers |
| Deep violet | `7251B5` | Buttons, active states |
| Night violet | `6247AA` | Night scenes, Code Red, deep UI |
| Ink | `14101F` | Text, outlines |
| Mint | `8FE3B0` | Correct / success |
| Butter | `FFE08A` | Present / warning |
| Coral | `FF7A7A` | Danger / wrong |

### 6.3 Asset inventory

- **Characters** (portrait + overworld sprite + a shared expression set — neutral, happy, smug, sad, excited, shout): Surya ("You"), Lakshmi ("Her"), Gyna (mascot, a barn owl), the Ward Dog, the Professor, the Grumpy Consultant, the Nurse Who Knows Everything, 3–4 recurring patients.
- **Backgrounds**: Lounge (day/dusk/night lighting variants of one base scene), Guess-the-Diagnosis board backdrop, Triage Dial backdrop, Wordle backdrop, Code Red Bedside and Protocol backdrops (night-tinted), Case Files corkboard backdrop, the Staff Entrance gate, the credits screen.
- **UI chrome**: built in code, not generated (D13) — buttons, panels, the dialogue box, nav icons.
- **Key art**: one hero image for the intro scene, one for the finale/photo reveal.
- **Stickers**: 20 small icons, one per the section 2.6 list.
- **Garden**: 3–4 growth stages across enough plant species (with recolors) to fill all 12 slots.

### 6.4 Prompt template

```
[SUBJECT], cozy pixel art, [N]x[N] pixel grid, locked palette ([hex list]),
single soft top-left light source, 1px dark-ink outline, no anti-aliasing,
[POSE/EXPRESSION], [BACKGROUND or transparent background], chibi proportions,
Stardew-Valley-adjacent cozy style
Negative: photorealistic, painterly shading, colors outside the palette, blurry, text, watermark
```

Examples:

- *Character portrait* — "Lakshmi, cozy pixel art, 64x64 pixel grid, locked violet palette (#DEC9E9,#C19EE0,#A06CD5,#815AC0,#6247AA,#14101F,#FFFFFF), single soft top-left light source, 1px dark-ink outline, smug half-smile expression, transparent background, chibi proportions, medical student in scrubs with a stethoscope."
- *Lounge background, dusk* — "cozy hospital staff lounge interior, pixel art background, 480x270 canvas, locked violet palette, dusk lighting through a window, sofa, corkboard, whiteboard, desk lamp, small garden corner, warm and inviting, no characters, no text."
- *Sticker icon* — "small pixel art icon sticker, 32x32 grid, a stork carrying a swaddled baby, locked violet palette plus mint accent, thick dark outline, flat cozy pixel style, transparent background."

### 6.5 Post-processing pipeline

A small script (`scripts/clean-art.*`) resizes every generated asset to its intended integer pixel grid with nearest-neighbor scaling, snaps every pixel to the nearest locked-palette color, strips stray anti-aliased edge pixels, and exports a cropped PNG — run on every asset before it's committed, so consistency doesn't depend on getting a perfect prompt result every time.

### 6.6 Audio plan

Loops and SFX ship as OGG with an MP3 fallback. Loops are authored with tested, seamless loop points. SFX are made with a free in-browser tool such as jsfxr, short (under 1 second) and normalized. An `AUDIO_CREDITS.md` tracks the source and license of every third-party or CC0 file, even though the site is never public.

### 6.7 Asset budget vs. performance

Total art budget is about 15 MB (NFR), with each scene's art capped at 1.5 MB and lazy-loaded per route. Stickers and UI chrome are cheap and can load eagerly; Code Red and Case Files backgrounds (v1.5/v2) load only on first visit to those routes.

---

## 7. Delivery plan: milestones, backlog, estimates, cut lines

### 7.1 Milestones

| Milestone | Contents |
|---|---|
| M0 Foundations | Repo, Supabase project + schema, Cloudflare Worker skeleton, Vercel project, auth gate, design tokens/palette, pixel-scale stage helper |
| M1 Core loop | Lounge shell, persistent nav, rooms layer (create/join/ready/reconnect), one game working end-to-end (Triage Dial — simplest state machine) |
| M2 Must-tier games | Guess the Diagnosis, Medical Wordle (daily, race, duel) |
| M3 Story and progression | Scene player, Ink integration, intro + tutorial scenes, XP/ranks, avatar setup, first sticker subset, shared streak |
| M4 Peer Review, settings, polish | Flag form/inbox, settings screen, accessibility pass, PWA install |
| M5 (v1.5) | Code Red (3 scenarios), stats/scoreboard, more stickers, cast portraits |
| M6 (v2) | Case Files (8 cases), bond gallery/photo reveal, garden, cast codex |

### 7.2 Backlog by epic

| Epic | Representative tasks | Size |
|---|---|---|
| Infra and auth | Repo, Supabase schema + RLS, Worker deploy, Vercel deploy, gate screen | S |
| Rooms layer | Create/join, ready/countdown, reconnect, reaction bar, results shell | M |
| Triage Dial | Engine + UI | S |
| Guess the Diagnosis | Engine + UI | M |
| Medical Wordle | Engine + UI, 3 modes | M |
| Scene player + Ink pipeline | Player, tag parsing, compile step | M |
| Avatars | Setup screen, sync | S |
| Meta systems | XP, ranks, streak, garden, stickers, scoreboard | M |
| Peer Review | Flag form, inbox | S |
| Settings / accessibility | All of section 2.8 | S |
| v1 content | 48 Dx cards, 24 spectrums, 70 Wordle words | M (authoring time) |
| v1 art | 2 leads (full expression set), 3 supporting cast, Lounge ×3 lighting, 4 game backdrops, 20 stickers, UI icon set | L |
| Code Red | Engine + UI + 3 scenarios | L (v1.5) |
| Case Files | Engine + UI + 8 cases + bond gallery | L (v2) |

### 7.3 Estimates

Figures are focused dev-days, per the part-time, alongside-a-full-time-job pace assumed in section 1.11.

| Milestone | Estimate | Notes |
|---|---|---|
| M0 | 4–6 days | Mostly one-time setup |
| M1 | 5–7 days | The rooms layer is the riskiest infra piece |
| M2 | 10–14 days | Two full games plus three Wordle modes |
| M3 | 6–8 days | Scene player plus every meta system |
| M4 | 3–4 days | |
| **v1 total** | **28–39 days** | At roughly one focused day every 2–3 calendar days, about 2–3 months |
| M5 (v1.5) | 10–14 days | Code Red is the most mechanically complex single game |
| M6 (v2) | 14–18 days | Case Files plus bond gallery plus garden |

Art and content authoring run in parallel with code, not fully additive to the above — budget separate calendar time for them.

### 7.4 The cut line

If the birthday date (section 11, item 1) arrives before v1 is fully done, ship whatever subset of the **Must** tier is complete and playable, in this fixed order: (1) gate and login, (2) Lounge shell with the plain nav fallback, (3) one complete live game — Triage Dial first, as the simplest, (4) a second complete live game, (5) Wordle Daily only (Race/Duel can follow), (6) avatar setup, (7) Peer Review, (8) XP/streak/stickers. **Never** cut a Must item to make room for a Should or Could item. Anything not finished simply slips to a post-launch update, framed in-story as "new wings of the hospital" rather than announced as a missed deadline.

### 7.5 Sequencing and dependencies

The rooms layer (M1) blocks every live game and must land first. The scene player (M3) blocks the intro cutscene and tutorials, but not the games themselves, since tutorials are skippable (FR-STO-2). The content validation pipeline (4.9) should exist before bulk content authoring starts, so mistakes are caught item-by-item instead of in one painful pass at the end.

---

## 8. Testing and QA plan

### 8.1 Unit tests

Every game's reducer (`packages/shared/src/games/*`) gets tests for normal play, every win/lose condition, every lifeline/hint, and rejection of illegal actions (acting out of turn, acting on a finished game).

### 8.2 Integration tests

Against a local `partyserver` dev instance: create → join → ready → countdown → first action → disconnect → reconnect within the window → disconnect past the window → room ends. Run this sequence for every game's action set, not just one.

### 8.3 Content validation tests (CI)

Schema shape for every pack, ID uniqueness, Wordle dictionary validity with no repeats inside 365 days, Case Files cross-reference (every evidence card resolves to exactly one grid answer), Code Red correct-sequence consistency with its declared order options.

### 8.4 Manual QA matrix

Every Must-tier game tested across: phone+phone (both on mobile data), phone+laptop, two tabs on one laptop as a fallback check, each browser from the compatibility NFR (latest Chrome/Edge, Android Chrome, iOS Safari), portrait and landscape, with at least one forced reconnect per game (toggle airplane mode mid-game) and one intentional idle-timeout per turn-based game.

### 8.5 Playtesting plan

Surya dry-runs every game solo first, exercising both roles across two browser profiles, before any two-player test. Any genuinely two-player live test done before the reveal uses throwaway or dummy content — never the real OB-GYN packs or story — so nothing is spoiled; a friend can stand in as the second player on a non-Lakshmi test account if a live partner is needed. After the reveal, real playtesting is simply playing it together.

### 8.6 Acceptance checklist

Before calling v1 done, every row of the section 1.7 success-criteria table needs a concrete pass: load time measured on an actual mid-range Android phone over 4G, a real forced-reconnect test recovering within 2 minutes, zero data loss across at least 10 consecutive two-player sessions, and the Peer Review flag tested end-to-end (submit → appears in the inbox → marked fixed).

---

## 9. Risks and mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Medical content inaccuracy (builder isn't a clinician) | Medium | High | Every item sourced with a `reviewed` flag; live, in-product Peer Review flagging; nothing is "final" until she's played it |
| R2 | Scope too large for the timeline | High | High | Strict Must/Should/Could tiers (1.8) and a precise cut line (7.4); build in priority order |
| R3 | Art inconsistency across many generated assets | Medium | Medium | Locked palette, locked pixel grid, one prompt template (6.4), a cleanup/quantize script (6.5) |
| R4 | Free-tier surprises (Supabase pause, Cloudflare quotas) | Low | Medium | Limits documented with headroom (4.12), re-checked just before launch |
| R5 | Keeping it secret while testing | Medium | High (spoils the gift) | Dummy content for solo/dry-run testing; real content only on throwaway accounts, never near Lakshmi's devices |
| R6 | Realtime desync or lost state on reconnect | Medium | High | Server-authoritative engines (D9), per-recipient redacted state, reconnect-window integration tests (8.2) |
| R7 | Content volume underestimated | Medium | Low | Minimum volume targets per pack (5.5), with room to add packs post-launch without a code change |
| R8 | Builder's full-time job limits available time | High | Medium | Dev-day estimates assume part-time pace (7.3); the cut line (7.4) exists precisely because this risk is likely to bite |
| R9 | Lakshmi's exam schedule limits her play/review time | Medium | Low | The streak is forgiving and never harms the garden (2.6); Peer Review has no SLA |

---

## 10. Launch plan and the surprise

### 10.1 Backward schedule from the birthday date

Fill in `[BIRTHDAY DATE]` (section 11, item 1), then work backward: v1 feature-complete one week before launch → 3–4 days running the manual QA matrix (8.4) and acceptance checklist (8.6) → 2 days of buffer for last-minute art/content fixes → launch day. If v1.5/v2 content isn't ready by the date, it ships later as an in-story "update," which doubles as a second surprise rather than reading as a missed deadline.

### 10.2 The reveal

On the day, send Lakshmi the gate link with no other context — she taps her character and enters, no passcode to share. The intro scene (S02) carries the birthday message and introduces the premise, so the product explains itself.

### 10.3 Reviewing content without spoiling it

Avoid giving Lakshmi the real story or art to review before launch. Where her medical input is wanted early, ask "blind" factual questions (e.g. "is X a correct sign of Y condition") without revealing they're headed into a surprise game for her. Everything else is reviewed live, after launch, through the in-product Peer Review flag (FR-100) — which exists specifically so a spoiler-risky pre-launch review pass isn't required.

### 10.4 Keeping it secret during build and testing

Develop in a private repository. Never run a live two-player test using Lakshmi's real account or a device she might see. Use dummy or placeholder content for anything tested where she could glimpse a screen or a notification. Don't discuss specific game content with her before the reveal, even in general terms.

### 10.5 Day-of mechanics

First run is gate → intro scene → avatar setup → Lounge. Have a game ready to actually play together on that same call — Triage Dial is the easiest icebreaker — so the reveal becomes a first session, not just a demo.

---

## 11. Open questions and fill-in list

| # | Open item | Where it's used | Needs |
|---|---|---|---|
| 1 | Actual birthday/launch date | Section 1 header, 10.1 | Fill in; everything else plans backward from it |
| 2 | ~~Final working title~~ — named **Dr. Chandra's Waiting Room** | Throughout | Done |
| 3 | ~~Mascot species~~ — named **Gyna**, a barn owl (pronounced "Gina," an OB-GYN pun); final art pending | 2.5, 6.3 | Prompt drafted, art not yet generated |
| 4 | Cast final names/looks (Professor, Grumpy Consultant, Nurse Who Knows Everything, patients) | 2.5 | Currently placeholders; role-names are fine if preferred |
| 5 | Lakshmi's device constraints (phone model/OS, typical browser) | 1.5, compatibility NFR | Confirms how much iOS Safari testing weight is needed |
| 6 | Lakshmi's exam schedule / likely play windows | 1.5, R9 | Informs whether a "game night" nudge (FR-HUB-7/8) is worth building |
| 7 | ~~The passcode itself~~ — removed; sign-in is character-picker-only now (FR-02) | S01 | Still need the real per-character email/password filled into `apps/web/src/lib/characters.ts` once the Supabase accounts exist |
| 8 | Custom domain, yes or no | 0.3, 1.12 | The only optional spend in the whole project |
| 9 | Exact medical citations per content item | 5.4 | Fill in as each card/word/case/scenario is authored |
| 10 | In-jokes for dialogue and the Duel word pack | 2.5 sample scenes, 3.3 (FR-56) | This is where the "feel personal" goal (G1) actually lives |
| 11 | Exact XP/rank/sticker numbers (drafted in 2.6) | 2.6 | Fine to ship as-is; tune after a few real sessions if pacing feels off |
| 12 | Final choice of the 3 Code Red scenarios and 8 Case Files subjects | 3.4, 3.5 | Current picks (PPH, eclampsia, shoulder dystocia) are reasonable OB-GYN defaults — confirm or swap |

---

## 12. Appendices

### 12.1 Glossary

- **The Lounge** — the pixel-art hub screen (S04).
- **Gyna** — the mascot/narrator character, a barn owl (pronounced "Gina").
- **The Attending's Office** — the Peer Review inbox (S24).
- **Bond rank** — the shared relationship-progress meter that unlocks memory scenes (2.6).
- **IST day** — the calendar date in India Standard Time used for the daily rollover (D11).
- **Durable Object (DO)** — the Cloudflare primitive backing one live room.
- **Engine** — the pure function implementing one game's rules (4.7).

### 12.2 Environment variables

| Variable | Used in | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | apps/web | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | apps/web | Supabase anon key (safe client-side; RLS enforces access) |
| `SUPABASE_SERVICE_ROLE_KEY` | CI / seed scripts only | Seeding the two accounts, running migrations — never shipped to a client |
| `SUPABASE_URL` | apps/rooms | Builds the JWKS URL used to verify session tokens on WebSocket connect (not a secret - plain `[vars]`, same URL already ships client-side as `VITE_SUPABASE_URL`). Supabase migrated to per-project asymmetric signing keys; a shared `SUPABASE_JWT_SECRET` turned out not to work for real session tokens (only the static `anon`/`service_role` API keys), confirmed by testing directly against the real project |
| `CF_API_TOKEN` | CI | Deploying the rooms Worker via `wrangler` |
| `ALLOWED_ORIGIN` | apps/rooms | Origin allowlist for WebSocket connections |

### 12.3 Message catalog

See section 4.6 for the shared `RoomMessage` envelope. Per-game `payload` shapes live beside each engine in `packages/shared/src/games/<game>/types.ts` rather than being duplicated here, so the document can't drift from the code.

### 12.4 Checklists

**Pre-launch:** env vars set on Vercel/Cloudflare/Supabase → RLS policies verified → content validation green in CI → acceptance checklist (8.6) passed → free-tier limits re-checked (4.12) → backward schedule (10.1) on track → the two real accounts' credentials filled into `characters.ts` and not yet shared.

**Per content item:** has a source → `reviewed` is false until she's played it → passes schema validation → tagged with specialty and difficulty.

**Per art asset:** on the locked palette → correct pixel grid → run through the cleanup/quantize script → under its file-size budget (6.7) → named and placed per the asset inventory (6.3).

### 12.5 Backward-planning schedule

See section 10.1 for the schedule worked backward from the birthday/launch date through feature-complete and QA.