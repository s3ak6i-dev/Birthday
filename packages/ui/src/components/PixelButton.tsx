// A first, minimal example of the "UI chrome is built in code, not
// generated" rule (D13). Expand this directory with the rest of the shared
// component set (panel, dialogue box, nav bar, reaction bar, etc.) as each
// screen in the inventory (masterdoc.md section 2.2) gets built.
import type { ButtonHTMLAttributes } from "react";
import { palette, MIN_TOUCH_TARGET_PX } from "../tokens";

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger";
}

export function PixelButton({ variant = "primary", style, children, ...rest }: PixelButtonProps) {
  const background = variant === "danger" ? palette.coral : palette.violet;

  return (
    <button
      {...rest}
      style={{
        background,
        color: palette.white,
        border: `2px solid ${palette.ink}`,
        borderRadius: 8,
        minHeight: MIN_TOUCH_TARGET_PX,
        minWidth: MIN_TOUCH_TARGET_PX,
        fontFamily: "'Pixelify Sans', monospace",
        imageRendering: "pixelated",
        padding: "8px 16px",
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
