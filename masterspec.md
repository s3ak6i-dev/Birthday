# Ward Games: Master Specification

**PRD · Experience Design · Game Design · Narrative · Content · Art and Prompts · TRD · Delivery Plan**

| | |
|---|---|
| Working title | Ward Games (final name TBD) |
| Version | 1.0 (11 October 2026) |
| Owner | Surya |
| Audience | A birthday gift for Lakshmi (MBBS student, aiming for OB-GYN) |
| Status | Design locked, ready to build |

> **Superseded.** `masterdoc.md` is the newer, authoritative revision of this
> document (its decision log explicitly replaces this draft's anonymous-auth
> and Supabase-Realtime choices - see masterdoc.md D7/D8). Kept here only for
> its section 2 research/inspiration summary, which masterdoc.md doesn't
> restate. Build against `masterdoc.md`.

---

## 0. How to use this document

This is the single source of truth for the project. It is written so that you (or an AI coding assistant) can build from it section by section.

- **Part A (sections 1 to 3):** what we are building and why (product overview, research, PRD).
- **Part B (sections 4 to 6):** how it looks, plays, and sounds (screens, design system, five games, narrative).
- **Part C (sections 7 and 8):** content and art (schemas, workflow, asset lists, prompts).
- **Part D (section 9):** the technical requirements (architecture, protocol, database, deployment).
- **Part E (sections 10 to 13):** delivery plan, risks, open decisions, appendices.

Priority tags used throughout: **[MUST]** needed for launch, **[SHOULD]** strongly wanted, **[COULD]** nice to have, **[LATER]** after launch.

### 0.1 Decisions locked

| Area | Decision |
|---|---|
| Platform | Web app, mobile-first, installable as a PWA. No game engine. |
| Players | Exactly two (Surya and Lakshmi), long distance, both on IST. |
| Games | Five: Guess the Diagnosis, Triage Dial, Medical Wordle, Code Red, Case Files. |
| Art | Cozy pixel art, violet palette plus black and white. |
| Story layer | Visual-novel dialogue (portrait, dialogue box, date and time tag) with a recurring cast. |
| Avatars | Avatar setup is in: players customize clothing and accessories on fixed likenesses. |
| Frontend | React, TypeScript, Vite. |
| Database | Supabase (Postgres, anonymous auth, row-level security). |
| Realtime | PartyKit-style server-run rooms using `partyserver` on Cloudflare Workers and Durable Objects (free plan). |
| Hosting | Vercel (frontend), Cloudflare (rooms), Supabase (database). Target cost: zero. |
| Image generation | Done by Surya with his own image model, using the prompts in this document. |

---

# PART A: PRODUCT

## 1. Product overview

### 1.1 Vision

A cozy pixel-art hospital break room where two people who are far apart play doctor-themed games together, with a little story, a lot of in-jokes, and a few OB-GYN-focused challenges. It is a birthday gift, built to be played for months.

### 1.2 Audience

| Person | Role | What matters |
|---|---|---|
| Lakshmi | Primary player. MBBS student, wants to specialise in OB-GYN. The medical expert. | Fun, not homework. Correct medicine. Works on her phone. Feels personal. |
| Surya | Builder and second player. Engineer, not a clinician. | Easy to build and maintain, free to host, reliable realtime, content he can trust because she reviews it. |

### 1.3 Goals

1. **Delight.** It should feel handmade and personal, with their characters, in-jokes, and a surprise reveal.
2. **A shared ritual.** A daily puzzle, a shared streak, and game nights that give them a reason to open it together.
3. **Light learning value.** Games reinforce clinical reasoning and OB-GYN knowledge without feeling like a quiz.
4. **Reliability.** Realtime play over mobile networks without desyncs, with graceful reconnects.
5. **Zero running cost** on free tiers.

### 1.4 Non-goals

- A public product, monetization, marketing, or accounts for anyone else.
- Anti-cheat or competitive ranking beyond the couple's own scoreboard.
- Clinical decision support or anything presented as medical advice. This is an entertainment and learning game.
- More than two players, native mobile apps, localization beyond English.
- Replacing her actual study material.

### 1.5 Success criteria (definition of done for launch)

- She opens the link on her phone and is in a live game with him in under 30 seconds.
- Ten consecutive two-player sessions complete with no desync and no lost progress, including at least two forced reconnects each.
- All launch content is marked as reviewed by Lakshmi.
- The site loads in under 3 seconds on a typical 4G phone connection after the first visit.
- The surprise is intact: she sees nothing of it before the reveal.

### 1.6 Content disclaimer

An About screen states: *This is a game made for fun and light practice. It is not medical advice.* Code Red debriefs show a source for every teaching note.

---

## 2. Research and inspiration summary

(Researched October 2026. Sources are listed in Appendix F.)

### 2.1 Existing medical games

| Game | Format | Takeaway for us |
|---|---|---|
| Doctordle | Daily diagnosis puzzle: read a case, guess, each wrong guess reveals a clue. Shareable grid. Later added endless mode, bonus rounds, knowledge cards. | The name is taken, so we do not use it. Daily ritual plus explanations works. |
| DailyDx | Daily diagnosis game with five progressive clues. | Progressive clue reveals are a proven loop. |
| iatroX Rounds | UK-flavoured daily diagnosis game with an archive. | Archive of past puzzles is valued. |
| Disordle | Feature-matching puzzle (overlapping signs, tests, drugs, therapies), one hint per puzzle, random mode. | Feature relationships make good puzzles. |
| Connect-MD | Medical Connections: 16 tiles, four groups. | A direct model for Differentials, our post-launch add-on. |
| Meddle | Wordle with six-letter medical words and seven guesses. | Literal medical Wordle is established. We add packs, definition hints, and race mode. |
| Drugdle | Wordle-like drug-name spelling for health students. | Pharmacology pack is a good fit. |
| HeyDoctor | Interrogate an AI patient. | History-taking can be gamified (inspires Guess the Diagnosis questions). |

All of these are solo play with shareable results. We found no real-time two-player versions and no OB-GYN-specific daily games. That is our gap.

### 2.2 OB-GYN and clinical education games

- **The Labor Games:** a seven-station competition (fetal heart tracings, knot-tying, cervical dilation, amniotomy, fetal weight, blood loss). Highly rated by students.
- **Laborland:** a tabletop game whose designer deliberately avoided digital to keep students together. Inspires our "play together on a call" design.
- **Serious game for obstetric emergencies** (France): branching action tree for forceps delivery and shoulder dystocia.
- **Labor and delivery board game** for emergency residents; **heart sounds team game**; **MurmurQuiz** (audio).
- CTG practice online is mostly static quizzes. A dynamic CTG game is an opportunity (post-launch).

### 2.3 Long-distance and two-player formats

- Recommended: Codenames-style two-player co-op, Hanabi (hidden-information co-op), correspondence chess and other async games.
- Time zones can prevent live play. Not an issue for us (both IST) but asynchronous modes are still useful around her duty and exam schedules.
- **Murdle** (logic-grid mystery) has a board-game version that gives each player a different slice of the evidence. This is the template for Case Files.

### 2.4 Design inspirations

| Source | What we borrow |
|---|---|
| Wordle, Connections, Heardle | Daily ritual, shareable result, simple rules |
| Guess Who | Secret card plus yes/no questions |
| Wavelength | Dial plus clue-giver |
| Keep Talking and Nobody Explodes | Asymmetric roles, talk it through on a call |
| Murdle, Cluedo | Deduction grid, split evidence |
| Persona-style visual novels | Portrait, dialogue box, calendar tag, social-link bonds (structure only, all art is original) |
| Stardew-style cozy pixel art | Warm palette, small animated details |

---

## 3. Product requirements (PRD)

### 3.1 Personas and context of use

- **Lakshmi, on her phone**, in a hostel or at home, between lectures or in the evening, on mobile data or Wi-Fi, possibly with a call running in the background.
- **Surya, on laptop or phone**, also on a call. Receives Peer Review flags and fixes content.
- **Typical session:** 15 to 40 minutes, 2 to 4 games, on a voice or video call.
- **Daily solo touch:** 3 to 6 minutes for the daily puzzle.

### 3.2 Core user journeys

1. **First visit.** Open link, enter passcode, watch the intro scene, set up avatar, land in the Lounge.
2. **Daily puzzle.** Open the Lounge, tap the desk, solve Medical Wordle, see the other person's result and the shared streak.
3. **Game night.** One taps a game, a room code appears, the other joins, both ready up, play three rounds, see results, rematch or choose another game.
4. **Story progress.** Finish a Case Files case, unlock a memory fragment and a scene, see the Polaroid develop.
5. **Content correction.** Lakshmi notices a wrong fact, taps the flag, writes the fix. Surya sees it in the review inbox and corrects it.

### 3.3 Functional requirements

IDs are stable so tasks and tests can reference them.

**Entry and identity**

| ID | Requirement | Pri |
|---|---|---|
| FR-ENT-1 | Passcode gate before any content loads. | MUST |
| FR-ENT-2 | Device identity via anonymous auth; both devices join the same couple using a join code (set up in advance by Surya). | MUST |
| FR-ENT-3 | One-time intro cutscene, skippable on replay. | SHOULD |
| FR-ENT-4 | Avatar setup (see FR-AVA). | MUST |
| FR-ENT-5 | Optional email magic link to move devices without losing progress. | LATER |

**Hub (Staff Lounge)**

| ID | Requirement | Pri |
|---|---|---|
| FR-HUB-1 | Illustrated Lounge with tappable objects leading to each game. | MUST |
| FR-HUB-2 | Persistent bottom navigation (Home, Games, Album, Stats, Settings) as a plain fallback to the illustrated hub. | MUST |
| FR-HUB-3 | Presence: show whether the other person is online and what they are doing. | MUST |
| FR-HUB-4 | Daily puzzle status for both players, countdown to next word, shared streak. | MUST |
| FR-HUB-5 | Window shows day, dusk, or night according to IST. | SHOULD |
| FR-HUB-6 | Clinic garden grows when both complete the daily puzzle. | SHOULD |
| FR-HUB-7 | "Come play" nudge that pings the other person's open tab. | SHOULD |
| FR-HUB-8 | Game night banner (a recurring suggested time, editable). | COULD |

**Avatars (FR-AVA)**

| ID | Requirement | Pri |
|---|---|---|
| FR-AVA-1 | Each player's character (their likeness) is fixed: hair, skin, face. | MUST |
| FR-AVA-2 | Customize scrubs color (6 swatches), coat on/off, stethoscope color, glasses, headphones, hair accessory, backpack charm, name tag. | MUST |
| FR-AVA-3 | Live preview of sprite and portrait. | MUST |
| FR-AVA-4 | New accessories unlock with ranks and stickers. | SHOULD |
| FR-AVA-5 | Avatar choices sync to the partner's screen. | MUST |

**Rooms and multiplayer (shared by all live games)**

| ID | Requirement | Pri |
|---|---|---|
| FR-ROOM-1 | Create room, generate a 4-letter code and share link; the other player joins by link or code. | MUST |
| FR-ROOM-2 | Waiting room with ready toggles, pack and difficulty selection, and mascot tips. | MUST |
| FR-ROOM-3 | Reconnect within 120 seconds restores state; the game pauses while someone is away. | MUST |
| FR-ROOM-4 | Reaction bar (6 emojis) visible to both players. | MUST |
| FR-ROOM-5 | Instant rematch and back-to-Lounge from results. | MUST |
| FR-ROOM-6 | Optional quick-phrase radio as a fallback if voice drops (Code Red). | COULD |

**Games**

| ID | Requirement | Pri |
|---|---|---|
| FR-GTD | Guess the Diagnosis as specified in section 5.2. | MUST |
| FR-TRI | Triage Dial as specified in section 5.3. | MUST |
| FR-WRD | Medical Wordle (daily, race, duel) as specified in section 5.4. | MUST |
| FR-RED | Code Red as specified in section 5.5. | SHOULD (v1.5) |
| FR-CAS | Case Files as specified in section 5.6. | SHOULD (v2) |
| FR-DIF | Differentials (Connections-style sorter). | LATER |

**Progression and collection**

| ID | Requirement | Pri |
|---|---|---|
| FR-PRG-1 | XP, ranks (Intern to Professor), idempotent awards. | MUST |
| FR-PRG-2 | 20 stickers with unlock rules and an album. | SHOULD |
| FR-PRG-3 | Doctor vs Engineer scoreboard across games. | SHOULD |
| FR-PRG-4 | Bond rank for the pair with unlockable memory scenes. | SHOULD |
| FR-PRG-5 | Shared daily streak. | MUST |

**Story**

| ID | Requirement | Pri |
|---|---|---|
| FR-STO-1 | Reusable visual-novel scene player (typewriter text, portraits, expressions, choices, log, skip). | MUST |
| FR-STO-2 | Tutorial scenes per game, skippable. | MUST |
| FR-STO-3 | Case Files story scenes and memory-fragment reveals. | SHOULD |
| FR-STO-4 | Daily greeting scenes by time of day. | COULD |

**Content quality**

| ID | Requirement | Pri |
|---|---|---|
| FR-CNT-1 | Every content item has a source and a reviewed flag. | MUST |
| FR-CNT-2 | Peer Review flag on every card, clue, case, and word, with an optional suggested correction. | MUST |
| FR-CNT-3 | Review inbox page listing open flags. | MUST |
| FR-CNT-4 | Build fails if content fails schema or solvability checks. | MUST |

**Settings and utility**

| ID | Requirement | Pri |
|---|---|---|
| FR-SET-1 | Sound and music volume, mute, reduce motion, text size, pixel scale, colorblind mode. | MUST |
| FR-SET-2 | How to play pages, credits, about and disclaimer. | SHOULD |
| FR-SET-3 | Friendly error, offline, connection-lost, and 404 screens. | MUST |
| FR-SET-4 | Installable PWA. | SHOULD |

### 3.4 Non-functional requirements

| Area | Requirement |
|---|---|
| Compatibility | Latest two Android Chrome versions, iOS Safari 16+, desktop Chrome, Edge, Safari, Firefox. Portrait and landscape. |
| Performance | First load under 3 s on 4G; initial JavaScript under 250 KB gzipped; art lazy-loaded per scene; each scene under 1.5 MB; total art under about 15 MB; 60 fps for UI animation on mid-range Android. |
| Network | Playable at 150 ms round-trip; reconnect handled automatically; messages throttled (needle updates at most 15 per second). |
| Accessibility | WCAG AA contrast for text; no color-only signals (shapes plus color); screen-reader labels on DOM games; keyboard operable on desktop; reduce-motion respected; adjustable text size. |
| Privacy | Only first names and avatar choices stored; no third-party analytics; no tracking cookies. |
| Reliability | State survives refresh and dropped connections; idempotent writes to the database. |
| Maintainability | Game logic in pure TypeScript shared by client and server; content in versioned JSON; strict typing; tests for reducers. |
| Cost | $0 per month on free tiers; usage monitored. |
| Security | Row-level security on every table; server verifies identity; origin checks on realtime connections; no secret keys in the client. |

### 3.5 Scope by release

| Release | Contents |
|---|---|
| **v1 (launch)** | Gate, intro scene, avatar setup, Lounge, scene player, rooms layer, Triage Dial, Guess the Diagnosis, Medical Wordle, XP and ranks, stickers (basic), settings, Peer Review. |
| **v1.5** | Code Red (three scenarios), stats and scoreboard, more stickers, bond screen basics. |
| **v2** | Case Files with memory fragments and Polaroid reveal, garden, cast codex, daily greetings. |
| **Later** | Differentials, CTG Detective, Auscultate (audio), magic-link login, archive of past dailies. |

If time is short, see the cut lines in section 10.

### 3.6 Assumptions

- Both players are in India on IST, with modern phones.
- A voice or video call runs alongside the games. No in-app voice.
- Lakshmi can spend a few hours reviewing content before launch, ideally without spoiling the surprise (see section 10.5).
- The image model can produce usable stylized pixel art that is cleaned by hand.
- Free tiers remain available at the current limits (verify before launch, see section 9.12).