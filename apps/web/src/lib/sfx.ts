// Registers every real sound file into @ward-games/ui's shared engine
// (packages/ui/src/sfx.ts) and gives each game-specific sound a typed,
// named play function instead of sprinkling raw string keys through every
// board component. Call `initSfx()` once, at app startup (main.tsx).
//
// Sourcing (masterdoc.md section 2.7/940 - CC0/properly licensed, credits
// tracked): every file here is Kenney.nl CC0 game-audio packs (Interface
// Sounds, UI Audio, Casino Audio, Digital Audio, Music Jingles, RPG
// Audio) - see AUDIO_CREDITS.md at the repo root for exactly which pack
// and file each one came from. OGG primary + MP3 fallback per masterdoc's
// own format spec (the engine tries each src in order and keeps the first
// one that actually decodes, so OGG is tried first, MP3 as the fallback).
import { registerSound, playSound } from "@ward-games/ui";

function src(key: string): string[] {
  return [`/sfx/${key}.ogg`, `/sfx/${key}.mp3`];
}

let initialized = false;

/** Idempotent - safe to call from more than one mount point (StrictMode
 * double-invoke, HMR) without double-registering. */
export function initSfx(): void {
  if (initialized) return;
  initialized = true;

  registerSound("click", src("click"), { volume: 0.5 });
  registerSound("back", src("back"), { volume: 0.5 });
  registerSound("toggle", src("toggle"), { volume: 0.5 });
  registerSound("error", src("error"), { volume: 0.6 });
  registerSound("confirm", src("confirm"), { volume: 0.6 });
  registerSound("card-select", src("card-select"), { volume: 0.5 });
  registerSound("win-fanfare", src("win-fanfare"), { volume: 0.7 });
  registerSound("lose-stinger", src("lose-stinger"), { volume: 0.6 });
  registerSound("lifeline", src("lifeline"), { volume: 0.6 });
  registerSound("lock-in", src("lock-in"), { volume: 0.5 });
  registerSound("reveal", src("reveal"), { volume: 0.6 });
  registerSound("bullseye", src("bullseye"), { volume: 0.7 });
  registerSound("key-tap", src("key-tap"), { volume: 0.4 });
  registerSound("tile-flip", src("tile-flip"), { volume: 0.5 });
  registerSound("correct-letter", src("correct-letter"), { volume: 0.6 });
  registerSound("countdown-tick", src("countdown-tick"), { volume: 0.6 });
  registerSound("countdown-go", src("countdown-go"), { volume: 0.7 });
  registerSound("reaction-pop", src("reaction-pop"), { volume: 0.6 });
  registerSound("sticker-unlock", src("sticker-unlock"), { volume: 0.7 });
  registerSound("dog-tap", src("dog-tap"), { volume: 0.5 });
  registerSound("gyna-squawk", src("gyna-squawk"), { volume: 0.45 });
  registerSound("gyna-type", src("gyna-type"), { volume: 0.35 });
}

// Global UI (PixelButton/IconButton/Hotspot already play "click"/nothing
// themselves via packages/ui - these are for the cases a plain <button> or
// an app-level event needs to opt in explicitly).
export const sfxBack = () => playSound("back");
export const sfxToggle = () => playSound("toggle");
export const sfxError = () => playSound("error");
export const sfxConfirm = () => playSound("confirm");

// Guess the Diagnosis
export const sfxCardSelect = () => playSound("card-select");
export const sfxLifeline = () => playSound("lifeline");

// Triage Dial
export const sfxLockIn = () => playSound("lock-in");
export const sfxReveal = () => playSound("reveal");
export const sfxBullseye = () => playSound("bullseye");

// Wordle
export const sfxKeyTap = () => playSound("key-tap");
export const sfxTileFlip = () => playSound("tile-flip");
export const sfxCorrectLetter = () => playSound("correct-letter");

// Shared win/lose (Guess the Diagnosis + Wordle both end a round the same way)
export const sfxWin = () => playSound("win-fanfare");
export const sfxLose = () => playSound("lose-stinger");

// Rooms/meta
export const sfxCountdownTick = () => playSound("countdown-tick");
export const sfxCountdownGo = () => playSound("countdown-go");
export const sfxReactionPop = () => playSound("reaction-pop");
export const sfxStickerUnlock = () => playSound("sticker-unlock");
export const sfxDogTap = () => playSound("dog-tap");

// Gyna's dialogue blip - passed as `squawkKey` to every `<DialogueScene>`
// she narrates (every one so far), rather than a bare string literal
// repeated at each call site.
export const GYNA_SQUAWK_KEY = "gyna-squawk";

// Gyna's typing-clack loop - passed as `typeKey` to the same
// `<DialogueScene>` call sites, plays for as long as a line is actively
// revealing.
export const GYNA_TYPE_KEY = "gyna-type";
