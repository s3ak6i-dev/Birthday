// Reduced motion (masterdoc.md section 2.8, FR-110). Three components
// each used to read `prefers-reduced-motion` straight off the OS via their
// own local `matchMedia` check (AmbientRoomLoop, AnimatedCritter,
// PlayableCharacter) - WindowLight.tsx's own header comment already
// flagged this as "before the real in-app Settings toggle exists." This
// is that toggle's backing store: a user override on top of the OS
// setting, so "Reduced motion: On" works even for someone whose OS-level
// accessibility setting is off, and vice versa for "Off" (forcing motion
// back on for an OS that prefers it reduced - an unlikely choice, but
// FR-110 lists this as a real three-way setting, not just a mute switch
// on top of the OS).
//
// CSS-only motion (the window-light flicker and dust motes, both in
// index.css) can't read this directly - a plain `@media` query can't be
// turned off by JS. `applyReducedMotionClass` mirrors "on" as a class on
// `<html>` that index.css also matches, alongside its existing `@media`
// block. There's no equivalent for forcing "off" against a true OS-level
// reduced-motion preference for that CSS-only motion specifically - a real
// gap, but a narrow one (only matters for someone whose OS already
// prefers reduced motion and who also wants this one app to ignore that),
// left as a known limitation rather than restructuring every animation in
// index.css to be JS-class-driven instead of `@media`-driven.
export type ReducedMotionSetting = "system" | "on" | "off";

const SETTING_KEY = "ward-games:reduced-motion";
const CLASS_NAME = "ward-reduced-motion";

export function getReducedMotionSetting(): ReducedMotionSetting {
  try {
    const stored = localStorage.getItem(SETTING_KEY);
    return stored === "on" || stored === "off" ? stored : "system";
  } catch {
    return "system";
  }
}

export function setReducedMotionSetting(value: ReducedMotionSetting): void {
  try {
    if (value === "system") localStorage.removeItem(SETTING_KEY);
    else localStorage.setItem(SETTING_KEY, value);
  } catch {
    // storage blocked - the setting just won't persist across reloads
  }
  applyReducedMotionClass();
}

function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The one function every component should call instead of reading
 * `matchMedia` itself - folds in the user's override, if any. */
export function prefersReducedMotion(): boolean {
  const setting = getReducedMotionSetting();
  if (setting === "on") return true;
  if (setting === "off") return false;
  return systemPrefersReducedMotion();
}

function applyReducedMotionClass(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(CLASS_NAME, getReducedMotionSetting() === "on");
}

if (typeof window !== "undefined") {
  applyReducedMotionClass();
}
