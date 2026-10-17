// A continuous, smoothstep-eased crossfade through a sequence of
// pre-rendered lighting keyframes of an otherwise-static background - see
// TODO.md for the Lounge sunset-breathing animation this was built for.
// Composition/geometry is locked across every frame (same art, different
// lighting only), so this is purely a background-layer swap: it never
// moves or resizes anything, which is what lets hotspots/games keep
// working completely unaware of it (same percentage-based positioning as
// a single static <img> would get).
//
// Driven by requestAnimationFrame rather than a CSS `transition`, so the
// easing is the exact smoothstep curve (t*t*(3-2t)) the animation spec
// asked for, and so consecutive keyframes blend continuously into each
// other with no held pause in between - "a quiet, warm, premium room...
// alive, but the room itself perfectly still," not a slideshow.
//
// `frames` should already loop cleanly end-to-end (the last entry's
// lighting state close to the first's) so wrapping from the last frame
// back to the first reads as just another ordinary crossfade, not a jump.
import { useEffect, useRef, useState, type CSSProperties } from "react";

export interface AmbientRoomLoopProps {
  /** Lighting keyframes in chronological order. */
  frames: string[];
  /** Crossfade duration between each consecutive pair of keyframes. */
  transitionMs?: number;
  /** Frame shown, frozen, for prefers-reduced-motion - defaults to frames[0]. Pass the scene's plain unlit background explicitly if `frames` itself never includes it (e.g. a loop that deliberately stays among warmer states). */
  staticFrame?: string;
  alt?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function AmbientRoomLoop({ frames, transitionMs = 2600, staticFrame, alt = "" }: AmbientRoomLoopProps) {
  // Checked once on mount, same pattern as AnimatedCritter/WindowLight -
  // reduced-motion users just get the first (baseline) frame, frozen.
  const reduced = useRef(prefersReducedMotion());
  const [opacities, setOpacities] = useState<number[]>(() => frames.map((_, i) => (i === 0 ? 1 : 0)));

  useEffect(() => {
    if (reduced.current || frames.length <= 1) return;
    let current = 0;
    let segmentStart: number | null = null;
    let raf = 0;

    function tick(now: number) {
      if (segmentStart === null) segmentStart = now;
      const elapsed = now - segmentStart;
      const eased = smoothstep(elapsed / transitionMs);
      const next = (current + 1) % frames.length;

      setOpacities(frames.map((_, i) => (i === current ? 1 - eased : i === next ? eased : 0)));

      if (elapsed >= transitionMs) {
        current = next;
        segmentStart = now; // chain straight into the next transition - no held pause
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, transitionMs]);

  const baseImgStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
  };

  if (reduced.current || frames.length === 0) {
    return <img src={staticFrame ?? frames[0]} alt={alt} style={{ ...baseImgStyle, position: "relative" }} />;
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {frames.map((src, i) => (
        <img key={i} src={src} alt={i === 0 ? alt : ""} style={{ ...baseImgStyle, opacity: opacities[i] }} />
      ))}
    </div>
  );
}
