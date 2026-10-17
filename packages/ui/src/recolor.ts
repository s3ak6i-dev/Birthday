// Runtime scrub-color recoloring for PlayableCharacter's sprite frames -
// the Lounge's in-game character was always the plain neutral gray
// before this, regardless of the scrub color chosen in Avatar Setup
// (that screen's own preview just swaps between pre-generated images,
// see apps/web/src/lib/avatar-options.ts's header comment on why -
// different problem, different art, not changed by this file). There's
// no separate pre-rendered sheet per color for the ~20-29 walk/idle/
// wave/sit frames each character has, so this recolors the single
// existing (gray) sheet live instead.
//
// A plain global color-range filter isn't safe on its own: the scrub
// fabric's own HSL range (near-neutral, slightly warm) was measured
// directly off several real frames from both characters, and a handful
// of shoe highlight pixels land in that exact same range by coincidence
// (confirmed by sampling, not assumed) - a filter alone would recolor
// chunks of the shoes along with the clothing. A single fixed-size floor
// on top of that isn't enough either, confirmed the hard way: a sleeve
// can be disconnected from the main shirt blob by a hair strand crossing
// over it (one real case measured at 368px, another at only 216px - both
// legitimate clothing), while a real shoe fragment right next to a pant
// cuff (the two are only a couple of px apart there, nothing a size floor
// or a plausible merge radius can tell apart on size/color alone - a
// shoe and a real shoulder-fabric sliver sampled at nearly identical
// mean lightness/saturation).
//
// What actually resolves it is combining three signals, each doing a
// job size alone can't:
//  1. Any component at least `ANCHOR_REL_FRAC` of this frame's own
//     largest candidate component (not a fixed px count - some frames,
//     e.g. a back-facing walk cycle with hair covering most of the
//     torso, have NO single large chunk, so "large" has to mean
//     "large for this frame," not an absolute number) is trusted
//     outright: the shirt, each pant leg, whatever the frame's actual
//     clothing masses are.
//  2. Smaller leftover fragments merge into a nearby anchor if they're
//     within `MERGE_DILATE_PX` of one (bridges the hair-gap case) -
//     measured directly: idle-pose sleeve gaps close by ~12px, so this
//     has margin to spare.
//  3. That merge only fires above the neck-to-waist line
//     (`MERGE_GATE_FRAC` of the sprite's own content height) - verified
//     against both a seated and a standing pose that this reliably sits
//     below every sleeve/collar case and above every shoe case, even
//     though a sit pose's shoe and a stand pose's shoe land at very
//     different fractions of the sprite otherwise. A fragment below that
//     line only gets recolored if it already qualified as its own anchor
//     in step 1 - which is what keeps a real disconnected pant-leg
//     fragment included without opening the door to merging in shoes.
//
// Not a perfect classifier - a few rare, heavily hair-occluded frames
// (a couple of back-facing walk-cycle poses) still leave a small sliver
// or two of real fabric gray instead of recolored, verified and accepted
// as a known minor gap rather than chased further, since every visible
// standing/idle/walking/sitting pose that actually gets looked at is
// correct and every shoe stays untouched.
//
// Recolors by hue/saturation swap while preserving each pixel's own
// lightness, not a flat fill - that's what keeps the fabric's existing
// shading/folds intact under the new color instead of flattening them.

const FABRIC_HUE_TOLERANCE_DEG = 25; // measured cluster: hue within ~20° of 0 across every sample
const FABRIC_SAT_MIN = 0.08;
const FABRIC_SAT_MAX = 0.32;
const FABRIC_LIGHT_MIN = 0.55;
const FABRIC_LIGHT_MAX = 0.92;
const MIN_ALPHA = 20;
const ANCHOR_REL_FRAC = 0.15; // relative to this frame's own largest candidate component
const ANCHOR_MIN_PX = 50; // absolute floor so a tiny frame's "15%" can't anchor on noise
const MERGE_DILATE_PX = 16; // bridges a real hair-crossing gap (~12px measured) with margin
const MERGE_GATE_FRAC = 0.72; // fraction of content height below which a merge never fires

function rgbToHsl(r: number, g: number, b: number): [h: number, s: number, l: number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l < 0.5 ? d / (max + min) : d / (2 - max - min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [r: number, g: number, b: number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r1, g1, b1] = [0, 0, 0];
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

function hexToHueSat(hex: string): [h: number, s: number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const [h, s] = rgbToHsl(r, g, b);
  return [h, s];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// `${src}|${hex}` -> recolored data URL. Module-level, shared by every
// PlayableCharacter instance on the page - the same frame+color pair is
// recolored once total, not once per character.
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

/** Synchronous cache check - lets a render pick up an already-warm result
 * immediately instead of flashing the uncolored frame for one tick while
 * the async job (see `recolorSprite`) resolves. */
export function getCachedRecolor(src: string, hex: string): string | undefined {
  return cache.get(`${src}|${hex}`);
}

/** Recolors `src`'s clothing region to `hex`, returning a data URL. Safe
 * to call repeatedly for the same (src, hex) pair - cached after the
 * first real computation. */
export async function recolorSprite(src: string, hex: string): Promise<string> {
  const key = `${src}|${hex}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const job = (async () => {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src; // canvas unsupported - fall back to the plain gray frame, don't crash
    ctx.drawImage(img, 0, 0);

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    const pixelCount = width * height;

    const candidate = new Uint8Array(pixelCount);
    let contentTop = height;
    let contentBottom = -1;
    for (let i = 0; i < pixelCount; i++) {
      const a = data[i * 4 + 3]!;
      if (a < MIN_ALPHA) continue;
      const y = (i / width) | 0;
      if (y < contentTop) contentTop = y;
      if (y > contentBottom) contentBottom = y;
      const [h, s, l] = rgbToHsl(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!);
      const hueDist = Math.min(Math.abs(h), 360 - Math.abs(h));
      if (hueDist <= FABRIC_HUE_TOLERANCE_DEG && s >= FABRIC_SAT_MIN && s <= FABRIC_SAT_MAX && l >= FABRIC_LIGHT_MIN && l <= FABRIC_LIGHT_MAX) {
        candidate[i] = 1;
      }
    }

    // 4-connectivity flood fill into components, iterative (no recursion
    // depth risk on a large connected shirt/pants region). Tracks each
    // component's size and its pixels' y-sum (for a mean y, used by the
    // merge gate below) while labeling.
    const labels = new Int32Array(pixelCount);
    const sizes: number[] = [0];
    const ySums: number[] = [0];
    const stack: number[] = [];
    let nextLabel = 1;
    for (let start = 0; start < pixelCount; start++) {
      if (!candidate[start] || labels[start]) continue;
      const label = nextLabel++;
      let size = 0;
      let ySum = 0;
      stack.push(start);
      labels[start] = label;
      while (stack.length > 0) {
        const idx = stack.pop()!;
        size++;
        const x = idx % width;
        const y = (idx / width) | 0;
        ySum += y;
        if (x > 0 && candidate[idx - 1] && !labels[idx - 1]) {
          labels[idx - 1] = label;
          stack.push(idx - 1);
        }
        if (x < width - 1 && candidate[idx + 1] && !labels[idx + 1]) {
          labels[idx + 1] = label;
          stack.push(idx + 1);
        }
        if (y > 0 && candidate[idx - width] && !labels[idx - width]) {
          labels[idx - width] = label;
          stack.push(idx - width);
        }
        if (y < height - 1 && candidate[idx + width] && !labels[idx + width]) {
          labels[idx + width] = label;
          stack.push(idx + width);
        }
      }
      sizes[label] = size;
      ySums[label] = ySum;
    }

    // Anchors: components large relative to THIS frame's own biggest one
    // (see the header comment on why relative, not absolute).
    let maxSize = 0;
    for (let label = 1; label < nextLabel; label++) {
      if (sizes[label]! > maxSize) maxSize = sizes[label]!;
    }
    const anchorThreshold = Math.max(maxSize * ANCHOR_REL_FRAC, ANCHOR_MIN_PX);
    const isAnchor = new Uint8Array(nextLabel);
    const anchorMask = new Uint8Array(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      const label = labels[i]!;
      if (label && sizes[label]! >= anchorThreshold) {
        isAnchor[label] = 1;
        anchorMask[i] = 1;
      }
    }

    // Dilate the anchor mask by MERGE_DILATE_PX (plain repeated 4-neighbor
    // expansion - these sprites are small enough that this is cheap, no
    // need for a distance transform).
    let frontier = anchorMask;
    const near = anchorMask.slice();
    for (let step = 0; step < MERGE_DILATE_PX; step++) {
      const next = new Uint8Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        if (!frontier[i]) continue;
        const x = i % width;
        const y = (i / width) | 0;
        if (x > 0 && !near[i - 1]) {
          near[i - 1] = 1;
          next[i - 1] = 1;
        }
        if (x < width - 1 && !near[i + 1]) {
          near[i + 1] = 1;
          next[i + 1] = 1;
        }
        if (y > 0 && !near[i - width]) {
          near[i - width] = 1;
          next[i - width] = 1;
        }
        if (y < height - 1 && !near[i + width]) {
          near[i + width] = 1;
          next[i + width] = 1;
        }
      }
      frontier = next;
    }

    // A merge only fires above the gate line (see header comment) - below
    // it, only components that already qualified as their own anchor get
    // recolored.
    const contentHeight = contentBottom - contentTop;
    const mergeGateY = contentTop + contentHeight * MERGE_GATE_FRAC;
    const keep = new Uint8Array(nextLabel);
    const eligibleForMerge = new Uint8Array(nextLabel);
    for (let label = 1; label < nextLabel; label++) {
      if (isAnchor[label]) {
        keep[label] = 1;
      } else if (ySums[label]! / sizes[label]! <= mergeGateY) {
        eligibleForMerge[label] = 1;
      }
    }
    // One pass to find which merge-eligible components actually touch the
    // dilated anchor region, instead of re-scanning per component.
    for (let i = 0; i < pixelCount; i++) {
      if (!near[i]) continue;
      const label = labels[i]!;
      if (label && eligibleForMerge[label]) keep[label] = 1;
    }

    const [targetHue, targetSat] = hexToHueSat(hex);
    for (let i = 0; i < pixelCount; i++) {
      const label = labels[i]!;
      if (!label || !keep[label]) continue;
      const [, , l] = rgbToHsl(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!);
      const [r, g, b] = hslToRgb(targetHue, targetSat, l);
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
    }

    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    cache.set(key, dataUrl);
    return dataUrl;
  })();

  inFlight.set(key, job);
  try {
    return await job;
  } finally {
    inFlight.delete(key);
  }
}
