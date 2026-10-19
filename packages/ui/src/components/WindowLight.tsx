// Ambient window light for a scene (currently just the Lounge, S04). Pure
// CSS - no art dependency, no sprite frames. See masterdoc.md section 2.6
// "small animated details" and the D13 split: this is UI/code, not an
// asset. Position it where the real window's light would fall in whatever
// background it's layered over - see WindowLightProps.
//
// Reduced motion (section 2.8) is handled in CSS (.ward-window-light /
// .ward-dust-mote rules in apps/web/src/index.css), not here - both the
// OS-level prefers-reduced-motion query and the in-app Settings override
// (motion.ts's `ward-reduced-motion` class, FR-110) are wired there.
import type { CSSProperties } from "react";
import type { HotspotRect } from "./Hotspot";

export interface WindowLightProps extends HotspotRect {
  moteCount?: number;
}

const MOTE_SEEDS = [
  { leftPct: 20, topPct: 70, delay: 0, duration: 9, driftX: 14 },
  { leftPct: 45, topPct: 85, delay: 2.5, duration: 11, driftX: -10 },
  { leftPct: 65, topPct: 60, delay: 5, duration: 8, driftX: 8 },
  { leftPct: 30, topPct: 40, delay: 1.5, duration: 10, driftX: -6 },
  { leftPct: 78, topPct: 75, delay: 4, duration: 12, driftX: 12 },
  { leftPct: 55, topPct: 25, delay: 6.5, duration: 9.5, driftX: -8 },
];

export function WindowLight({ left, top, width, height, moteCount = MOTE_SEEDS.length }: WindowLightProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <div
        className="ward-window-light"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(255,224,138,0.16) 0%, rgba(255,224,138,0.07) 45%, rgba(255,224,138,0) 75%)",
        }}
      />
      {MOTE_SEEDS.slice(0, moteCount).map((mote, i) => (
        <span
          key={i}
          className="ward-dust-mote"
          style={
            {
              position: "absolute",
              left: `${mote.leftPct}%`,
              top: `${mote.topPct}%`,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.8)",
              animationDelay: `${mote.delay}s`,
              animationDuration: `${mote.duration}s`,
              "--mote-drift-x": `${mote.driftX}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
