// S05 Games list. See masterdoc.md section 2.2: "Plain list of the five
// games with status, best score, and Play buttons - the non-pixel-hunt
// route" - this exists specifically so finding a game never depends on
// spotting the right piece of furniture in the Lounge (FR-11).
//
// Visual pass: polished card layout, per-game icon tiles, and a richer
// meta row (players / category / record), without any new art generation
// - every icon here is a small inline SVG (packages/ui/stat-icons.tsx),
// and the "featured" treatment on Guess the Diagnosis is a restrained
// border/glow, never a fabricated "Popular"/"Recommended" label, since
// nothing in the real data backs that claim.
import { useEffect, useState, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertMonitorIcon,
  BoltIcon,
  ClockIcon,
  ControllerIcon,
  LockIcon,
  MagnifierIcon,
  PeopleIcon,
  PlayChevronIcon,
  PulseLineIcon,
  StatsIcon,
  StethoscopeIcon,
  palette,
} from "@ward-games/ui";
import type { GameId } from "@ward-games/shared";
import { GAME_META, type GameMeta } from "../lib/game-meta";
import { fetchScoreboard, type ScoreboardRow } from "../lib/progress";
import { useProfiles } from "../lib/use-profiles";

const CATEGORY_ICON: Record<GameId, (props: { tone?: "lilac" | "muted" }) => ReactElement> = {
  "guess-the-diagnosis": StethoscopeIcon,
  "triage-dial": AlertMonitorIcon,
  wordle: StethoscopeIcon,
  "code-red": BoltIcon,
  "case-files": MagnifierIcon,
};

function GameTile({ game }: { game: GameMeta }) {
  const bg = game.live
    ? `linear-gradient(155deg, rgba(160,108,213,0.35), rgba(20,16,31,0.6))`
    : `repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 8px, rgba(255,255,255,0.06) 8px 16px)`;

  const tileStyle = {
    width: 68,
    height: 68,
    flex: "0 0 auto",
    borderRadius: 12,
    border: `1px solid ${game.live ? palette.deepAmethyst : palette.deepViolet}`,
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  if (game.id === "wordle") {
    // A tiny Wordle-feedback-style tile - correct/present/absent colors,
    // the game's own real vocabulary, not a generic icon substitute.
    const letters: Array<{ ch: string; bg: string }> = [
      { ch: "M", bg: palette.mint },
      { ch: "D", bg: palette.butter },
      { ch: "X", bg: "rgba(255,255,255,0.12)" },
    ];
    return (
      <div style={tileStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 3 }}>
          {letters.map((l, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                background: l.bg,
                color: palette.ink,
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 3,
                gridColumn: i === 2 ? "1 / span 2" : undefined,
              }}
            >
              {l.ch}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (game.id === "code-red") {
    return (
      <div style={tileStyle}>
        <BoltIcon tone={game.live ? "amethyst" : "muted"} size={30} />
      </div>
    );
  }
  if (game.id === "case-files") {
    return (
      <div style={tileStyle}>
        <MagnifierIcon tone={game.live ? "amethyst" : "muted"} size={30} />
      </div>
    );
  }
  if (game.id === "triage-dial") {
    return (
      <div style={tileStyle}>
        <AlertMonitorIcon tone="amethyst" size={32} />
      </div>
    );
  }
  return (
    <div style={tileStyle}>
      <StethoscopeIcon tone="amethyst" size={32} />
    </div>
  );
}

export function GamesList() {
  const navigate = useNavigate();
  const { byId: profileNames } = useProfiles();
  const [rows, setRows] = useState<ScoreboardRow[] | null>(null);

  useEffect(() => {
    fetchScoreboard().then(setRows);
  }, []);

  return (
    <main style={{ padding: "28px 24px 48px", color: palette.white, background: palette.ink, minHeight: "100vh" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <p>
          <Link to="/" style={{ color: palette.white, opacity: 0.85 }}>
            ← Back to the Lounge
          </Link>
        </p>

        <header style={{ margin: "10px 0 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(32px, 6vw, 44px)" }}>Games</h1>
            <ControllerIcon tone="amethyst" size={36} />
            <PulseLineIcon size={60} style={{ opacity: 0.8 }} />
          </div>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: palette.lavender,
            }}
          >
            Play · Learn · Compete · Together
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 14, opacity: 0.75, maxWidth: 520 }}>
            Choose your next challenge. Diagnose, compete, and outsmart each other.
          </p>
        </header>

        <div style={{ display: "grid", gap: 14 }}>
          {GAME_META.map((game, i) => {
            const gameRows = rows?.filter((r) => r.game === game.id) ?? [];
            const featured = i === 0; // Guess the Diagnosis - the one real, fully-built game so far
            const CategoryIcon = CATEGORY_ICON[game.id];
            return (
              <div
                key={game.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 18,
                  alignItems: "center",
                  padding: "16px 20px",
                  background: featured ? "rgba(160,108,213,0.14)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${featured ? palette.deepAmethyst : palette.deepViolet}`,
                  borderRadius: 12,
                  boxShadow: featured ? `0 0 0 1px rgba(160,108,213,0.25), 0 8px 24px rgba(160,108,213,0.12)` : "none",
                  opacity: game.live ? 1 : 0.7,
                }}
              >
                <GameTile game={game} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 18 }}>{game.name}</strong>
                    {!game.live && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 9px",
                          background: palette.nightViolet,
                          color: palette.lilacMist,
                          borderRadius: 999,
                        }}
                      >
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.8, maxWidth: 480 }}>{game.tagline}</p>

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      marginTop: 9,
                      fontSize: 12,
                      color: palette.lilacMist,
                      opacity: 0.85,
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <PeopleIcon tone="lilac" size={15} /> {game.players}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <CategoryIcon tone={game.live ? "lilac" : "muted"} /> {game.category}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {!game.live ? (
                        <>
                          <LockIcon size={14} /> Coming soon
                        </>
                      ) : rows === null ? (
                        <>
                          <ClockIcon size={14} /> Loading record...
                        </>
                      ) : gameRows.length === 0 ? (
                        <>
                          <ClockIcon size={14} /> No games recorded yet
                        </>
                      ) : (
                        <>
                          <span style={{ display: "inline-block", width: 14, height: 14 }}>
                            <StatsIcon />
                          </span>{" "}
                          {gameRows.map((r) => `${profileNames[r.user_id] ?? "?"}: ${r.wins}W-${r.losses}L`).join(" • ")}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!game.live}
                  onClick={() => navigate(game.introRoute)}
                  style={{
                    flex: "0 0 auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "11px 18px",
                    minHeight: 44,
                    borderRadius: 8,
                    border: "none",
                    fontFamily: "'Pixelify Sans', monospace",
                    fontSize: 14,
                    color: game.live ? palette.white : "rgba(255,255,255,0.5)",
                    background: game.live
                      ? `linear-gradient(180deg, ${palette.amethyst}, ${palette.deepViolet})`
                      : "rgba(255,255,255,0.06)",
                    cursor: game.live ? "pointer" : "not-allowed",
                  }}
                >
                  {game.live ? (
                    <>
                      Play <PlayChevronIcon size={14} />
                    </>
                  ) : (
                    <>
                      <LockIcon size={14} /> Locked
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
