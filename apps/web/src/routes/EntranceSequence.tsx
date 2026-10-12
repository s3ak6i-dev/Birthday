// The Gate screen's one-time arrival animation - plays
// art/export/entrance-sequence.mp4, then fades out to reveal the real
// Gate page (Logotype + character picker) underneath.
//
// Revision history, since this file has gone through a few real
// rewrites:
//  1. 4 approach frames + 4 door-opening frames, crossfaded with a CSS
//     Ken Burns zoom and a fade-to-ink seam-hider between the two
//     separately-generated sheets.
//  2. Replaced with a 9-shot sequence (art/export/entrance/*.webp) from
//     one consistent source (a reference GIF's own keyframes) - simpler,
//     no seam, but still just an opacity crossfade between static poses.
//  3. This version: asked to make it "much smoother." A crossfade between
//     two *different* poses doesn't read as motion, it reads as a
//     dissolve/ghost - no amount of timing tuning fixes that, since
//     there's no actual in-between motion being shown. Instead, built an
//     actual video from those 9 frames using ffmpeg's `minterpolate`
//     (motion-compensated frame interpolation, the same technique used to
//     convert 24fps film to smooth 60fps) to synthesize the in-between
//     motion at each cut, then re-encoded it as a single small MP4
//     (~650KB for the whole 5.1s sequence). This is a real `<video>`
//     element now, not a crossfade stack of images - checked the
//     interpolated frames at every cut (including the two riskiest ones,
//     where a hand appears/disappears for the knock) for ghosting/warping
//     artifacts before committing to this; none showed up.
//  4. Added `onPlaybackEnd` (fires the instant the video ends, distinct
//     from `onComplete` which fires 450ms later once the fade-out
//     finishes) - fixed a flash of the bare Gate screen showing through
//     during that fade, caused by the intro dialogue not mounting until
//     `onComplete` had already fired.
//
// Skippable by tapping anywhere (reduced-motion skips it outright, same
// rule as WindowLight/AnimatedCritter), and only auto-plays once per
// browser (localStorage) - a login screen you'll revisit for months
// shouldn't force a multi-second animation every time.
import { useRef, useState } from "react";
import { palette } from "@ward-games/ui";

const ENTRANCE_SEEN_KEY = "waiting-room:entrance-seen";
const FADE_MS = 450;

export function hasSeenEntrance(): boolean {
  try {
    return localStorage.getItem(ENTRANCE_SEEN_KEY) === "1";
  } catch {
    return false; // storage blocked - just play it, no harm
  }
}

function markEntranceSeen() {
  try {
    localStorage.setItem(ENTRANCE_SEEN_KEY, "1");
  } catch {
    // ignore, per browser-storage guidance - never let this break the page
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function EntranceSequence({
  onComplete,
  onPlaybackEnd,
}: {
  onComplete: () => void;
  /** Fires the instant the video itself finishes, before the 450ms fade-out
   * starts - so whatever should be revealed by that fade (the intro
   * dialogue) can mount in time to actually be there once the fade exposes
   * it, instead of a beat of the bare Gate screen showing through first. */
  onPlaybackEnd?: () => void;
}) {
  const reduced = useRef(prefersReducedMotion());
  const [fadingOut, setFadingOut] = useState(false);
  const finishedRef = useRef(false);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markEntranceSeen();
    onPlaybackEnd?.();
    setFadingOut(true);
    setTimeout(onComplete, FADE_MS);
  }

  if (reduced.current) {
    // Mark it seen and skip outright, same as every other motion-driven
    // component in this app (WindowLight, AnimatedCritter) - run once,
    // synchronously, not via an effect, so nothing flashes on screen first.
    if (!finishedRef.current) {
      finishedRef.current = true;
      markEntranceSeen();
      onPlaybackEnd?.();
      queueMicrotask(onComplete);
    }
    return null;
  }

  return (
    <div
      role="presentation"
      onClick={finish}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: palette.ink,
        cursor: "pointer",
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <video
        src="/entrance/sequence.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      <p
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          color: palette.white,
          opacity: 0.6,
          fontSize: 13,
        }}
      >
        tap to skip
      </p>
    </div>
  );
}
