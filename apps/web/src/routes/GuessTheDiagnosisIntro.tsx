// S06 Game intro card for Guess the Diagnosis specifically. See
// masterdoc.md section 2.2 (screen inventory) and section 3.1 (FR-30..39).
//
// The other four games are still engine stubs with no real board screen
// (TODO.md), so there's nothing game-specific worth building into the
// generic `GameIntro.tsx` for them yet - this got its own route instead of
// overloading that one with a single `game === "guess-the-diagnosis"`
// branch that would only grow messier as more games come online.
//
// No pack/difficulty picker here despite S06's description listing one:
// packages/content's real packs (section 5) are still empty JSON arrays,
// so a picker would have nothing real to pick between. Said so plainly
// instead of shipping a picker that doesn't do anything - swap this note
// for the real picker once there's more than one deck to choose from.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import { ROOM } from "@ward-games/shared";
import { GUESS_THE_DIAGNOSIS_TUTORIAL } from "./guess-the-diagnosis-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { randomRoomCode } from "../lib/room-code";

const RULES = [
  "You and your partner each secretly hold one patient from a 24-card board.",
  "Take turns asking real yes/no questions out loud - the app keeps score, it never answers for you.",
  "Tap a card on your own board to cross it off as you narrow things down (your marks are private).",
  "3 lives each. A wrong Final Guess costs one. Two one-use lifelines: Consult and 2nd Opinion.",
  "First to correctly guess their partner's patient wins the round.",
];

export function GuessTheDiagnosisIntro() {
  const navigate = useNavigate();
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
          backgroundImage: "url(/guess_the_diagnosis_board.png)",
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

        <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "8px 0 4px" }}>Guess the Diagnosis</h1>
        <p style={{ opacity: 0.8, margin: "0 0 20px", fontStyle: "italic" }}>Inspired by Guess Who - clinical edition.</p>

        <ul style={{ margin: "0 0 16px", paddingLeft: 20, display: "grid", gap: 8, fontSize: 15, lineHeight: 1.5 }}>
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

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
          Playing with the starter 24-card deck for now - real content packs are still being written and reviewed
          (masterdoc.md section 5), so there's no pack picker yet.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <PixelButton onClick={() => navigate(`/g/guess-the-diagnosis/${randomRoomCode()}`)}>
            Create room
          </PixelButton>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, ROOM.codeLength))}
            placeholder="Room code"
            style={{ padding: 8, width: 110, textTransform: "uppercase" }}
          />
          <PixelButton
            disabled={joinCode.length !== ROOM.codeLength}
            onClick={() => navigate(`/g/guess-the-diagnosis/${joinCode}`)}
          >
            Join room
          </PixelButton>
          <PixelButton variant="danger" onClick={() => setShowHowToPlay(true)}>
            How to play
          </PixelButton>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, opacity: 0.7 }}>
          Or{" "}
          <button
            onClick={() => navigate("/g/guess-the-diagnosis/play")}
            style={{ background: "none", border: "none", color: palette.white, textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }}
          >
            practice solo on this device
          </button>{" "}
          (pass-and-play, no partner needed).
        </p>
      </div>

      {showHowToPlay && (
        <DialogueScene
          lines={GUESS_THE_DIAGNOSIS_TUTORIAL}
          portraits={GYNA_PORTRAITS}
          onComplete={() => setShowHowToPlay(false)}
          onSkip={() => setShowHowToPlay(false)}
        />
      )}
    </main>
  );
}
