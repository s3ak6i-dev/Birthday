# Audio credits

Tracks the source and license of every audio file in `apps/web/public/sfx/`
and `apps/web/public/music/`, per masterdoc.md section 2.7/940 — kept even
though this site is never public, since it's the only record of where
each file actually came from.

## User-supplied

| File | Source | License |
|---|---|---|
| `sfx/click.ogg` / `click.mp3` | Supplied directly by Surya as `matthewvakaliuk73627-mouse-click-290204.mp3` — the filename pattern (`<username><id>-<title>-<numeric-id>`) matches Pixabay's download-file naming, so this is very likely a Pixabay Content License track by contributor "matthewvakaliuk73627," but that's inferred from the filename, not confirmed against the actual Pixabay page — **worth double-checking the real listing before this ships anywhere outside this private project.** Replaced the Kenney `click_001.ogg` used before 2026-10-13; re-encoded here to OGG (libvorbis) + MP3 (libmp3lame) from the supplied MP3, same as every other pair in this file. |
| `sfx/dog-tap.ogg` / `dog-tap.mp3` | Supplied directly by Surya as `yodguard-friendly-small-dog-bark-1-535470.mp3` — same Pixabay-style filename pattern as the click above (contributor "yodguard"), same caveat: inferred, not confirmed against the real listing. Asked to be trimmed to 2 seconds of a stated 3-second source, but the actual file is only ~1.03s (checked with `ffprobe` and `ffmpeg`'s own stream read, both agree) - used in full, nothing trimmed, since there was nothing past 1.03s to cut. Replaced the Kenney `pluck_002.ogg` used before 2026-10-13. |
| `music/midnight.ogg` / `midnight.mp3` | Supplied directly by Surya as `Midnight.mp3`, one track from a local folder named "Lo-Fi Soundtrack Pack" (17 tracks total, this one chosen for the Lounge's background loop). **No license file or readme shipped with the pack** - source/license genuinely unknown, not even inferable the way the Pixabay-pattern filenames above are. Fine for this private, never-public project; flagging clearly so it doesn't get treated as cleared for anything beyond that without checking back with wherever the pack actually came from. Re-encoded from the original ~90s MP3 to OGG (libvorbis) + MP3 (libmp3lame), same pairing as everything else here. |
| `sfx/gyna-squawk.ogg` / `gyna-squawk.mp3` | Supplied directly by Surya as `loswin23-bird-chirps-568010.mp3` (~18.4s), same Pixabay-style filename pattern as the two rows above (contributor "loswin23"), same inferred-not-confirmed caveat. Asked to use "the first few seconds" - `ffmpeg silencedetect` on that opening window found one cleanly isolated ~160ms chirp burst at ~0.55s in, trimmed to that (fade in/out + loudness-normalized), rather than keeping several full seconds, since this plays once per dialogue line (`DialogueScene`'s `squawkKey` prop) and needs to read as one quick accent, not an overlapping multi-chirp clip. **Replaces** the previous OpenGameArt-sourced version of this file (trimmed from syncopika's CC0 "Bird Chirping Sounds") - that source is no longer used by anything in this project. |
| `sfx/gyna-type.ogg` / `gyna-type.mp3` | Supplied directly by Surya as `u_a4gfvwagf1-typing-sound-effect-336781.mp3` (~18.9s, real mechanical-typewriter clacking), same Pixabay-style filename pattern as the rows above, same inferred-not-confirmed caveat. Trimmed to a ~3.4s continuous passage (2.43s-5.82s of the source) rather than one isolated clack, since this is meant to loop for as long as a dialogue line is actively typewriter-revealing (`DialogueScene`'s new `typeKey` prop, `packages/ui/src/sfx.ts`'s new `playLoopingSound`) rather than fire once; `ffmpeg silencedetect` picked the start (where the clacking actually begins) and a ~116ms quiet gap near the end as the loop-seam cut points to minimize an audible click at the wrap, same fade+loudnorm treatment as every other trim in this file. |
| `sfx/heart-monitor.ogg` / `heart-monitor.mp3` | Supplied directly by Surya as `freesound_community-steadyheartratemonitorloop1min-6274.mp3` (~61s). Unlike the Pixabay-pattern filenames above, the short numeric suffix (`6274`) and `freesound_community` name read as a genuine Freesound.org sound id/uploader rather than a Pixabay download - likely CC0 given Freesound's "Freesound Community" catalog skews that way, but **this is inferred from the filename alone, not confirmed against the real freesound.org listing** - same "don't treat as cleared beyond this private project" caveat as every other unconfirmed row here. Used in full (no trim - it's already an authored loop, source duration kept as-is), re-encoded to OGG (libvorbis)/MP3 (libmp3lame) from the supplied MP3. Code Red's `CodeRedRoomBoard.tsx` plays this on loop (`playLoopingSound`) for the duration of the scenario's "live" phase - an ambient background bed, not a discrete per-event blip the way every other row in this file is. |

## Kenney.nl (CC0)

Every sound below is from **Kenney.nl** game-audio packs, licensed
**CC0 (public domain)** — no attribution required, but credited here
anyway as good practice. Downloaded 2026-10-13.

| File | Source pack | Original filename |
|---|---|---|
| `back.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `back_001.ogg` |
| `toggle.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `toggle_001.ogg` |
| `error.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `error_001.ogg` |
| `confirm.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `confirmation_001.ogg` |
| `countdown-tick.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `tick_001.ogg` |
| `reaction-pop.ogg` | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | `pluck_001.ogg` |
| `card-select.ogg` | [Casino Audio](https://kenney.nl/assets/casino-audio) | `card-slide-2.ogg` |
| `tile-flip.ogg` | [Casino Audio](https://kenney.nl/assets/casino-audio) | `card-slide-4.ogg` |
| `lifeline.ogg` | [Digital Audio](https://kenney.nl/assets/category:Audio) | `powerUp3.ogg` |
| `reveal.ogg` | [Digital Audio](https://kenney.nl/assets/category:Audio) | `phaseJump2.ogg` |
| `key-tap.ogg` | [Digital Audio](https://kenney.nl/assets/category:Audio) | `pepSound2.ogg` |
| `correct-letter.ogg` | [Digital Audio](https://kenney.nl/assets/category:Audio) | `powerUp1.ogg` |
| `countdown-go.ogg` | [Digital Audio](https://kenney.nl/assets/category:Audio) | `powerUp5.ogg` |
| `win-fanfare.ogg` | [Music Jingles](https://kenney.nl/assets/music-jingles) | `8-Bit jingles/jingles_NES05.ogg` |
| `bullseye.ogg` | [Music Jingles](https://kenney.nl/assets/music-jingles) | `8-Bit jingles/jingles_NES08.ogg` |
| `sticker-unlock.ogg` | [Music Jingles](https://kenney.nl/assets/music-jingles) | `8-Bit jingles/jingles_NES12.ogg` |
| `lose-stinger.ogg` | [Music Jingles](https://kenney.nl/assets/music-jingles) | `Hit jingles/jingles_HIT03.ogg` |
| `lock-in.ogg` | [RPG Audio](https://kenney.nl/assets/rpg-audio) | `metalClick.ogg` |

Each `.ogg` has a matching `.mp3` transcoded locally with ffmpeg
(`libmp3lame`, VBR quality 4) as the engine's fallback source — same
masterdoc-specified OGG-primary/MP3-fallback pairing used throughout.

## Still open (not sourced yet)

- **More music variety** — the Lounge/background loop is covered now
  (`music/midnight.ogg`), but masterdoc's fuller music list (a day-vs-
  night Lounge variant, a soft piano loop specifically for story/dialogue
  scenes, a tense loop for Code Red) isn't - the same user's Lo-Fi
  Soundtrack Pack this came from has 16 other tracks that could cover
  some of these (Cozy, Night, Zen are plausible fits), or the earlier CC0
  online shortlist is still a real option: Erokia's Piano Ambiance 4
  (Freesound, CC0), Duckhive's CC0 Game Music Vol. 1, Tallbeard Studios'
  FREE Music Loop Bundle (CC0, has an in-browser preview tool).
- **ECG/heart-monitor beep** (masterdoc's SFX list names this explicitly)
  — two real CC0 candidates found on Freesound (samfk360's "Heart Monitor
  Beep", guitarguy1985's "ekg.wav") but Freesound downloads need an
  authenticated account, and Triage Dial's current UI doesn't actually
  have a vitals-monitor display this would attach to yet - deferred.
- **Code Red alarm** — Code Red itself isn't built yet (TODO.md M5); no
  alarm sourced since there's nothing to wire it to.
