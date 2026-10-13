// S05 Games list. See masterdoc.md section 2.2: "Plain list of the five
// games with status, best score, and Play buttons - the non-pixel-hunt
// route" - this exists specifically so finding a game never depends on
// spotting the right piece of furniture in the Lounge (FR-11).
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PixelButton, palette } from "@ward-games/ui";
import { GAME_META } from "../lib/game-meta";
import { fetchScoreboard, type ScoreboardRow } from "../lib/progress";
import { useProfiles } from "../lib/use-profiles";

export function GamesList() {
  const navigate = useNavigate();
  const { byId: profileNames } = useProfiles();
  const [rows, setRows] = useState<ScoreboardRow[] | null>(null);

  useEffect(() => {
    fetchScoreboard().then(setRows);
  }, []);

  return (
    <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
      <p>
        <Link to="/" style={{ color: palette.white }}>
          ← Back to the Lounge
        </Link>
      </p>
      <h1 style={{ margin: "8px 0 20px" }}>Games</h1>

      <div style={{ display: "grid", gap: 14, maxWidth: 720 }}>
        {GAME_META.map((game) => {
          const gameRows = rows?.filter((r) => r.game === game.id) ?? [];
          return (
            <div
              key={game.id}
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                padding: "14px 18px",
                background: "rgba(129,90,192,0.25)",
                border: `1px solid ${palette.deepViolet}`,
                borderRadius: 10,
                opacity: game.live ? 1 : 0.65,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 17 }}>{game.name}</strong>
                  {!game.live && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: palette.nightViolet,
                        borderRadius: 999,
                      }}
                    >
                      Coming soon
                    </span>
                  )}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.8 }}>{game.tagline}</p>
                {game.live && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.75 }}>
                    {rows === null
                      ? "Loading record..."
                      : gameRows.length === 0
                        ? "No games recorded yet"
                        : gameRows
                            .map((r) => `${profileNames[r.user_id] ?? "?"}: ${r.wins}W-${r.losses}L`)
                            .join("  •  ")}
                  </p>
                )}
              </div>
              <PixelButton disabled={!game.live} onClick={() => navigate(game.introRoute)}>
                {game.live ? "Play" : "Locked"}
              </PixelButton>
            </div>
          );
        })}
      </div>
    </main>
  );
}
