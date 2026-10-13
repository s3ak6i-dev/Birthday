// S34 Stats and scoreboard (v1.5, masterdoc.md section 2.2/2.6). "Doctor vs
// Engineer" scoreboard: lifetime wins/losses per player per game, current
// streak, and a champion banner. Per-game history / trophies beyond that
// are out of scope for this pass - see TODO.md.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { palette } from "@ward-games/ui";
import { GAME_META } from "../lib/game-meta";
import { fetchScoreboard, type ScoreboardRow } from "../lib/progress";
import { useProfiles } from "../lib/use-profiles";

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
  const champion = profiles
    .map((p) => ({ ...p, wins: totalWins[p.user_id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins)[0];
  const championIsTie =
    profiles.length === 2 && (totalWins[profiles[0]!.user_id] ?? 0) === (totalWins[profiles[1]!.user_id] ?? 0);

  return (
    <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
      <p>
        <Link to="/" style={{ color: palette.white }}>
          ← Back to the Lounge
        </Link>
      </p>
      <h1 style={{ margin: "8px 0 4px" }}>Doctor vs Engineer</h1>
      <p style={{ margin: "0 0 20px", opacity: 0.75, fontSize: 13 }}>Lifetime record across every live game.</p>

      {!loading && champion && !championIsTie && (totalWins[champion.user_id] ?? 0) > 0 && (
        <div
          style={{
            display: "inline-block",
            padding: "8px 16px",
            background: palette.amethyst,
            border: `2px solid ${palette.ink}`,
            borderRadius: 8,
            marginBottom: 20,
            fontWeight: 700,
          }}
        >
          🏆 {champion.display_name} is ahead, {totalWins[champion.user_id]} total wins
        </div>
      )}
      {!loading && championIsTie && profiles.length === 2 && (
        <div style={{ marginBottom: 20, opacity: 0.8, fontSize: 14 }}>It's currently tied - next win takes it.</div>
      )}

      <div style={{ maxWidth: 720, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `1px solid ${palette.deepViolet}` }}>
              <th style={{ padding: "8px 10px" }}>Game</th>
              {profiles.map((p) => (
                <th key={p.user_id} style={{ padding: "8px 10px" }}>
                  {p.display_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GAME_META.filter((g) => g.live).map((game) => (
              <tr key={game.id} style={{ borderBottom: `1px solid rgba(114,81,181,0.4)` }}>
                <td style={{ padding: "8px 10px" }}>{game.name}</td>
                {profiles.map((p) => {
                  const row = rows?.find((r) => r.user_id === p.user_id && r.game === game.id);
                  return (
                    <td key={p.user_id} style={{ padding: "8px 10px" }}>
                      {loading
                        ? "…"
                        : row
                          ? `${row.wins}W - ${row.losses}L${row.current_streak > 1 ? ` (streak ${row.current_streak})` : ""}`
                          : "0W - 0L"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && (rows?.length ?? 0) === 0 && (
        <p style={{ marginTop: 20, fontSize: 13, opacity: 0.7, maxWidth: 480 }}>
          Nothing recorded yet - this fills in as real-room games actually finish. Only Guess the Diagnosis currently
          reports results here (the other two live games aren't wired to the real rooms layer yet, TODO.md).
        </p>
      )}
    </main>
  );
}
