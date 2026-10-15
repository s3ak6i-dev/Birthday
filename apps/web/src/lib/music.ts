// Registers and starts the background music loop. Call `initMusic()` once,
// at app startup (main.tsx), same as lib/sfx.ts's initSfx().
//
// Sourcing: supplied directly by Surya ("Midnight," from a Lo-Fi
// Soundtrack Pack) - see AUDIO_CREDITS.md for the license caveat (no
// license file shipped with the pack, so this is inferred-not-confirmed
// same as the other user-supplied sounds).
import { registerMusic, playMusic } from "@ward-games/ui";

export function initMusic(): void {
  registerMusic("midnight", ["/music/midnight.ogg", "/music/midnight.mp3"], { volume: 0.3 });
  // Starts as soon as the page actually unlocks audio (the first real tap/
  // key press) and loops for as long as the tab stays open - this module
  // only runs once at startup, not per-route, so navigating between
  // screens never restarts or interrupts it.
  playMusic("midnight", { fadeInMs: 2500 });
}
