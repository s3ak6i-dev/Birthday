// A real listener on the app's sound engines - not for gameplay, purely
// for observing what's actually playing, since neither a person glancing
// at devtools nor an automated check has ears. Subscribes to every SFX
// and music play event (packages/ui's onSfxPlay/onMusicPlay) and:
//   1. logs each one to the console, so open devtools shows a live feed
//      of exactly what sound fired and when, and
//   2. keeps the last 50 events on `window.__audioLog`, so they can be
//      read back afterward (by a person, or a Playwright check) instead
//      of needing to watch the console live or monkey-patch
//      AudioBufferSourceNode in a throwaway script each time.
// Call `initAudioDebugLog()` once, at app startup (main.tsx).
import { onSfxPlay, onMusicPlay } from "@ward-games/ui";

export interface AudioLogEntry {
  kind: "sfx" | "music";
  key: string;
  at: number;
}

const MAX_LOG_ENTRIES = 50;

declare global {
  interface Window {
    __audioLog?: AudioLogEntry[];
  }
}

export function initAudioDebugLog(): void {
  if (typeof window === "undefined") return;
  window.__audioLog = window.__audioLog ?? [];

  function record(entry: AudioLogEntry) {
    window.__audioLog!.push(entry);
    if (window.__audioLog!.length > MAX_LOG_ENTRIES) {
      window.__audioLog!.shift();
    }
    // eslint-disable-next-line no-console
    console.log(`[audio] ${entry.kind}: ${entry.key}`);
  }

  onSfxPlay(({ key, at }) => record({ kind: "sfx", key, at }));
  onMusicPlay(({ key, at }) => record({ kind: "music", key, at }));
}
