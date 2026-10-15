// Triage Dial board (S13/14/15). See masterdoc.md section 3.2 and screen
// inventory section 2.2.
//
// Same scope note as GuessTheDiagnosisBoard.tsx: the rooms layer doesn't
// dispatch to engines yet (TODO.md M1), so this is a LOCAL pass-and-play
// simulation - a "Viewing as" toggle stands in for two devices. The engine
// (packages/shared) is the real, server-authoritative-ready implementation;
// only the transport is fake here.
//
// Phase UI: "clue" (clue-giver types one line) -> "dial" (the other player
// drags the needle and locks in) -> reveal auto-chains straight into
// "argue" (nothing meaningfully different to show between them - see the
// comment on handleLockIn) where the band/score/reactions sit until either
// player continues to the next round.
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import {
  triageDialEngine,
  PLACEHOLDER_SPECTRUMS,
  type PlayerId,
  type TriageDialState,
} from "@ward-games/shared";
import { TRIAGE_DIAL_TUTORIAL } from "./triage-dial-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { sfxBullseye, sfxError, sfxLockIn, sfxReveal } from "../lib/sfx";

const P1: PlayerId = "p1";
const P2: PlayerId = "p2";
const PLAYER_LABEL: Record<PlayerId, string> = { [P1]: "Player 1", [P2]: "Player 2" };
const REACTIONS = ["👏", "❤️", "💀", "🧠", "😂", "🩺"]; // matches the S14 wireframe's "clap heart skull brain laugh steth"
const SCORE_BAND_LABEL: Record<number, string> = { 4: "Bullseye!", 3: "Close", 2: "Edge", 0: "Miss" };

const TUTORIAL_SEEN_KEY = "ward-games:tutorial-seen:triage-dial";

function dialerOf(state: TriageDialState): PlayerId {
  return state.clueGiver === P1 ? P2 : P1;
}

/** The horizontal spectrum bar - the "dial" in Triage Dial. Drag-to-move
 * when `interactive`; shows the target (as a flag) only when `revealTarget`
 * is true, matching what redact() would actually allow a real dialer to
 * see - the clue-giver's own view passes `revealTarget` unconditionally
 * since they're never blind to their own target (FR-41). */
function SpectrumDial({
  leftLabel,
  rightLabel,
  needlePosition,
  target,
  revealTarget,
  interactive,
  onChange,
}: {
  leftLabel: string;
  rightLabel: string;
  needlePosition: number | null;
  target: number | null;
  revealTarget: boolean;
  interactive: boolean;
  onChange: (position: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function positionFromPointer(e: PointerEvent<HTMLDivElement>): number {
    const rect = trackRef.current!.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  const bands =
    revealTarget && target !== null
      ? [
          { from: target - 35, to: target + 35, color: palette.orchid, angle: 90, size: 10 }, // edge
          { from: target - 20, to: target + 20, color: palette.butter, angle: -45, size: 8 }, // close
          { from: target - 10, to: target + 10, color: palette.mint, angle: 45, size: 6 }, // bullseye
        ]
      : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, opacity: 0.9 }}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          if (!interactive) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          onChange(positionFromPointer(e));
        }}
        onPointerMove={(e) => {
          if (!interactive || e.buttons !== 1) return;
          onChange(positionFromPointer(e));
        }}
        style={{
          position: "relative",
          height: 40,
          background: palette.lavender,
          borderRadius: 20,
          border: `2px solid ${palette.ink}`,
          cursor: interactive ? "pointer" : "default",
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        {bands.map((b, i) => {
          const from = Math.max(0, b.from);
          const to = Math.min(100, b.to);
          if (to <= from) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${from}%`,
                width: `${to - from}%`,
                background: `repeating-linear-gradient(${b.angle}deg, ${b.color}99, ${b.color}99 ${b.size}px, transparent ${b.size}px, transparent ${b.size * 2}px)`,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {revealTarget && target !== null && (
          <div
            title="Target"
            style={{
              position: "absolute",
              left: `calc(${target}% - 2px)`,
              top: -4,
              bottom: -4,
              width: 4,
              background: palette.coral,
              border: `1px solid ${palette.ink}`,
              pointerEvents: "none",
            }}
          />
        )}

        {needlePosition !== null && (
          <div
            title="Needle"
            style={{
              position: "absolute",
              left: `calc(${needlePosition}% - 9px)`,
              top: "50%",
              transform: "translateY(-50%)",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: palette.white,
              border: `3px solid ${palette.ink}`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

export function TriageDialBoard() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "versus" ? "versus" : "coop";

  const [state, setState] = useState<TriageDialState>(() =>
    triageDialEngine.init([P1, P2], { deck: PLACEHOLDER_SPECTRUMS, mode })
  );
  const [viewingPlayer, setViewingPlayer] = useState<PlayerId>(P1);
  const [clueDraft, setClueDraft] = useState("");
  const [taunt, setTaunt] = useState("");
  const [reactionPulse, setReactionPulse] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return localStorage.getItem(TUTORIAL_SEEN_KEY) !== "1";
    } catch {
      return true; // private browsing / storage blocked - just show it, no harm skippable
    }
  });

  function dismissTutorial() {
    setShowTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    } catch {
      // per artifact/browser-storage guidance: never let a storage failure break the page
    }
  }

  const view = useMemo(() => triageDialEngine.redact(state, viewingPlayer), [state, viewingPlayer]);
  const dialer = dialerOf(state);
  const isClueGiver = viewingPlayer === state.clueGiver;
  const isDialer = viewingPlayer === dialer;
  const currentRound = view.rounds[state.round - 1]!;

  function dispatch(action: Parameters<typeof triageDialEngine.reduce>[1], actingPlayer: PlayerId) {
    setState((s) => triageDialEngine.reduce(s, action, actingPlayer));
  }

  function handleLockIn() {
    sfxLockIn();
    // Reveal is a near-instant transitional phase with nothing distinct to
    // show on its own (see the file header comment) - chain straight into
    // argue so the UI only ever has to render one post-lock state.
    setState((s) => {
      const afterLock = triageDialEngine.reduce(s, { type: "lockIn" }, dialerOf(s));
      return triageDialEngine.reduce(afterLock, { type: "advanceRound" }, dialerOf(afterLock));
    });
  }

  // The reveal/score sound, played once the engine actually computes a
  // score - not inline in handleLockIn above, since that only kicks off
  // the state update and doesn't know the result yet. Guarded per-round
  // (not just "score went from null to non-null") so it can't re-fire if
  // a re-render happens to read the same round's already-set score again.
  const soundedRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (currentRound.score === null || soundedRoundRef.current === state.round) return;
    soundedRoundRef.current = state.round;
    if (currentRound.score === 4) sfxBullseye();
    else if (currentRound.score === 0) sfxError();
    else sfxReveal();
  }, [currentRound.score, state.round]);

  function handleContinue() {
    dispatch({ type: "advanceRound" }, viewingPlayer);
    setTaunt("");
    setReactionPulse(null);
  }

  if (showTutorial) {
    return (
      <DialogueScene
        lines={TRIAGE_DIAL_TUTORIAL}
        portraits={GYNA_PORTRAITS}
        onComplete={dismissTutorial}
        onSkip={dismissTutorial}
      />
    );
  }

  if (state.phase === "done") {
    const winnerText =
      state.mode === "coop"
        ? `Team score: ${state.scores[P1]} points over 8 rounds.`
        : state.scores[P1] === state.scores[P2]
          ? "Somehow still tied - go again?"
          : `${PLAYER_LABEL[state.scores[P1]! > state.scores[P2]! ? P1 : P2]} wins, ${Math.max(state.scores[P1]!, state.scores[P2]!)} to ${Math.min(state.scores[P1]!, state.scores[P2]!)}.`;
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>
        <h1>Round complete</h1>
        <p>{winnerText}</p>
        <PixelButton
          onClick={() => setState(triageDialEngine.init([P1, P2], { deck: PLACEHOLDER_SPECTRUMS, mode: state.mode }))}
        >
          Rematch
        </PixelButton>
      </main>
    );
  }

  return (
    <main style={{ position: "relative", minHeight: "100vh", color: palette.white, padding: 16 }}>
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
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,31,0.6)", zIndex: 0 }} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          paddingBottom: 10,
          borderBottom: `1px solid ${palette.deepViolet}`,
          marginBottom: 16,
        }}
      >
        <Link to="/" style={{ color: palette.white }}>
          ← Lounge
        </Link>
        <strong>Viewing as:</strong>
        {([P1, P2] as const).map((p) => (
          <PixelButton key={p} variant={viewingPlayer === p ? "primary" : "danger"} onClick={() => setViewingPlayer(p)}>
            {PLAYER_LABEL[p]}
          </PixelButton>
        ))}
        <span style={{ opacity: 0.7, fontSize: 13 }}>(stand-in for two devices until rooms/M1)</span>
        <PixelButton onClick={() => setShowTutorial(true)}>How to play</PixelButton>
        <span style={{ marginLeft: "auto" }}>
          Round {state.round} / 8 · {state.mode === "coop" ? "Co-op" : "Versus"} · Score{" "}
          {state.mode === "coop" ? state.scores[P1] : `${state.scores[P1]} - ${state.scores[P2]}`}
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          {state.clueGiver === viewingPlayer ? "You are giving the clue this round." : "You are dragging the needle this round."}
        </p>

        <SpectrumDial
          leftLabel={currentRound.spectrum.leftLabel}
          rightLabel={currentRound.spectrum.rightLabel}
          needlePosition={currentRound.needlePosition}
          target={currentRound.target}
          revealTarget={currentRound.target !== null}
          interactive={state.phase === "dial" && isDialer}
          onChange={(position) => dispatch({ type: "moveNeedle", position }, dialer)}
        />

        {state.phase === "clue" && isClueGiver && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <input
              value={clueDraft}
              onChange={(e) => setClueDraft(e.target.value)}
              placeholder="Give a one-line clue..."
              style={{ flex: 1, padding: 8, borderRadius: 6 }}
            />
            <PixelButton
              disabled={clueDraft.trim().length === 0}
              onClick={() => {
                dispatch({ type: "submitClue", clue: clueDraft.trim() }, state.clueGiver);
                setClueDraft("");
              }}
            >
              Lock in clue
            </PixelButton>
          </div>
        )}
        {state.phase === "clue" && !isClueGiver && (
          <p style={{ marginTop: 16, opacity: 0.8 }}>Waiting for {PLAYER_LABEL[state.clueGiver]} to give a clue...</p>
        )}

        {state.phase !== "clue" && currentRound.clue && (
          <p style={{ marginTop: 16, fontStyle: "italic" }}>
            {PLAYER_LABEL[state.clueGiver]} says: "{currentRound.clue}"
          </p>
        )}

        {state.phase === "dial" && isDialer && (
          <PixelButton
            style={{ marginTop: 12 }}
            disabled={currentRound.needlePosition === null}
            onClick={handleLockIn}
          >
            Lock In
          </PixelButton>
        )}
        {state.phase === "dial" && !isDialer && (
          <p style={{ marginTop: 12, opacity: 0.8 }}>Watching {PLAYER_LABEL[dialer]} drag the needle live...</p>
        )}

        {(state.phase === "reveal" || state.phase === "argue") && currentRound.score !== null && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: palette.violet,
              border: `3px solid ${palette.ink}`,
              borderRadius: 8,
            }}
          >
            <p style={{ margin: "0 0 8px", fontSize: 20 }}>
              {SCORE_BAND_LABEL[currentRound.score]} · +{currentRound.score} points
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setReactionPulse(emoji)}
                  style={{
                    fontSize: 22,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    transform: reactionPulse === emoji ? "scale(1.3)" : "scale(1)",
                    transition: "transform 150ms ease",
                  }}
                  aria-label={`react ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <input
              value={taunt}
              onChange={(e) => setTaunt(e.target.value)}
              placeholder="Say something (just local flavor for now, not synced)..."
              style={{ width: "100%", padding: 8, borderRadius: 6, marginBottom: 10 }}
            />

            <PixelButton onClick={handleContinue}>
              {state.round >= 8 ? "See results" : "Next round"}
            </PixelButton>
          </div>
        )}
      </div>
    </main>
  );
}
