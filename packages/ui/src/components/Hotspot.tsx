// A clickable region layered over a background scene (the Lounge, S04, and
// later any other hotspot-driven screen). This is the "UI chrome built in
// code" half of D13 - the art never bakes in button states, labels, or lock
// badges; this component draws all of that on top.
//
// The clickable hit area stays a simple rectangle (good touch targets,
// section 2.1 - at least 44px, and simple to reason about). The *visual*
// hover affordance can instead hug the actual furniture silhouette, via an
// `outline` polygon traced from the art (see scripts/trace-hotspots.py) -
// falls back to a plain rounded-rect glow when no outline is supplied.
import type { CSSProperties, ReactNode } from "react";
import { palette } from "../tokens";
import { playClick } from "../sfx";

export interface HotspotRect {
  /** All percentages of the containing stage, 0-100, so this survives a re-crop or resize of the background art. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HotspotOutline extends HotspotRect {
  /** Points in the same pixel space as viewBoxWidth/viewBoxHeight (i.e. the crop the outline was traced from), not the stage. */
  points: Array<[number, number]>;
  viewBoxWidth: number;
  viewBoxHeight: number;
}

export interface HotspotProps extends HotspotRect {
  label: string;
  locked?: boolean;
  outline?: HotspotOutline;
  onActivate?: () => void;
  children?: ReactNode;
}

export function Hotspot({ left, top, width, height, label, locked, outline, onActivate, children }: HotspotProps) {
  // The "Coming soon" badge below is wider than most hotspot boxes (it's
  // `white-space: nowrap`), so centering it on hotspots near either edge
  // of the stage - corkboard at left:1%, door at left:89% - pushed it
  // straight off the visible stage and clipped by .ward-lounge-stage's
  // overflow (found on a narrow viewport, but it was really a bug at any
  // width, just more visible once the stage itself got narrower). Anchor
  // to whichever edge of the hotspot is further from the stage's own
  // edge instead of always centering.
  const nearLeftEdge = left < 15;
  const nearRightEdge = left + width > 85;
  const badgeStyle: CSSProperties = nearLeftEdge
    ? { left: 0 }
    : nearRightEdge
      ? { right: 0 }
      : { left: "50%", transform: "translateX(-50%)" };

  const buttonStyle: CSSProperties = {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    border: "none",
    borderRadius: 10,
    background: "transparent",
    cursor: locked ? "not-allowed" : "pointer",
    padding: 0,
  };

  function handleClick() {
    playClick();
    onActivate?.();
  }

  return (
    <>
      <button
        type="button"
        className={outline ? "ward-hotspot ward-hotspot--traced" : "ward-hotspot"}
        style={buttonStyle}
        aria-label={locked ? `${label} (coming soon)` : label}
        disabled={locked}
        onClick={handleClick}
      >
        {locked && (
          <span
            style={{
              position: "absolute",
              bottom: 4,
              background: palette.ink,
              color: palette.white,
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              ...badgeStyle,
            }}
          >
            Coming soon
          </span>
        )}
        {children}
      </button>

      {outline && (
        <svg
          className="ward-hotspot-outline"
          style={{
            position: "absolute",
            left: `${outline.left}%`,
            top: `${outline.top}%`,
            width: `${outline.width}%`,
            height: `${outline.height}%`,
            pointerEvents: "none",
          }}
          viewBox={`0 0 ${outline.viewBoxWidth} ${outline.viewBoxHeight}`}
          preserveAspectRatio="none"
        >
          <polygon
            points={outline.points.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="white"
            strokeWidth={5}
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  );
}
