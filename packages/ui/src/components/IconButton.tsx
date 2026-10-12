// A round icon button for corner nav clusters (Lounge S04 and elsewhere).
// Replaces the plain-text bottom nav bar - keeps the scene full-bleed, per
// the Forest Blast / WHIZZ-style layout discussion (section 2.2's "plain,
// non-pixel-hunt nav" requirement, FR-11, satisfied via always-visible
// corner icons instead of a bottom strip).
import type { ButtonHTMLAttributes } from "react";
import { palette, MIN_TOUCH_TARGET_PX } from "../tokens";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, children, style, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      style={{
        width: MIN_TOUCH_TARGET_PX,
        height: MIN_TOUCH_TARGET_PX,
        borderRadius: "50%",
        background: "rgba(20,16,31,0.68)",
        border: `2px solid ${palette.ink}`,
        display: "grid",
        placeItems: "center",
        padding: 8,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
