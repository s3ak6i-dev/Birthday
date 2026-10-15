// S34 Stats and scoreboard (v1.5, masterdoc.md section 2.2/2.6). "Doctor vs
// Engineer" scoreboard: lifetime wins/losses per player per game, current
// streak, and a champion banner. Per-game history / trophies beyond that
// are out of scope for this pass - see TODO.md.
//
// Visual pass notes: the "pip row" under each player's W-L in the game-by-
// game table is a literal, data-driven encoding (filled = a win, empty =
// a loss, for that specific matchup) capped at a sane width - not a "last
// N results" form guide, since the scoreboard table only stores aggregate
// wins/losses/streak, not an ordered per-game log. A form guide would be
// fabricated data; this isn't.
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ControllerIcon, CrownIcon, HandshakeIcon, TrophyIcon, palette } from "@ward-games/ui";
import { CHARACTERS } from "../lib/characters";
import { GAME_META } from "../lib/game-meta";
import { fetchScoreboard, type ScoreboardRow } from "../lib/progress";
import { useProfiles, type ProfileRow } from "../lib/use-profiles";

// The two accounts' real roles (not arbitrary - Lakshmi is the MBBS
// student, Surya is the developer), so "Doctor vs Engineer" means
// something instead of being a coin-flip label.
function roleFor(displayName: string): string {
  return displayName === "Lakshmi" ? "The Doctor" : displayName === "Surya" ? "The Engineer" : "Player";
}

function bustFor(displayName: string): string | undefined {
  return CHARACTERS.find((c) => c.label === displayName)?.bust;
}

const PLAYER_TONE = [palette.deepAmethyst, palette.coral];

function PipRow({ wins, losses, tone }: { wins: number; losses: number; tone: string }) {
  const total = wins + losses;
  const width = Math.max(total, 4);
  const pips = Array.from({ length: width }, (_, i) => i < wins);
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {pips.map((filled, i) => (
        <span
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: filled ? tone : "transparent",
            border: `1px solid ${filled ? tone : "rgba(255,255,255,0.25)"}`,
          }}
        />
      ))}
    </div>
  );
}

export function Stats() {
  const { profiles, loading: profilesLoading } = useProfiles();
  const [rows, setRows] = useState<ScoreboardRow[] | null>(null);

  useEffect(() => {
    fetchScoreboard().then(setRows);
  }, []);

  const loading = rows === null || profilesLoading;

  const totalWins: Record<string, number> = {};
  for (const r of rows ?? []) {
    totalWins[r.user_id] = (totalWins[r.user_id] ?? 0) + r.wins;
  }
  // Stable left/right order: Lakshmi (the Doctor) first, matching the page
  // title's own word order, rather than whatever order the DB happened to
  // return rows in.
  const orderedProfiles: ProfileRow[] = [...profiles].sort((a, b) => {
    const rank = (n: string) => (n === "Lakshmi" ? 0 : n === "Surya" ? 1 : 2);
    return rank(a.display_name) - rank(b.display_name);
  });

  const leaderId = orderedProfiles
    .map((p) => ({ id: p.user_id, wins: totalWins[p.user_id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins)[0]?.id;
  const isTie =
    orderedProfiles.length === 2 &&
    (totalWins[orderedProfiles[0]!.user_id] ?? 0) === (totalWins[orderedProfiles[1]!.user_id] ?? 0);

  const totalGamesPlayed = (rows ?? []).reduce((sum, r) => sum + r.wins, 0);

  return (
    <main style={{ padding: "28px 24px 56px", color: palette.white, background: palette.ink, minHeight: "100vh" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <p>
          <Link to="/" style={{ color: palette.white, opacity: 0.85 }}>
            ← Back to the Lounge
          </Link>
        </p>

        <header style={{ margin: "10px 0 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(30px, 6vw, 42px)" }}>Doctor vs Engineer</h1>
            <ControllerIcon tone="amethyst" size={32} />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.75 }}>Lifetime record across every live game.</p>
        </header>

        {/* Rivalry scoreboard */}
        {!loading && orderedProfiles.length === 2 && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
            {orderedProfiles.map((p, i) => {
              const wins = totalWins[p.user_id] ?? 0;
              const leading = !isTie && p.user_id === leaderId && wins > 0;
              return (
                <div
                  key={p.user_id}
                  style={{
                    flex: "1 1 280px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    borderRadius: 12,
                    background: leading ? `rgba(160,108,213,0.16)` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${leading ? palette.deepAmethyst : palette.deepViolet}`,
                  }}
                >
                  {bustFor(p.display_name) && (
                    <img
                      src={bustFor(p.display_name)}
                      alt=""
                      style={{ width: 56, height: 56, objectFit: "contain", flex: "0 0 auto" }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {leading && <CrownIcon size={16} />}
                      <strong style={{ fontSize: 17 }}>{p.display_name}</strong>
                    </div>
                    <p style={{ margin: "1px 0 6px", fontSize: 12, opacity: 0.7 }}>{roleFor(p.display_name)}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <TrophyIcon tone={i === 0 ? "amethyst" : "lilac"} size={16} />
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{wins}</span>
                      <span style={{ fontSize: 11, opacity: 0.65 }}>Total Wins</span>
                      {leading && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 999,
                            background: palette.deepAmethyst,
                          }}
                        >
                          Leading
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loading && isTie && orderedProfiles.length === 2 && (
          <p style={{ margin: "-10px 0 20px", fontSize: 13, opacity: 0.75 }}>It's currently tied - next win takes it.</p>
        )}

        {/* Summary cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 26,
          }}
        >
          <SummaryCard icon={<ControllerIcon tone="lilac" size={18} />} label="Total Games Played" value={totalGamesPlayed} />
          {orderedProfiles.map((p, i) => (
            <SummaryCard
              key={p.user_id}
              icon={<CrownIcon tone={i === 0 ? "amethyst" : "lilac"} size={18} />}
              label={`${p.display_name} Wins`}
              value={totalWins[p.user_id] ?? 0}
            />
          ))}
          <SummaryCard icon={<HandshakeIcon tone="lilac" size={18} />} label="Draws" value={0} />
        </div>

        {/* Game by game table */}
        <div
          style={{
            border: `1px solid ${palette.deepViolet}`,
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              borderBottom: `1px solid ${palette.deepViolet}`,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span style={{ display: "inline-flex", width: 16, height: 16 }}>
              <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
                <path d="M4 20V10M11 20V4M18 20v-7M2 20h20" fill="none" stroke={palette.lilacMist} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            Game by Game Record
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.65 }}>
                  <th style={{ padding: "10px 16px", fontWeight: 500 }}>Game</th>
                  {orderedProfiles.map((p) => (
                    <th key={p.user_id} style={{ padding: "10px 16px", fontWeight: 500 }}>
                      {p.display_name}
                    </th>
                  ))}
                  <th style={{ padding: "10px 16px", fontWeight: 500 }}>Winner</th>
                </tr>
              </thead>
              <tbody>
                {GAME_META.filter((g) => g.live).map((game) => {
                  const perPlayer = orderedProfiles.map((p) => rows?.find((r) => r.user_id === p.user_id && r.game === game.id));
                  const winnerIdx =
                    perPlayer[0] && perPlayer[1] && (perPlayer[0].wins ?? 0) !== (perPlayer[1].wins ?? 0)
                      ? (perPlayer[0].wins ?? 0) > (perPlayer[1]!.wins ?? 0)
                        ? 0
                        : 1
                      : null;
                  return (
                    <tr key={game.id} style={{ borderTop: `1px solid rgba(114,81,181,0.3)` }}>
                      <td style={{ padding: "12px 16px" }}>{game.name}</td>
                      {orderedProfiles.map((p, i) => {
                        const row = perPlayer[i];
                        const wins = row?.wins ?? 0;
                        const losses = row?.losses ?? 0;
                        return (
                          <td key={p.user_id} style={{ padding: "12px 16px" }}>
                            <div style={{ marginBottom: 5 }}>
                              {loading ? "…" : `${wins}W - ${losses}L`}
                              {!!row?.current_streak && row.current_streak > 1 && (
                                <span style={{ opacity: 0.6, fontSize: 11 }}> (streak {row.current_streak})</span>
                              )}
                            </div>
                            <PipRow wins={wins} losses={losses} tone={PLAYER_TONE[i]!} />
                          </td>
                        );
                      })}
                      <td style={{ padding: "12px 16px" }}>
                        {winnerIdx === null ? (
                          <span
                            style={{
                              fontSize: 11,
                              padding: "3px 9px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.06)",
                              opacity: 0.7,
                            }}
                          >
                            No winner yet
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 11,
                              padding: "3px 9px",
                              borderRadius: 999,
                              background: palette.deepAmethyst,
                            }}
                          >
                            <CrownIcon tone="white" size={12} /> {orderedProfiles[winnerIdx]!.display_name}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && (rows?.length ?? 0) === 0 && (
          <p style={{ marginTop: 20, fontSize: 13, opacity: 0.7, maxWidth: 480 }}>
            Nothing recorded yet - this fills in as real-room games actually finish. Only Guess the Diagnosis currently
            reports results here (the other two live games aren't wired to the real rooms layer yet, TODO.md).
          </p>
        )}
      </div>
    </main>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        border: `1px solid ${palette.deepViolet}`,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{label}</div>
    </div>
  );
}
