// The shared sound-effect engine (masterdoc.md section 2.7: "all audio
// starts muted until the first tap... respects the sound settings"). Lives
// here rather than in apps/web because the interactive primitives that
// need to play the generic click sound - PixelButton, IconButton, Hotspot -
// are defined in this package; apps/web registers its own game-specific
// sound keys into this same registry (lib/sfx.ts) rather than this
// package needing to know apps/web's asset paths.
//
// Plain Web Audio API, no library - decode each file once into an
// AudioBuffer, then play it through a fresh BufferSourceNode every time.
// That last part is the actual reason this isn't a pool of `new Audio()`
// elements: a single HTML5 <audio> element can only play one instance of
// itself at a time on iOS Safari (this app's primary target device), so
// two overlapping copies of the same sound - a reaction-pop while a
// dialogue blip is still ringing out - would just cut the first one off.
// A fresh AudioBufferSourceNode per play() call is real, unlimited
// polyphony with no such ceiling, which is also exactly what a sound
// library like Howler does internally - this is that part, written
// directly, without the rest of a general-purpose library around it.
//
// See music.ts for the looping background-track counterpart to this file
// - same shared AudioContext (audio-context.ts), separate mute state,
// since masterdoc.md 2.7 treats "sound effects" and "music" as two
// independently toggleable things, not one volume knob.
import { getAudioContext, attachUnlockListener } from "./audio-context";

const MUTE_KEY = "ward-games:sfx-muted";

const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();
const volumes = new Map<string, number>();
let muted = loadMuted();

// A plain listener list, not an EventTarget - this only ever needs "a
// sound just played," nothing fancier, and it exists specifically so
// playback can be *observed* without needing actual audio hardware or
// ears: apps/web wires a console logger to it (see lib/sfx.ts), and it's
// what every "did this sound actually fire" check in this project can
// read going forward instead of monkey-patching AudioBufferSourceNode in
// a throwaway test script each time.
export interface SfxPlayEvent {
  key: string;
  at: number; // Date.now() when it fired
}
const playListeners = new Set<(event: SfxPlayEvent) => void>();

/** Subscribe to every sound that actually plays (never fires for a muted
 * or unregistered/not-yet-loaded key, since those never really play).
 * Returns an unsubscribe function. */
export function onSfxPlay(listener: (event: SfxPlayEvent) => void): () => void {
  playListeners.add(listener);
  return () => playListeners.delete(listener);
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false; // storage blocked - default to sound on, never let this throw
  }
}

async function loadBuffer(key: string, srcs: string[]): Promise<AudioBuffer | null> {
  const existing = buffers.get(key);
  if (existing) return existing;
  const pending = loading.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const ctx = getAudioContext();
    if (!ctx) return null;
    for (const src of srcs) {
      try {
        const res = await fetch(src);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        buffers.set(key, buffer);
        return buffer;
      } catch {
        // try the next src in the fallback list (e.g. OGG failed, try MP3)
      }
    }
    return null; // every source failed - playSound() just no-ops for this key
  })();

  loading.set(key, promise);
  return promise;
}

export interface RegisterSoundOptions {
  volume?: number;
}

/** Idempotent - safe to call every time a component mounts; re-registering
 * the same key just re-kicks off the (cached) load. Fire-and-forget: this
 * starts decoding immediately rather than waiting for the first play(). */
export function registerSound(key: string, srcs: string[], options?: RegisterSoundOptions): void {
  attachUnlockListener();
  volumes.set(key, options?.volume ?? 1);
  loadBuffer(key, srcs).catch(() => {});
}

export function playSound(key: string): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const buffer = buffers.get(key);
  if (!buffer) return; // not decoded yet (slow network) or never registered - never essential, just skip
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volumes.get(key) ?? 1;
  source.connect(gain).connect(ctx.destination);
  source.start(0);
  const event: SfxPlayEvent = { key, at: Date.now() };
  playListeners.forEach((listener) => listener(event));
}

export function isSfxMuted(): boolean {
  return muted;
}

export function setSfxMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // ignore, per browser-storage guidance - never let this break the page
  }
}

export function toggleSfxMuted(): boolean {
  setSfxMuted(!muted);
  return muted;
}

// The one sound this package owns outright, since the components that use
// it live here too. apps/web still has to call registerSound("click", ...)
// before this does anything - this package has no opinion on file paths,
// only on when the sound fires.
export function playClick(): void {
  playSound("click");
}
