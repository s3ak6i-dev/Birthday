#!/usr/bin/env python3
"""
One-off dev tool: trace each Lounge hotspot's actual furniture silhouette
out of art/export/lounge_dusk.png, so the hover outline can hug the real
object shape instead of showing a bounding-box rectangle.

v3: two earlier approaches failed.
 - v1 (color-distance-from-background) read the wall/floor's own soft
   lighting gradient as "foreground" everywhere.
 - v2 (darkness threshold as a stand-in for "ink outline") broke on
   dark-colored objects themselves (wood furniture, the radio's casing) -
   those became solid "walls" instead of enclosed shapes, since their
   fill color is as dark as the actual outline stroke.

This version uses Canny edge detection instead: it responds to local
intensity *transitions* (an actual outline stroke), not absolute
darkness, so a dark wooden desk's fill no longer gets mistaken for a wall.

 1. crop a padded region around the hotspot's rough rect
 2. Canny edge detection -> a mask of outline strokes
 3. dilate slightly to close small gaps where edges meet/branch
 4. flood-fill from the crop's border through non-edge pixels: whatever
    the flood reaches is "outside" any enclosed shape; whatever it
    doesn't reach is sealed behind an edge somewhere = object interior
 5. of all interior components, pick the one with the most overlap
    against the hotspot's original (unpadded) rect - not just whichever
    contains the exact center point, so a small decorative detail near
    the middle (e.g. a sign hanging on a door) doesn't win over the much
    larger object it's hanging on
 6. trace that component's outer contour, simplify, map back to the full
    image's coordinate space
"""

import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
IMAGE_PATH = ROOT / "art" / "export" / "lounge_dusk.png"
OUT_PATH = ROOT / "art" / "export" / "lounge_dusk.hotspots.json"

HOTSPOTS = {
    "whiteboard": {"left": 12, "top": 26, "width": 14, "height": 36},
    "desk": {"left": 58, "top": 32, "width": 19, "height": 31},
    "radio": {"left": 77, "top": 35, "width": 10, "height": 27},
    "corkboard": {"left": 1, "top": 17, "width": 9, "height": 24},
    "door": {"left": 89, "top": 14, "width": 11, "height": 44},
}

PAD_X = 0.35
PAD_Y = 0.30
CANNY_LOW = 40
CANNY_HIGH = 120
DILATE_KERNEL = 3
DILATE_ITERS = 1
SIMPLIFY_EPSILON_FRAC = 0.008
MAX_POINTS = 40


def crop_for(rect, img_w, img_h):
    rect_w_px = rect["width"] / 100 * img_w
    rect_h_px = rect["height"] / 100 * img_h
    pad_x = rect_w_px * PAD_X
    pad_y = rect_h_px * PAD_Y

    x0 = rect["left"] / 100 * img_w - pad_x
    y0 = rect["top"] / 100 * img_h - pad_y
    x1 = (rect["left"] + rect["width"]) / 100 * img_w + pad_x
    y1 = (rect["top"] + rect["height"]) / 100 * img_h + pad_y

    x0, y0 = max(0, int(x0)), max(0, int(y0))
    x1, y1 = min(img_w, int(x1)), min(img_h, int(y1))
    return x0, y0, x1, y1


def trace_one(img_bgr, hotspot_id, rect, img_w, img_h):
    x0, y0, x1, y1 = crop_for(rect, img_w, img_h)
    crop = img_bgr[y0:y1, x0:x1]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)

    edge_mask = cv2.Canny(blurred, CANNY_LOW, CANNY_HIGH)
    kernel = np.ones((DILATE_KERNEL, DILATE_KERNEL), np.uint8)
    edge_mask = cv2.dilate(edge_mask, kernel, iterations=DILATE_ITERS)

    passable = cv2.bitwise_not(edge_mask)  # 255 where NOT an edge
    h, w = passable.shape

    # Flood fill from the border through passable (non-edge) pixels.
    flood = passable.copy()
    ff_mask = np.zeros((h + 2, w + 2), np.uint8)
    for bx in range(0, w, max(1, w // 40)):
        if flood[0, bx] == 255:
            cv2.floodFill(flood, ff_mask, (bx, 0), 128)
        if flood[h - 1, bx] == 255:
            cv2.floodFill(flood, ff_mask, (bx, h - 1), 128)
    for by in range(0, h, max(1, h // 40)):
        if flood[by, 0] == 255:
            cv2.floodFill(flood, ff_mask, (0, by), 128)
        if flood[by, w - 1] == 255:
            cv2.floodFill(flood, ff_mask, (w - 1, by), 128)

    # "interior" = passable pixels the border flood never reached (128).
    interior = ((passable == 255) & (flood != 128)).astype(np.uint8) * 255

    # The hotspot's original (unpadded) rect, in this crop's local coords -
    # used to score candidate components by overlap, not just whichever one
    # happens to sit under the exact center pixel.
    rx0 = rect["left"] / 100 * img_w - x0
    ry0 = rect["top"] / 100 * img_h - y0
    rx1 = (rect["left"] + rect["width"]) / 100 * img_w - x0
    ry1 = (rect["top"] + rect["height"]) / 100 * img_h - y0

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(interior, connectivity=8)
    if num_labels <= 1:
        print(f"  ! {hotspot_id}: no enclosed regions found, skipping", file=sys.stderr)
        return None

    best_label, best_overlap = None, -1
    for label in range(1, num_labels):
        lx, ly, lw, lh, area = stats[label]
        ix0, iy0 = max(lx, rx0), max(ly, ry0)
        ix1, iy1 = min(lx + lw, rx1), min(ly + lh, ry1)
        overlap = max(0, ix1 - ix0) * max(0, iy1 - iy0)
        if overlap > best_overlap:
            best_overlap, best_label = overlap, label

    if best_label is None or best_overlap <= 0:
        print(f"  ! {hotspot_id}: no component overlaps the hotspot rect, skipping", file=sys.stderr)
        return None

    component = (labels == best_label).astype(np.uint8) * 255
    # grow back out to the outer edge of the line (component was found using
    # the dilated edge mask as walls, so include that border width back).
    component = cv2.dilate(component, kernel, iterations=DILATE_ITERS)

    contours, _ = cv2.findContours(component, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        print(f"  ! {hotspot_id}: no contour found, skipping", file=sys.stderr)
        return None

    contour = max(contours, key=cv2.contourArea)
    perimeter = cv2.arcLength(contour, True)
    epsilon = SIMPLIFY_EPSILON_FRAC * perimeter
    simplified = cv2.approxPolyDP(contour, epsilon, True)
    points = simplified.reshape(-1, 2).tolist()

    while len(points) > MAX_POINTS:
        epsilon *= 1.4
        simplified = cv2.approxPolyDP(contour, epsilon, True)
        points = simplified.reshape(-1, 2).tolist()

    crop_w, crop_h = x1 - x0, y1 - y0
    return {
        "cropLeftPct": x0 / img_w * 100,
        "cropTopPct": y0 / img_h * 100,
        "viewBoxWidth": crop_w,
        "viewBoxHeight": crop_h,
        "points": points,
    }


def main():
    img_bgr = cv2.imread(str(IMAGE_PATH))
    if img_bgr is None:
        raise SystemExit(f"Could not read {IMAGE_PATH}")
    img_h, img_w = img_bgr.shape[:2]

    results = {}
    for hotspot_id, rect in HOTSPOTS.items():
        print(f"tracing {hotspot_id}...")
        outline = trace_one(img_bgr, hotspot_id, rect, img_w, img_h)
        if outline:
            results[hotspot_id] = outline
            print(f"  ok - {len(outline['points'])} points")

    OUT_PATH.write_text(json.dumps(results, indent=2))
    print(f"\nwrote {OUT_PATH}")


if __name__ == "__main__":
    main()
