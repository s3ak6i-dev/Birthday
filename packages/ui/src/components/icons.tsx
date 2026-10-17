// Small flat vector icons for the corner nav buttons (D13: UI chrome built
// in code). Deliberately simple geometric shapes, not final iconography -
// easy to swap for something nicer once there's a reason to revisit them.
// (Games/Album/Stats/Settings were already replaced this way - see
// Lounge.tsx's own `navIcon` helper and apps/web/public/icons/ - just
// through a locally-defined helper there instead of this shared file,
// since those four are only ever used from Lounge.tsx. Chat/Sound/Music
// below are the same swap, done here instead since they're imported
// directly from this package by more than one place.)
import { palette } from "../tokens";

// Matches apps/web/public/icons/<name>.png - this package is only ever
// consumed by apps/web today (no other app in this monorepo renders it),
// so depending on that app's own public/ layout here is a deliberate,
// accepted coupling, not an oversight - the alternative (passing every
// icon path in as a prop from each call site) would just move the same
// hardcoded paths one layer up for no real benefit.
function pixelIcon(name: string, alt = "") {
  return <img src={`/icons/${name}.png`} alt={alt} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />;
}

const stroke = {
  fill: "none",
  stroke: palette.white,
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GamesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" {...stroke} />
      <rect x="13" y="3" width="8" height="8" rx="1.5" {...stroke} />
      <rect x="3" y="13" width="8" height="8" rx="1.5" {...stroke} />
      <rect x="13" y="13" width="8" height="8" rx="1.5" {...stroke} />
    </svg>
  );
}

export function AlbumIcon() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <rect x="4" y="4" width="16" height="14" rx="2" {...stroke} />
      <path d="M4 15l4-4 3 3 4-5 5 6" {...stroke} />
      <circle cx="8.5" cy="8.5" r="1.4" fill={palette.white} />
    </svg>
  );
}

export function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path d="M4 20V10M11 20V4M18 20v-7M2 20h20" {...stroke} />
    </svg>
  );
}

export function SoundOnIcon() {
  return pixelIcon("sound-on");
}

export function SoundOffIcon() {
  return pixelIcon("sound-off");
}

export function MusicNoteIcon() {
  return pixelIcon("music-on");
}

export function MusicNoteOffIcon() {
  return pixelIcon("music-off");
}

export function AvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.6" {...stroke} />
      <path d="M4.5 20c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5" {...stroke} />
    </svg>
  );
}

export function ChatIcon() {
  return pixelIcon("chat");
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" {...stroke} />
      <path
        d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
        {...stroke}
      />
    </svg>
  );
}
