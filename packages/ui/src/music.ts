// The looping background-music engine - see sfx.ts for the one-shot SFX
// counterpart and why this is plain Web Audio API rather than a library.
// Separate mute state from sfx.ts on purpose: masterdoc.md section 2.7
// lists "sound effects" and "music" as two independently toggleable
// settings, not one volume knob, so muting one must never silence the
// other - the clicks and barks are meant to layer on top of the loop,
// not share its switch.
import { getAudioContext, onUnlock } from "./audio-context";

const MUTE_KEY = "ward-games:music-muted";
const DEFAULT_FADE_IN_MS = 2000;
const DEFAULT_FADE_OUT_MS = 800;

interface RegisteredTrack {
  srcs: string[];
  volume: number;
  buffer: AudioBuffer | null;
  loading: Promise<AudioBuffer | null> | null;
}

const tracks = new Map<string, RegisteredTrack>();
let muted = loadMuted();
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;
let currentKey: string | null = null;

// Same observability hook as sfx.ts's onSfxPlay, for the same reason -
// "did the track actually start" is otherwise unverifiable without real
// ears. Fires once per playMusic() that actually starts a new track, not
// on every loop iteration (the Web Audio API loops the same source node
// internally - there's no per-loop JS callback to hook even if this
// wanted one).
export interface MusicPlayEvent {
  key: string;
  at: number;
}
const playListeners = new Set<(event: MusicPlayEvent) => void>();

export function onMusicPlay(listener: (event: MusicPlayEvent) => void): () => void {
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

async function loadBuffer(key: string): Promise<AudioBuffer | null> {
  const track = tracks.get(key);
  if (!track) return null;
  if (track.buffer) return track.buffer;
  if (track.loading) return track.loading;

  const promise = (async () => {
    const ctx = getAudioContext();
    if (!ctx) return null;
    for (const src of track.srcs) {
      try {
        const res = await fetch(src);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        track.buffer = buffer;
        return buffer;
      } catch {
        // try the next src in the fallback list (e.g. OGG failed, try MP3)
      }
    }
    return null;
  })();

  track.loading = promise;
  return promise;
}

export interface RegisterMusicOptions {
  /** 0-1, the volume once faded in and unmuted - deliberately modest by
   * default (0.35) so SFX still read clearly layered on top of it. */
  volume?: number;
}

export function registerMusic(key: string, srcs: string[], options?: RegisterMusicOptions): void {
  if (!tracks.has(key)) {
    tracks.set(key, { srcs, volume: options?.volume ?? 0.35, buffer: null, loading: null });
  }
  loadBuffer(key).catch(() => {});
}

export interface PlayMusicOptions {
  fadeInMs?: number;
}

/** Starts looping playback of a registered track with a gain fade-in.
 * Safe to call before the page has actually unlocked audio - this just
 * queues the real start for the moment the first real user gesture
 * happens (masterdoc's "muted until the first tap"), so a caller never
 * has to coordinate that itself. A no-op if this track is already the one
 * playing (so re-navigating to a screen that calls this again doesn't
 * restart/refade the loop mid-song). */
export function playMusic(key: string, options?: PlayMusicOptions): void {
  const fadeInMs = options?.fadeInMs ?? DEFAULT_FADE_IN_MS;
  onUnlock(() => {
    startMusicNow(key, fadeInMs).catch(() => {});
  });
}

async function startMusicNow(key: string, fadeInMs: number): Promise<void> {
  if (currentKey === key && currentSource) return; // already the active track
  const ctx = getAudioContext();
  const track = tracks.get(key);
  if (!ctx || !track) return;
  const buffer = await loadBuffer(key);
  if (!buffer) return;

  stopMusicNow(0); // cut whatever else was playing before starting this one

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = ctx.createGain();
  const targetVolume = muted ? 0 : track.volume;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + fadeInMs / 1000);
  source.connect(gain).connect(ctx.destination);
  source.start(0);

  currentSource = source;
  currentGain = gain;
  currentKey = key;
  const event: MusicPlayEvent = { key, at: Date.now() };
  playListeners.forEach((listener) => listener(event));
}

function stopMusicNow(fadeOutMs: number): void {
  if (!currentSource || !currentGain) return;
  const ctx = getAudioContext();
  const source = currentSource;
  const gain = currentGain;
  currentSource = null;
  currentGain = null;
  currentKey = null;
  if (ctx && fadeOutMs > 0) {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOutMs / 1000);
    setTimeout(() => {
      try {
        source.stop();
      } catch {
        // already stopped - fine
      }
    }, fadeOutMs);
  } else {
    try {
      source.stop();
    } catch {
      // already stopped - fine
    }
  }
}

export function stopMusic(fadeOutMs: number = DEFAULT_FADE_OUT_MS): void {
  stopMusicNow(fadeOutMs);
}

export function isMusicMuted(): boolean {
  return muted;
}

export function setMusicMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // ignore, per browser-storage guidance - never let this break the page
  }
  if (currentGain && currentKey) {
    const ctx = getAudioContext();
    const track = tracks.get(currentKey);
    if (ctx && track) {
      const target = value ? 0 : track.volume;
      currentGain.gain.cancelScheduledValues(ctx.currentTime);
      currentGain.gain.setValueAtTime(currentGain.gain.value, ctx.currentTime);
      currentGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.3);
    }
  }
}

export function toggleMusicMuted(): boolean {
  setMusicMuted(!muted);
  return muted;
}
