// One shared Web Audio API AudioContext for the whole app - sfx.ts (one-
// shot sound effects) and music.ts (the looping background track) are two
// different playback shapes, but they're both just graphs hanging off the
// same context, and a page should only ever have one.
let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null; // no Web Audio support at all - sound is never essential, just no-op
    audioCtx = new Ctor();
  }
  return audioCtx;
}

// Browsers refuse to start/resume an AudioContext before a real user
// gesture (masterdoc's "muted until the first tap"). Doing the unlock by
// hand is one listener; anything that wants to react to the context
// actually going live (music.ts starting its fade-in exactly when
// playback becomes audible, not before) registers via onUnlock below
// instead of polling ctx.state itself.
let unlockAttached = false;
const unlockCallbacks: Array<() => void> = [];

function handleFirstGesture(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  const callbacks = unlockCallbacks.splice(0, unlockCallbacks.length);
  callbacks.forEach((cb) => cb());
}

export function attachUnlockListener(): void {
  if (unlockAttached || typeof window === "undefined") return;
  unlockAttached = true;
  window.addEventListener("pointerdown", handleFirstGesture, { once: true });
  window.addEventListener("keydown", handleFirstGesture, { once: true });
}

/** Queues a callback for the first real user gesture; fires immediately
 * instead if the unlock has already happened by the time this is called. */
export function onUnlock(callback: () => void): void {
  attachUnlockListener();
  if (!unlockAttached) return; // no window - never fires, nothing to queue
  const ctx = getAudioContext();
  if (ctx && ctx.state === "running") {
    callback();
  } else {
    unlockCallbacks.push(callback);
  }
}
