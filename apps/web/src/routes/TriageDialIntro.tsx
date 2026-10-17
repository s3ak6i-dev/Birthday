// S06 Game intro card for Triage Dial specifically - mirrors
// GuessTheDiagnosisIntro.tsx's reasoning (see that file's header comment
// for why each real game gets its own route instead of a generic one).
// See masterdoc.md section 2.2 and section 3.2 (FR-40..49).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import { ROOM } from "@ward-games/shared";
import { TRIAGE_DIAL_TUTORIAL } from "./triage-dial-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { randomRoomCode } from "../lib/room-code";
import { GYNA_SQUAWK_KEY, GYNA_TYPE_KEY } from "../lib/sfx";

const RULES = [
  "One of you gives the clue, the other drags the needle - roles swap every round.",
  "The clue-giver sees a hidden target on the spectrum and gives one short clue. No numbers.",
  "The dialer drags a needle to where they think the target is and locks it in within 45 seconds.",
  "Closer to the target scores more: bullseye, close, edge, or miss.",
  "8 rounds total. Co-op shares one score; Versus compares separately and replays the last round on a tie.",
];

export function TriageDialIntro() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"coop" | "versus">("coop");
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
          backgroundImage: "url(/triage_dial_board.png)",
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

        <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "8px 0 4px" }}>Triage Dial</h1>
        <p style={{ opacity: 0.8, margin: "0 0 20px", fontStyle: "italic" }}>Inspired by Wavelength.</p>

        <ul style={{ margin: "0 0 20px", paddingLeft: 20, display: "grid", gap: 8, fontSize: 15, lineHeight: 1.5 }}>
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          <strong style={{ fontSize: 14 }}>Mode</strong>
          <div style={{ display: "flex", gap: 12 }}>
            <PixelButton variant={mode === "coop" ? "primary" : "danger"} onClick={() => setMode("coop")}>
              Co-op (shared score)
            </PixelButton>
            <PixelButton variant={mode === "versus" ? "primary" : "danger"} onClick={() => setMode("versus")}>
              Versus (head to head)
            </PixelButton>
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
          Playing with the starter spectrum deck for now - real content packs are still being written and reviewed
          (masterdoc.md section 5), so there's no category picker yet.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <PixelButton onClick={() => navigate(`/g/triage-dial/${randomRoomCode()}?mode=${mode}`)}>
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
            onClick={() => navigate(`/g/triage-dial/${joinCode}`)}
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
            onClick={() => navigate(`/g/triage-dial/play?mode=${mode}`)}
            style={{ background: "none", border: "none", color: palette.white, textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }}
          >
            practice solo on this device
          </button>{" "}
          (pass-and-play, no partner needed).
        </p>
      </div>

      {showHowToPlay && (
        <DialogueScene
          lines={TRIAGE_DIAL_TUTORIAL}
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
