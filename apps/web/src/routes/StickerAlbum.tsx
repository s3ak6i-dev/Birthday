// S22 Sticker album. See masterdoc.md section 2.2/2.6: 20 stickers, locked
// silhouettes, unlock hints.
//
// Unlocks are shared, not per-player (see lib/progress.ts) - whoever
// triggers one, both players see it unlocked, which fits "a gift the two
// of you are building together" better than two separate collections.
//
// Real art for all 20 doesn't exist yet (lib/sticker-glyphs.ts's doc
// comment) - these render as plain emoji for now, swap the glyph map once
// the pixel-art set exists. Actual unlock-condition checking also doesn't
// exist for most of the 20 (packages/shared/src/stickers.ts's own TODO:
// "turn each one into a checkable predicate", M3) - only the two or three
// genuinely wired up elsewhere in the app (see those call sites) will ever
// show unlocked right now, and that's accurate, not a bug.
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FlameIcon, GridIcon, HeartOutlineIcon, LockIcon, StethoscopeIcon, BookIcon, TrophyIcon, palette, type IconTone } from "@ward-games/ui";
import { STICKERS, type StickerCategory } from "@ward-games/shared";
import { fetchUnlockedStickerIds } from "../lib/progress";
import { STICKER_GLYPH } from "../lib/sticker-glyphs";

type Filter = "all" | "unlocked" | "locked" | StickerCategory;

const CATEGORY_LABEL: Record<StickerCategory, string> = {
  clinical: "Clinical",
  streaks: "Streaks",
  "word-games": "Word Games",
  milestones: "Milestones",
};

const CATEGORY_ICON: Record<StickerCategory, (props: { tone?: IconTone }) => ReactElement> = {
  clinical: StethoscopeIcon,
  streaks: FlameIcon,
  "word-games": BookIcon,
  milestones: TrophyIcon,
};

export function StickerAlbum() {
  const [unlocked, setUnlocked] = useState<Set<number> | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetchUnlockedStickerIds().then(setUnlocked);
  }, []);

  const unlockedCount = unlocked?.size ?? 0;
  const pct = Math.round((unlockedCount / STICKERS.length) * 100);

  const visible = useMemo(() => {
    return STICKERS.filter((s) => {
      const isUnlocked = unlocked?.has(s.id) ?? false;
      if (filter === "all") return true;
      if (filter === "unlocked") return isUnlocked;
      if (filter === "locked") return !isUnlocked;
      return s.category === filter;
    });
  }, [filter, unlocked]);

  const lockedCount = STICKERS.length - unlockedCount;

  return (
    <main style={{ padding: "28px 24px 56px", color: palette.white, background: palette.ink, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p>
          <Link to="/" style={{ color: palette.white, opacity: 0.85 }}>
            ← Back to the Lounge
          </Link>
        </p>

        <header style={{ margin: "10px 0 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 40px)" }}>Sticker Album</h1>
              <HeartOutlineIcon size={26} />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.75 }}>
              {unlocked === null ? "Loading..." : `${unlockedCount} / ${STICKERS.length} unlocked`}
            </p>
          </div>

          <div style={{ minWidth: 220, flex: "0 1 260px" }}>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${unlocked === null ? 0 : pct}%`,
                  background: `linear-gradient(90deg, ${palette.violet}, ${palette.deepAmethyst})`,
                  transition: "width 240ms ease",
                }}
              />
            </div>
            <p style={{ margin: "5px 0 0", fontSize: 11, textAlign: "right", opacity: 0.7 }}>
              {unlocked === null ? "…" : `${pct}% complete`}
            </p>
          </div>
        </header>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")} icon={<GridIcon tone={filter === "all" ? "white" : "lilac"} size={14} />}>
            All ({STICKERS.length})
          </FilterPill>
          <FilterPill active={filter === "unlocked"} onClick={() => setFilter("unlocked")}>
            Unlocked ({unlockedCount})
          </FilterPill>
          <FilterPill
            active={filter === "locked"}
            onClick={() => setFilter("locked")}
            icon={<LockIcon tone={filter === "locked" ? "white" : "muted"} size={13} />}
          >
            Locked ({lockedCount})
          </FilterPill>

          <span style={{ width: 1, height: 20, background: palette.deepViolet, margin: "0 4px" }} />

          {(Object.keys(CATEGORY_LABEL) as StickerCategory[]).map((cat) => {
            const Icon = CATEGORY_ICON[cat];
            return (
              <FilterPill key={cat} active={filter === cat} onClick={() => setFilter(cat)} icon={<Icon tone={filter === cat ? "white" : "lilac"} />}>
                {CATEGORY_LABEL[cat]}
              </FilterPill>
            );
          })}
        </div>

        {/* Grid */}
        {visible.length === 0 ? (
          <p style={{ opacity: 0.6, fontSize: 13 }}>Nothing in this filter yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {visible.map((sticker) => {
              const isUnlocked = unlocked?.has(sticker.id) ?? false;
              return (
                <div
                  key={sticker.id}
                  style={{
                    position: "relative",
                    padding: "16px 14px",
                    background: isUnlocked ? "rgba(143,227,176,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isUnlocked ? palette.mint : palette.deepViolet}`,
                    borderRadius: 12,
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: isUnlocked ? `0 0 0 1px rgba(143,227,176,0.25), 0 6px 18px rgba(143,227,176,0.1)` : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 32,
                      filter: isUnlocked ? "none" : "grayscale(1) brightness(0.4)",
                      opacity: isUnlocked ? 1 : 0.55,
                    }}
                  >
                    {STICKER_GLYPH[sticker.icon] ?? "❔"}
                  </div>
                  {isUnlocked && (
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: palette.mint,
                        color: palette.ink,
                        fontWeight: 700,
                      }}
                    >
                      Unlocked
                    </span>
                  )}
                  <strong style={{ fontSize: 13 }}>{isUnlocked ? sticker.name : "???"}</strong>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.65, lineHeight: 1.4 }}>{sticker.unlock}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function FilterPill({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        minHeight: 36,
        borderRadius: 8,
        border: `1px solid ${active ? palette.deepAmethyst : palette.deepViolet}`,
        background: active ? palette.deepAmethyst : "rgba(255,255,255,0.03)",
        color: palette.white,
        fontFamily: "'Pixelify Sans', monospace",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {icon}
      {children}
    </button>
  );
}
