// The real, server-authoritative Triage Dial board (S13/14/15), played
// over an actual room (apps/rooms) instead of the local pass-and-play
// simulation in TriageDialBoard.tsx. See masterdoc.md section 3.2 and
// section 4.6 (realtime rooms protocol).
//
// Same shape as GuessTheDiagnosisRoomBoard.tsx: everything here renders
// off `room.gameState`, which the Durable Object has already redacted for
// this exact player (TriageDialRedactedState, target hidden from the
// dialer until reveal, FR-41/48) - no "Viewing as" toggle, this device only
// ever has its own view. Every move goes out as `room.sendAction(...)`.
//
// `lockIn` + `advanceRound` are dispatched back-to-back on Lock In, same
// as the local sim's handleLockIn() - "reveal" has nothing distinct to
// show from "argue" (see the engine's own header comment), so the dialer
// collapses that transition into one click instead of making both players
// sit through an extra no-op screen. The taunt/reaction row the local sim
// had here was explicitly "not synced" flavor text - WaitingRoom's real
// ReactionDock (rendered by the caller) already covers that same FR-23
// beat for real, across every room game, so it isn't duplicated here.
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import type { PlayerId, TriageDialAction, TriageDialRedactedState } from "@ward-games/shared";
import type { RoomHandle } from "../lib/use-room";
import { TRIAGE_DIAL_TUTORIAL } from "./triage-dial-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { recordGameResult, unlockSticker } from "../lib/progress";
import { GYNA_SQUAWK_KEY, GYNA_TYPE_KEY, sfxBullseye, sfxError, sfxLockIn, sfxLose, sfxReveal, sfxStickerUnlock, sfxWin } from "../lib/sfx";

const SCORE_BAND_LABEL: Record<number, string> = { 4: "Bullseye!", 3: "Close", 2: "Edge", 0: "Miss" };
const TUTORIAL_SEEN_KEY = "ward-games:tutorial-seen:triage-dial";

function otherPlayer(players: [PlayerId, PlayerId], player: PlayerId): PlayerId {
  return players[0] === player ? players[1] : players[0];
}

function dialerOf(state: Pick<TriageDialRedactedState, "players" | "clueGiver">): PlayerId {
  return otherPlayer(state.players, state.clueGiver);
}

/** Same dial widget as the local sim's SpectrumDial, not shared (see this
 * file's header) - `revealTarget` here is just "does `target` have a
 * value," since the server already decided that for us via redact(). */
function SpectrumDial({
  leftLabel,
  rightLabel,
  needlePosition,
  target,
  interactive,
  onChange,
}: {
  leftLabel: string;
  rightLabel: string;
  needlePosition: number | null;
  target: number | null;
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
    target !== null
      ? [
          { from: target - 35, to: target + 35, color: palette.orchid, angle: 90, size: 10 },
          { from: target - 20, to: target + 20, color: palette.butter, angle: -45, size: 8 },
          { from: target - 10, to: target + 10, color: palette.mint, angle: 45, size: 6 },
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

        {target !== null && (
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

export function TriageDialRoomBoard({
  room,
  labelFor,
}: {
  room: RoomHandle<unknown>;
  labelFor: (userId: string) => string;
}) {
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return localStorage.getItem(TUTORIAL_SEEN_KEY) !== "1";
    } catch {
      return true;
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

  const view = room.gameState as TriageDialRedactedState | null;

  // Versus mode only (FR-46) - coop shares one running score between both
  // players, so there's no opponent to beat and nothing to record as a
  // win/loss (same reasoning TriageDialBoard.tsx never calls this either,
  // local or real). The engine only ever reaches "done" in versus once the
  // scores are actually unequal (ties replay instead), so whichever side
  // has the higher score here is unambiguous. Guarded by a ref so a
  // reconnect replaying the same terminal state can't double-count it.
  const recordedResultRef = useRef(false);
  useEffect(() => {
    if (!view || view.phase !== "done" || view.mode !== "versus" || recordedResultRef.current) return;
    const selfId = room.selfId;
    if (!selfId) return;
    const partnerId = otherPlayer(view.players, selfId);
    const selfScore = view.scores[selfId] ?? 0;
    const partnerScore = view.scores[partnerId] ?? 0;
    if (selfScore === partnerScore) return; // shouldn't happen once "done" in versus, but never record a false win/loss
    recordedResultRef.current = true;
    const outcome = selfScore > partnerScore ? "win" : "loss";
    recordGameResult(selfId, "triage-dial", outcome).catch(() => {});
    if (outcome === "win") {
      sfxWin();
    } else {
      sfxLose();
      unlockSticker(selfId, 7) // "Minor Setback" - lose any live game
        .then(() => sfxStickerUnlock())
        .catch(() => {});
    }
  }, [view, room.selfId]);

  // Per-round reveal sound, same as the local sim - fires once per round as
  // soon as the engine actually computes a score, guarded per-round so a
  // re-render reading the same already-scored round can't replay it.
  const soundedRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (!view) return;
    const currentRound = view.rounds[view.round - 1];
    if (!currentRound || currentRound.score === null || soundedRoundRef.current === view.round) return;
    soundedRoundRef.current = view.round;
    if (currentRound.score === 4) sfxBullseye();
    else if (currentRound.score === 0) sfxError();
    else sfxReveal();
  }, [view]);

  function dispatch(action: TriageDialAction) {
    room.sendAction(action);
  }

  function handleLockIn() {
    sfxLockIn();
    dispatch({ type: "lockIn" });
    dispatch({ type: "advanceRound" }); // reveal -> argue, nothing distinct to show in between (see header comment)
  }

  function handleContinue() {
    dispatch({ type: "advanceRound" });
  }

  if (showTutorial) {
    return (
      <DialogueScene
        lines={TRIAGE_DIAL_TUTORIAL}
        portraits={GYNA_PORTRAITS}
        squawkKey={GYNA_SQUAWK_KEY}
        typeKey={GYNA_TYPE_KEY}
        onComplete={dismissTutorial}
        onSkip={dismissTutorial}
      />
    );
  }

  if (!view) {
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>Loading the board...</p>
      </main>
    );
  }

  const selfId = room.selfId;
  const dialer = dialerOf(view);
  const isClueGiver = selfId !== null && selfId === view.clueGiver;
  const isDialer = selfId !== null && selfId === dialer;
  const currentRound = view.rounds[view.round - 1]!;

  if (view.phase === "done") {
    const winnerText =
      view.mode === "coop"
        ? `Team score: ${view.scores[view.players[0]]} points over 8 rounds.`
        : `${labelFor(view.scores[view.players[0]]! > view.scores[view.players[1]]! ? view.players[0] : view.players[1])} wins, ${Math.max(view.scores[view.players[0]]!, view.scores[view.players[1]]!)} to ${Math.min(view.scores[view.players[0]]!, view.scores[view.players[1]]!)}.`;
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>
        <h1>Round complete</h1>
        <p>{winnerText}</p>
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
        <PixelButton onClick={() => setShowTutorial(true)}>How to play</PixelButton>
        <span style={{ marginLeft: "auto" }}>
          Round {view.round} / 8 · {view.mode === "coop" ? "Co-op" : "Versus"} · Score{" "}
          {view.mode === "coop"
            ? view.scores[view.players[0]]
            : `${view.scores[view.players[0]]} - ${view.scores[view.players[1]]}`}
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          {isClueGiver ? "You are giving the clue this round." : "You are dragging the needle this round."}
        </p>

        <SpectrumDial
          leftLabel={currentRound.spectrum.leftLabel}
          rightLabel={currentRound.spectrum.rightLabel}
          needlePosition={currentRound.needlePosition}
          target={currentRound.target}
          interactive={view.phase === "dial" && isDialer}
          onChange={(position) => dispatch({ type: "moveNeedle", position })}
        />

        {view.phase === "clue" && isClueGiver && <ClueForm onSubmit={(clue) => dispatch({ type: "submitClue", clue })} />}
        {view.phase === "clue" && !isClueGiver && (
          <p style={{ marginTop: 16, opacity: 0.8 }}>Waiting for {labelFor(view.clueGiver)} to give a clue...</p>
        )}

        {view.phase !== "clue" && currentRound.clue && (
          <p style={{ marginTop: 16, fontStyle: "italic" }}>
            {labelFor(view.clueGiver)} says: "{currentRound.clue}"
          </p>
        )}

        {view.phase === "dial" && isDialer && (
          <PixelButton style={{ marginTop: 12 }} disabled={currentRound.needlePosition === null} onClick={handleLockIn}>
            Lock In
          </PixelButton>
        )}
        {view.phase === "dial" && !isDialer && (
          <p style={{ marginTop: 12, opacity: 0.8 }}>Watching {labelFor(dialer)} drag the needle live...</p>
        )}

        {(view.phase === "reveal" || view.phase === "argue") && currentRound.score !== null && (
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
            <PixelButton onClick={handleContinue}>{view.round >= 8 ? "See results" : "Next round"}</PixelButton>
          </div>
        )}
      </div>
    </main>
  );
}

function ClueForm({ onSubmit }: { onSubmit: (clue: string) => void }) {
  const [clueDraft, setClueDraft] = useState("");
  return (
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
          onSubmit(clueDraft.trim());
          setClueDraft("");
        }}
      >
        Lock in clue
      </PixelButton>
    </div>
  );
}
