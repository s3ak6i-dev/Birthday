// S06 Game intro card - generic fallback for games that don't have a real
// board yet (masterdoc.md section 2.2). Guess the Diagnosis and Triage
// Dial have outgrown this and moved to their own routes
// (GuessTheDiagnosisIntro.tsx, TriageDialIntro.tsx); the remaining three
// games are still engine stubs (TODO.md), so there's nothing game-specific
// to build here for them yet.
// TODO (M2+): rules summary, pack/difficulty pickers, Create Room / Join
// Room, How to play link, as each of these games gets built out for real.
import { useParams, Link } from "react-router-dom";
import type { GameId } from "@ward-games/shared";
import { GAME_META_BY_ID } from "../lib/game-meta";

export function GameIntro() {
  const { game } = useParams<{ game: string }>();
  const meta = game ? GAME_META_BY_ID[game as GameId] : undefined;

  return (
    <main style={{ padding: 24 }}>
      <p>
        <Link to="/">← Back to the Lounge</Link>
      </p>
      <h1>{meta?.name ?? "Unknown game"}</h1>
      {meta && <p style={{ opacity: 0.8 }}>{meta.tagline}</p>}
      <p>Room creation and rules go here next (section 2.2, screen S06) - still a v1.5/v2 game, no board yet.</p>
    </main>
  );
}
