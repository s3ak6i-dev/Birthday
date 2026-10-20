// S06 Game intro card for Code Red specifically - mirrors
// TriageDialIntro.tsx/GuessTheDiagnosisIntro.tsx's reasoning (see those
// files' header comments for why each real game gets its own route
// instead of falling through to the generic GameIntro.tsx stub). See
// masterdoc.md section 2.2 and section 3.4 (FR-60..69).
//
// No "practice solo on this device" link like the other three intros
// have - there's no local pass-and-play sim for this game and never will
// be one (see CodeRedRoomBoard.tsx's own header comment: FR-63's whole
// point is that Bedside and Protocol can't see each other's screen, which
// a single device can't honestly represent). No mode picker either - this
// game only ever has the one Bedside/Protocol split, nothing like Triage
// Dial's coop/versus or Wordle's daily/race/duel.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import { ROOM } from "@ward-games/shared";
import { CODE_RED_TUTORIAL } from "./code-red-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { randomRoomCode } from "../lib/room-code";
import { GYNA_SQUAWK_KEY, GYNA_TYPE_KEY } from "../lib/sfx";

const RULES = [
  "One of you's Bedside, one's Protocol - randomly assigned, swaps if you play again.",
  "Bedside sees live vitals and examines the patient. Protocol has the reference binder - talk it through.",
  "Neither of you can see the other's screen. No peeking - everything happens by voice.",
  "A wrong order costs time, not an instant fail - but three serious slip-ups and it's a code called.",
  "Beat the 5-minute clock for 1 to 3 stars.",
];

export function CodeRedIntro() {
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
          backgroundImage: "url(/code_red_board_bedside.png)",
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

        <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "8px 0 4px" }}>Code Red</h1>
        <p style={{ opacity: 0.8, margin: "0 0 20px", fontStyle: "italic" }}>A split-screen race against the clock.</p>

        <ul style={{ margin: "0 0 20px", paddingLeft: 20, display: "grid", gap: 8, fontSize: 15, lineHeight: 1.5 }}>
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        <p
          style={{
            margin: "0 0 24px",
            padding: "10px 14px",
            background: "rgba(255,122,122,0.12)",
            border: `1px solid ${palette.coral}`,
            borderRadius: 8,
            fontSize: 13,
            opacity: 0.9,
          }}
        >
          <strong>Still in development.</strong> The engine, both roles' screens, and the full flow all work end to
          end - but it's running on one placeholder scenario that hasn't been medically reviewed or sourced yet.
          Treat anything it tells you as a demo, not a real clinical reference.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <PixelButton onClick={() => navigate(`/g/code-red/${randomRoomCode()}`)}>Create room</PixelButton>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, ROOM.codeLength))}
            placeholder="Room code"
            style={{ padding: 8, width: 110, textTransform: "uppercase" }}
          />
          <PixelButton disabled={joinCode.length !== ROOM.codeLength} onClick={() => navigate(`/g/code-red/${joinCode}`)}>
            Join room
          </PixelButton>
          <PixelButton variant="danger" onClick={() => setShowHowToPlay(true)}>
            How to play
          </PixelButton>
        </div>
      </div>

      {showHowToPlay && (
        <DialogueScene
          lines={CODE_RED_TUTORIAL}
          portraits={GYNA_PORTRAITS}
          squawkKey={GYNA_SQUAWK_KEY}
          typeKey={GYNA_TYPE_KEY}
          onComplete={() => setShowHowToPlay(false)}
          onSkip={() => setShowHowToPlay(false)}
        />
      )}
    </main>
  );
}
