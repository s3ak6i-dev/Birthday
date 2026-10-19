// Storage for the FR-110 settings that don't have a system behind them
// yet: text size, dialogue speed, colorblind shape cues, and haptics.
// Sound, music, and reduced motion are the opposite case - those already
// have real plumbing elsewhere (@ward-games/ui's sfx.ts/music.ts/motion.ts)
// and Settings.tsx reads/writes those directly instead of through here.
//
// These four save a real value and that's it for now - nothing in the
// scene player, games, or anywhere else actually reads them yet. Wiring
// each one through is its own follow-up (see TODO.md): text size and
// dialogue speed need the scene player and every game's text to read a
// shared CSS custom property / context; colorblind cues need Wordle's
// Tile component to grow a shape/symbol layer; haptics needs a
// `navigator.vibrate` call threaded into the tap handlers that should
// trigger it. Building the Settings UI for all four now, ahead of that
// wiring, is a deliberate choice (not an oversight) - see the
// conversation this shipped from for the actual scoping decision.
export type TextSize = "S" | "M" | "L";
export type DialogueSpeed = "slow" | "normal" | "fast" | "instant";

const TEXT_SIZE_KEY = "ward-games:text-size";
const DIALOGUE_SPEED_KEY = "ward-games:dialogue-speed";
const COLORBLIND_CUES_KEY = "ward-games:colorblind-cues";
const HAPTICS_KEY = "ward-games:haptics";

function readString<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return (allowed as readonly string[]).includes(stored ?? "") ? (stored as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked - the setting just won't persist across reloads
  }
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "1";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // storage blocked - the setting just won't persist across reloads
  }
}

export function getTextSize(): TextSize {
  return readString(TEXT_SIZE_KEY, ["S", "M", "L"], "M");
}
export function setTextSize(value: TextSize): void {
  writeString(TEXT_SIZE_KEY, value);
}

export function getDialogueSpeed(): DialogueSpeed {
  return readString(DIALOGUE_SPEED_KEY, ["slow", "normal", "fast", "instant"], "normal");
}
export function setDialogueSpeed(value: DialogueSpeed): void {
  writeString(DIALOGUE_SPEED_KEY, value);
}

// Defaults to on - matches section 2.8's "Wordle tiles always carry a
// shape or symbol" baseline; this setting is really "let me turn the
// extra symbols off" once something actually reads it, not "opt in."
export function getColorblindCues(): boolean {
  return readBool(COLORBLIND_CUES_KEY, true);
}
export function setColorblindCues(value: boolean): void {
  writeBool(COLORBLIND_CUES_KEY, value);
}

export function getHaptics(): boolean {
  return readBool(HAPTICS_KEY, true);
}
export function setHaptics(value: boolean): void {
  writeBool(HAPTICS_KEY, value);
}
