// Hotspot rects + traced silhouette outlines for art/export/lounge_dusk.png
// (1672x941). See masterdoc.md section 2.3 (S04 wireframe) for which piece
// of furniture maps to which game.
//
// `left/top/width/height` are the clickable hit area (kept as simple
// rectangles - good touch targets, easy to reason about, section 2.1).
// `outline` is the actual furniture silhouette, used only for the hover
// glow so it hugs the real shape instead of showing a bounding box. Traced
// with scripts/trace-hotspots.py (Canny edges + flood-fill enclosure) for
// whiteboard/corkboard; desk/radio/door defeated that approach (thin legs,
// an overlapping chair, a thin antenna) and were hand-picked from the same
// crops instead - see that script's docstring for the full story.
//
// All percentages are of the image's own box, not the viewport - that's
// what makes them survive a resize or a later re-crop of the art.
import type { GameId } from "@ward-games/shared";
import type { HotspotOutline, HotspotRect } from "@ward-games/ui";

export interface LoungeHotspot extends HotspotRect {
  id: string;
  label: string;
  game?: GameId; // omitted for decorative/non-game hotspots
  locked?: boolean; // true for v1.5/v2 games not live yet
  outline?: HotspotOutline;
}

export const LOUNGE_HOTSPOTS: LoungeHotspot[] = [
  // v1 Must-tier games - live now (section 1.8)
  {
    id: "whiteboard",
    label: "Guess the Diagnosis",
    game: "guess-the-diagnosis",
    left: 12,
    top: 26,
    width: 14,
    height: 36,
    // Full easel silhouette (panel + both legs, with the gap between them
    // as a notch), hand-refined against a gridded 4x zoom crop after the
    // automated Canny tracer (scripts/trace-hotspots.py) couldn't close
    // the legs as one enclosed region with the panel.
    outline: {
      left: 12.799,
      top: 26.78,
      width: 13.6364,
      height: 35.9192,
      viewBoxWidth: 228,
      viewBoxHeight: 338,
      points: [
        [18, 10],
        [177, 12],
        [202, 219],
        [218, 328],
        [188, 328],
        [192, 235],
        [40, 235],
        [42, 328],
        [10, 328],
        [40, 228],
      ],
    },
  },
  {
    id: "desk",
    label: "Medical Wordle",
    game: "wordle",
    left: 58,
    top: 32,
    width: 19,
    height: 31,
    outline: {
      left: 52.2727,
      top: 22.6355,
      width: 30.3828,
      height: 49.6281,
      viewBoxWidth: 508,
      viewBoxHeight: 467,
      points: [
        [111, 204],
        [418, 214],
        [418, 379],
        [372.5, 379],
        [372.5, 250],
        [150, 250],
        [150, 379],
        [111, 379],
      ],
    },
  },
  {
    id: "radio",
    label: "Triage Dial",
    game: "triage-dial",
    left: 77,
    top: 35,
    width: 10,
    height: 27,
    outline: {
      left: 73.9833,
      top: 26.8863,
      width: 15.9689,
      height: 43.1456,
      viewBoxWidth: 267,
      viewBoxHeight: 406,
      points: [
        [80, 124],
        [92.5, 111],
        [162.5, 110],
        [176, 124],
        [176, 176],
        [79, 177.5],
      ],
    },
  },
  // v1.5 / v2 games - furniture is already in the scene, hotspot exists,
  // but it's locked until those games actually ship (section 7.1 M5/M6).
  {
    id: "corkboard",
    label: "Case Files",
    game: "case-files",
    locked: true,
    left: 1,
    top: 17,
    width: 9,
    height: 24,
    outline: {
      left: 0,
      top: 9.7768,
      width: 13.0981,
      height: 38.3634,
      viewBoxWidth: 219,
      viewBoxHeight: 361,
      points: [
        [10, 83],
        [13, 311],
        [151, 297],
        [14, 301],
      ],
    },
  },
  {
    id: "door",
    label: "Code Red",
    game: "code-red",
    locked: false,
    left: 89,
    top: 14,
    width: 11,
    height: 44,
    outline: {
      left: 85.6459,
      top: 0.7439,
      width: 14.3541,
      height: 70.3507,
      viewBoxWidth: 240,
      viewBoxHeight: 662,
      points: [
        [66, 172.5],
        [215, 135],
        [215, 477.5],
        [59, 517.5],
      ],
    },
  },
];
