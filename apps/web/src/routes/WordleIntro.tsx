// S16 Medical Wordle mode select. Mirrors GuessTheDiagnosisIntro.tsx /
// TriageDialIntro.tsx's reasoning - its own route instead of a branch in
// the generic GameIntro.tsx. See masterdoc.md section 2.2 and section 3.3
// (FR-50..59).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import { ROOM, type WordleMode } from "@ward-games/shared";
import { WORDLE_TUTORIAL } from "./wordle-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { randomRoomCode } from "../lib/room-code";

const MODES: { id: WordleMode; label: string; blurb: string }[] = [
  { id: "daily", label: "Daily", blurb: "One shared word a day. Solve it on your own, compare once you're both done." },
  { id: "race", label: "Race", blurb: "Same word, live, at the same time. First to solve (or closest after 6 rows) wins." },
  { id: "duel", label: "Duel", blurb: "You each set a secret word for the other to solve - with an optional hint." },
];

const RULES = [
  "Standard Wordle rules: 6 guesses, 5 letters, green for the right spot, yellow for the right letter wrong spot.",
  "Feedback tiles carry a shape too (check/tilde/dot), not just color, so it still works if you can't tell green from yellow.",
  "A hint unlocks after guess 4 - costs a little on Daily/Race, free on Duel if the setter allowed it.",
];

export function WordleIntro() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<WordleMode>("daily");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        color: palette.white,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/wordle_board.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,31,0.68)", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "min(92vw, 640px)" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>

        <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "8px 0 4px" }}>Medical Wordle</h1>
        <p style={{ opacity: 0.8, margin: "0 0 20px", fontStyle: "italic" }}>Inspired by Wordle and Meddle.</p>

        <ul style={{ margin: "0 0 20px", paddingLeft: 20, display: "grid", gap: 8, fontSize: 15, lineHeight: 1.5 }}>
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          <strong style={{ fontSize: 14 }}>Mode</strong>
          <div style={{ display: "grid", gap: 8 }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  background: mode === m.id ? palette.violet : "rgba(20,16,31,0.55)",
                  border: `2px solid ${mode === m.id ? palette.white : palette.deepViolet}`,
                  borderRadius: 8,
                  color: palette.white,
                  cursor: "pointer",
                }}
              >
                <strong>{m.label}</strong>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{m.blurb}</div>
              </button>
            ))}
          </div>
        </div>

        <p
          style={{
            margin: "0 0 24px",
            padding: "10px 14px",
            background: "rgba(20,16,31,0.55)",
            border: `1px solid ${palette.deepViolet}`,
            borderRadius: 8,
            fontSize: 13,
            opacity: 0.85,
          }}
        >
          Playing with the starter word pool for now, pooled across all packs - real content packs and per-pack
          picking are still being written and reviewed (masterdoc.md section 5).
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <PixelButton onClick={() => navigate(`/g/wordle/${randomRoomCode()}?mode=${mode}`)}>Create room</PixelButton>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, ROOM.codeLength))}
            placeholder="Room code"
            style={{ padding: 8, width: 110, textTransform: "uppercase" }}
          />
          <PixelButton disabled={joinCode.length !== ROOM.codeLength} onClick={() => navigate(`/g/wordle/${joinCode}`)}>
            Join room
          </PixelButton>
          <PixelButton variant="danger" onClick={() => setShowHowToPlay(true)}>
            How to play
          </PixelButton>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, opacity: 0.7 }}>
          Or{" "}
          <button
            onClick={() => navigate(`/wordle/play?mode=${mode}`)}
            style={{ background: "none", border: "none", color: palette.white, textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }}
          >
            practice solo on this device
          </button>{" "}
          (pass-and-play, no partner needed).
        </p>
      </div>

      {showHowToPlay && (
        <DialogueScene
          lines={WORDLE_TUTORIAL}
          portraits={GYNA_PORTRAITS}
          onComplete={() => setShowHowToPlay(false)}
          onSkip={() => setShowHowToPlay(false)}
        />
      )}
    </main>
  );
}
