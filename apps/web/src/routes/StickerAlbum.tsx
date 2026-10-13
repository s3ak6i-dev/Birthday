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
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { palette } from "@ward-games/ui";
import { STICKERS } from "@ward-games/shared";
import { fetchUnlockedStickerIds } from "../lib/progress";
import { STICKER_GLYPH } from "../lib/sticker-glyphs";

export function StickerAlbum() {
  const [unlocked, setUnlocked] = useState<Set<number> | null>(null);

  useEffect(() => {
    fetchUnlockedStickerIds().then(setUnlocked);
  }, []);

  const unlockedCount = unlocked?.size ?? 0;

  return (
    <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
      <p>
        <Link to="/" style={{ color: palette.white }}>
          ← Back to the Lounge
        </Link>
      </p>
      <h1 style={{ margin: "8px 0 4px" }}>Sticker Album</h1>
      <p style={{ margin: "0 0 20px", opacity: 0.75, fontSize: 13 }}>
        {unlocked === null ? "Loading..." : `${unlockedCount} / ${STICKERS.length} unlocked`}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          maxWidth: 900,
        }}
      >
        {STICKERS.map((sticker) => {
          const isUnlocked = unlocked?.has(sticker.id) ?? false;
          return (
            <div
              key={sticker.id}
              style={{
                padding: "14px 12px",
                background: isUnlocked ? "rgba(143,227,176,0.12)" : "rgba(129,90,192,0.15)",
                border: `1px solid ${isUnlocked ? palette.mint : palette.deepViolet}`,
                borderRadius: 10,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  filter: isUnlocked ? "none" : "grayscale(1) brightness(0.35)",
                  opacity: isUnlocked ? 1 : 0.6,
                }}
              >
                {STICKER_GLYPH[sticker.icon] ?? "❔"}
              </div>
              <strong style={{ fontSize: 13 }}>{isUnlocked ? sticker.name : "???"}</strong>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.7, lineHeight: 1.4 }}>{sticker.unlock}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
