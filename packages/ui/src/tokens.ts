// The locked design tokens. See masterdoc.md section 2.1 (visual language)
// and 6.2 (full palette). Every pixel-UI component should pull colors from
// here, never hardcode a hex, so the "one locked palette" rule (D3) is
// enforced by the type system rather than by discipline alone.

export const palette = {
  lilacMist: "#DEC9E9",
  softLilac: "#DAC3E8",
  paleViolet: "#D2B7E5",
  white: "#FFFFFF",
  lavender: "#C19EE0",
  orchid: "#B185DB",
  amethyst: "#A06CD5",
  deepAmethyst: "#9163CB",
  violet: "#815AC0",
  deepViolet: "#7251B5",
  nightViolet: "#6247AA",
  ink: "#14101F",
  mint: "#8FE3B0", // correct / success
  butter: "#FFE08A", // present / warning
  coral: "#FF7A7A", // danger / wrong
} as const;

export type PaletteKey = keyof typeof palette;

/** The 480x270 stage, scaled by an integer factor. See masterdoc.md 2.1. */
export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 270;
export const PORTRAIT_STAGE_SIZE = 270; // center square shown on portrait phones

export function integerStageScale(containerCssWidth: number, devicePixelRatio: number, artWidth: number): number {
  return Math.max(1, Math.floor((containerCssWidth * devicePixelRatio) / artWidth)) / devicePixelRatio;
}

export const MIN_TOUCH_TARGET_PX = 44;
