// The game's title treatment: your generated stethoscope-arc frame
// (art/export/title-frame.png) with real, code-rendered text layered over
// its empty center - not AI-generated lettering, which is unreliable for
// legible text (D13). Scales via container queries, so it renders crisply
// whether it's the Gate screen's hero (large) or a smaller accent
// elsewhere, without needing separate fixed-size variants.
import type { CSSProperties } from "react";
import { palette } from "../tokens";

export interface LogotypeProps {
  width?: string | number;
}

const textShadow = [1, -1].flatMap((dx) => [1, -1].map((dy) => `${dx}px ${dy}px 0 ${palette.ink}`)).join(", ");

export function Logotype({ width = "100%" }: LogotypeProps) {
  const wrapperStyle: CSSProperties = {
    position: "relative",
    width,
    aspectRatio: "1672 / 930",
    containerType: "inline-size",
  };

  return (
    <div style={wrapperStyle}>
      <img
        src="/title-frame.png"
        alt="Dr. Chandra's Waiting Room"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1cqw",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: "6.5cqw",
            color: palette.lilacMist,
            textShadow,
            letterSpacing: "0.02em",
          }}
        >
          Dr. Chandra&rsquo;s
        </span>
        <span
          style={{
            fontSize: "10cqw",
            fontWeight: "bold",
            color: palette.white,
            textShadow,
            letterSpacing: "0.04em",
          }}
        >
          WAITING ROOM
        </span>
      </div>
    </div>
  );
}
