// A generic "character not designed yet" portrait - a friendly blob with
// two dot eyes, built entirely from the locked palette (no art dependency).
// Swap for real character art the moment a cast member's design is locked
// (masterdoc.md section 11, items 3-4) - DialogueScene takes a `portrait`
// slot so that swap never touches the scene player itself.
import { palette } from "../tokens";

export function PortraitPlaceholder({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <path
        d="M48 10c22 0 34 16 34 36s-12 40-34 40S14 66 14 46 26 10 48 10Z"
        fill={palette.amethyst}
        stroke={palette.ink}
        strokeWidth={4}
      />
      <circle cx={34} cy={46} r={5} fill={palette.ink} />
      <circle cx={62} cy={46} r={5} fill={palette.ink} />
      <path d="M36 62c6 7 18 7 24 0" stroke={palette.ink} strokeWidth={4} fill="none" strokeLinecap="round" />
    </svg>
  );
}
