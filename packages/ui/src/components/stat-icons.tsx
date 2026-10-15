// Small flat vector icons for the Games/Stats/Album screens (S05/S34/S22).
// Same "simple geometric shape, not final iconography" spirit as
// icons.tsx's corner-nav set - that file stays scoped to the nav itself,
// this one covers the richer icon vocabulary those three content screens
// need (trophies, locks, categories, filters). `tone` picks which palette
// token strokes with, since these render on busy colored surfaces
// (locked/muted, accent, plain white) rather than always-white nav icons.
import type { CSSProperties, ReactNode } from "react";
import { palette } from "../tokens";

export type IconTone = "white" | "lilac" | "amethyst" | "muted";

const TONE_COLOR: Record<IconTone, string> = {
  white: palette.white,
  lilac: palette.lilacMist,
  amethyst: palette.deepAmethyst,
  muted: "rgba(255,255,255,0.4)",
};

function strokeProps(tone: IconTone, width = 2) {
  return {
    fill: "none" as const,
    stroke: TONE_COLOR[tone],
    strokeWidth: width,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export interface IconProps {
  tone?: IconTone;
  size?: number | string;
  style?: CSSProperties;
}

function Svg({ size = 20, style, children }: { size?: number | string; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={style} aria-hidden="true">
      {children}
    </svg>
  );
}

export function ControllerIcon({ tone = "white", size, style }: IconProps) {
  const s = strokeProps(tone);
  return (
    <Svg size={size} style={style}>
      <path d="M7 9h10a4 4 0 0 1 4 4.5l-.6 2.6a2.2 2.2 0 0 1-3.9.9L15 15H9l-1.5 2a2.2 2.2 0 0 1-3.9-.9L3 13.5A4 4 0 0 1 7 9Z" {...s} />
      <path d="M8 12.5h2M9 11.5v2" {...s} />
      <circle cx="16" cy="12" r="0.9" fill={TONE_COLOR[tone]} />
      <circle cx="17.6" cy="13.8" r="0.9" fill={TONE_COLOR[tone]} />
    </Svg>
  );
}

export function PulseLineIcon({ tone = "amethyst", size, style }: IconProps) {
  const s = strokeProps(tone, 2.2);
  return (
    <Svg size={size} style={style}>
      <path d="M2 12h4l2 6 3-14 2.5 8H16l2-4 1.5 4H22" {...s} />
    </Svg>
  );
}

export function PeopleIcon({ tone = "lilac", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <circle cx="8.5" cy="8" r="2.6" {...s} />
      <circle cx="16" cy="9" r="2.1" {...s} />
      <path d="M3.5 19c0-3 2.3-5 5-5s5 2 5 5M14.5 19c0-2.4 1.6-4.3 4-4.7" {...s} />
    </Svg>
  );
}

export function LockIcon({ tone = "muted", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <rect x="5" y="11" width="14" height="9" rx="2" {...s} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" {...s} />
      <circle cx="12" cy="15.5" r="1.2" fill={TONE_COLOR[tone]} />
    </Svg>
  );
}

export function PlayChevronIcon({ tone = "white", size, style }: IconProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M8 5.5l9 6.5-9 6.5V5.5Z" fill={TONE_COLOR[tone]} stroke="none" />
    </Svg>
  );
}

export function TrophyIcon({ tone = "amethyst", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <path d="M7 4h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z" {...s} />
      <path d="M7 5H4.5A2.5 2.5 0 0 0 4.5 10H7M17 5h2.5A2.5 2.5 0 0 1 19.5 10H17" {...s} />
      <path d="M12 13v3M9 20h6M9.5 20c0-1.8.9-3 2.5-3s2.5 1.2 2.5 3" {...s} />
    </Svg>
  );
}

export function CrownIcon({ tone = "amethyst", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <path d="M4 18h16l-1.4-8-4.1 3.2L12 7l-2.5 6.2L5.4 10 4 18Z" {...s} />
      <path d="M5 20h14" {...s} />
    </Svg>
  );
}

export function HandshakeIcon({ tone = "lilac", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <path d="M2 12l4-3 3.5 2.5L13 8l3 1.5L22 12" {...s} />
      <path d="M8 11.5l3 3-1.2 1.2a1.6 1.6 0 0 1-2.3 0 1.6 1.6 0 0 1 0-2.3M13 10.5l3.3 3.3-1 1a1.5 1.5 0 0 1-2.1 0" {...s} />
    </Svg>
  );
}

export function ClockIcon({ tone = "muted", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <circle cx="12" cy="12" r="8.5" {...s} />
      <path d="M12 7v5l3.5 2" {...s} />
    </Svg>
  );
}

export function StethoscopeIcon({ tone = "lilac", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <path d="M6 3v6a4 4 0 0 0 8 0V3" {...s} />
      <path d="M10 13v2a5 5 0 0 0 10 0v-1.5" {...s} />
      <circle cx="20" cy="12" r="1.6" {...s} />
    </Svg>
  );
}

export function AlertMonitorIcon({ tone = "lilac", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" {...s} />
      <path d="M5 10h3l1.5-3L11 15l2-6 1.5 1H19" {...s} />
      <path d="M9 20h6" {...s} />
    </Svg>
  );
}

export function BookIcon({ tone = "lilac", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <path d="M12 6c-1.6-1.3-4-2-7.5-2v14c3.5 0 5.9.7 7.5 2 1.6-1.3 4-2 7.5-2V4c-3.5 0-5.9.7-7.5 2Z" {...s} />
      <path d="M12 6v14" {...s} />
    </Svg>
  );
}

export function BoltIcon({ tone = "lilac", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z" {...s} />
    </Svg>
  );
}

export function MagnifierIcon({ tone = "lilac", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <circle cx="10.5" cy="10.5" r="6" {...s} />
      <path d="M19 19l-4.3-4.3" {...s} />
    </Svg>
  );
}

export function FlameIcon({ tone = "amethyst", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <path d="M12 2c1 3-2.5 4-2.5 7a2.5 2.5 0 0 0 5 0c1.5 1 2.5 2.8 2.5 4.5A5.5 5.5 0 0 1 11.5 19 5.5 5.5 0 0 1 6 13.5C6 9 10 7 12 2Z" {...s} />
    </Svg>
  );
}

export function GridIcon({ tone = "white", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" {...s} />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" {...s} />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" {...s} />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" {...s} />
    </Svg>
  );
}

export function HeartOutlineIcon({ tone = "lilac", size, style }: IconProps) {
  const s = strokeProps(tone, 1.8);
  return (
    <Svg size={size} style={style}>
      <path d="M12 20s-7-4.4-9.3-8.8C1.3 8 3 5 6.2 5 8.6 5 10.5 6.4 12 8.3 13.5 6.4 15.4 5 17.8 5 21 5 22.7 8 21.3 11.2 19 15.6 12 20 12 20Z" {...s} />
    </Svg>
  );
}
