// The real, server-authoritative Guess the Diagnosis board (S10/S11/S12),
// played over an actual room (apps/rooms) instead of the local pass-and-
// play simulation in GuessTheDiagnosisBoard.tsx. See masterdoc.md section
// 3.1 and section 4.6 (realtime rooms protocol).
//
// Everything here renders off `room.gameState`, which the Durable Object
// has *already redacted* for this exact player (GuessTheDiagnosisRedactedState)
// before it ever reached the client - there's no local engine.redact call
// and no "Viewing as" toggle, because this device only ever has one view:
// its own. Every move goes out as `room.sendAction(...)` and comes back
// through the same broadcast every other action does; nothing here
// mutates state directly.
//
// Card elimination marks stay local-only UI state per FR-34, same as the
// pass-and-play version - never part of the synced game state.
import { useState } from "react";
import { Link } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import type { GuessTheDiagnosisAction, GuessTheDiagnosisRedactedState } from "@ward-games/shared";
import type { RoomHandle } from "../lib/use-room";
import { GUESS_THE_DIAGNOSIS_TUTORIAL } from "./guess-the-diagnosis-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";

const TUTORIAL_SEEN_KEY = "ward-games:tutorial-seen:guess-the-diagnosis";

export function GuessTheDiagnosisRoomBoard({
  room,
  labelFor,
}: {
  room: RoomHandle<unknown>;
  labelFor: (userId: string) => string;
}) {
  const [eliminated, setEliminated] = useState<Set<string>>(new Set());
  const [questionDraft, setQuestionDraft] = useState("");
  const [guessMode, setGuessMode] = useState(false);
  const [confirmingCardId, setConfirmingCardId] = useState<string | null>(null);
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

  const view = room.gameState as GuessTheDiagnosisRedactedState | null;

  function dispatch(action: GuessTheDiagnosisAction) {
    room.sendAction(action);
  }

  function toggleEliminated(cardId: string) {
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function onCardClick(cardId: string) {
    if (guessMode) {
      setConfirmingCardId(cardId);
    } else {
      toggleEliminated(cardId);
    }
  }

  function confirmGuess() {
    if (confirmingCardId) dispatch({ type: "finalGuess", cardId: confirmingCardId });
    setConfirmingCardId(null);
    setGuessMode(false);
  }

  if (showTutorial) {
    return (
      <DialogueScene
        lines={GUESS_THE_DIAGNOSIS_TUTORIAL}
        portraits={GYNA_PORTRAITS}
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
  const isMyTurn = selfId !== null && view.turn === selfId;
  const isAnswering = selfId !== null && view.pendingQuestion !== null && view.pendingQuestion.askedBy !== selfId;
  const myLifelines = selfId !== null ? view.lifelinesUsed[selfId] : undefined;

  if (view.winner) {
    const text =
      view.winner === "draw"
        ? "Both out of lives. It's a draw - differential: too differential."
        : `${labelFor(view.winner)} wins! Discharged with a clean bill of health.`;
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>
        <h1>{text}</h1>
      </main>
    );
  }

  return (
    <main
      style={{
        height: "100dvh",
        position: "relative",
        color: palette.white,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
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

      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          background: "rgba(20,16,31,0.48)",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            padding: "10px 16px",
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
            borderBottom: `1px solid ${palette.deepViolet}`,
          }}
        >
          <Link to="/" style={{ color: palette.white }}>
            ← Lounge
          </Link>
          <span style={{ marginLeft: "auto" }}>
            {isMyTurn ? "Your turn" : `${labelFor(view.turn)}'s turn`}
            {isAnswering && " (you must answer)"}
          </span>
          <span>Lives: {selfId ? "❤".repeat(view.lives[selfId] ?? 0) || "none" : ""}</span>
          <span>Your card: {view.deck.find((c) => c.id === view.ownSecretCardId)?.name}</span>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16, padding: 16 }}>
          <div style={{ flex: "1 1 60%", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gridAutoRows: "1fr",
                gap: 6,
                overflowY: "auto",
              }}
            >
              {view.deck.map((card) => {
                const isOut = eliminated.has(card.id);
                return (
                  <button
                    key={card.id}
                    onClick={() => onCardClick(card.id)}
                    title={card.specialty}
                    style={{
                      padding: "4px 6px",
                      minHeight: 44,
                      background: isOut
                        ? "rgba(20,16,31,0.6)"
                        : "url(/guess-the-diagnosis-ui/card-frame-blank.png) center / 100% 100% no-repeat",
                      color: isOut ? "rgba(255,255,255,0.4)" : palette.ink,
                      textDecoration: isOut ? "line-through" : "none",
                      border: isOut ? `2px solid ${palette.ink}` : "none",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ padding: "0 16px" }}>{card.name}</span>
                  </button>
                );
              })}
            </div>
            <p
              style={{
                display: "inline-block",
                margin: "6px 0 0",
                padding: "4px 10px",
                background: "rgba(20,16,31,0.7)",
                border: `1px solid ${palette.deepViolet}`,
                borderRadius: 6,
                fontSize: 13,
                opacity: 0.9,
              }}
            >
              Remaining (your board): {view.deck.length - eliminated.size} / {view.deck.length}
            </p>
          </div>

          <div
            style={{
              flex: "0 0 320px",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              overflowY: "auto",
            }}
          >
            {isMyTurn && !view.pendingQuestion && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={questionDraft}
                  onChange={(e) => setQuestionDraft(e.target.value)}
                  placeholder="Ask a yes/no question..."
                  style={{ flex: 1, padding: 8, minWidth: 0 }}
                />
                <PixelButton
                  disabled={questionDraft.trim().length === 0}
                  onClick={() => {
                    dispatch({ type: "askQuestion", question: questionDraft.trim() });
                    setQuestionDraft("");
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <img src="/guess-the-diagnosis-ui/icon-ask.png" alt="" style={{ width: 18, height: 18 }} />
                  Ask
                </PixelButton>
              </div>
            )}
            {view.pendingQuestion && !isAnswering && (
              <p>
                Waiting for {labelFor(view.pendingQuestion.askedBy)} to answer: "{view.pendingQuestion.question}"
              </p>
            )}
            {isAnswering && (
              <div>
                <p>"{view.pendingQuestion!.question}"</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["yes", "no", "not-sure"] as const).map((answer) => (
                    <PixelButton key={answer} onClick={() => dispatch({ type: "answerQuestion", answer })}>
                      {answer}
                    </PixelButton>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PixelButton
                disabled={!myLifelines || myLifelines.consult}
                onClick={() => dispatch({ type: "useConsult" })}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <img src="/guess-the-diagnosis-ui/icon-consult.png" alt="" style={{ width: 18, height: 18 }} />
                Consult {myLifelines?.consult && "(used)"}
              </PixelButton>
              <PixelButton
                disabled={!myLifelines || myLifelines.secondOpinion}
                onClick={() => dispatch({ type: "useSecondOpinion" })}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <img src="/guess-the-diagnosis-ui/icon-second-opinion.png" alt="" style={{ width: 18, height: 18 }} />
                2nd Opinion {myLifelines?.secondOpinion && "(used)"}
              </PixelButton>
              <PixelButton
                variant={guessMode ? "danger" : "primary"}
                disabled={!isMyTurn || view.pendingQuestion !== null}
                onClick={() => setGuessMode((g) => !g)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <img src="/guess-the-diagnosis-ui/icon-final-guess.png" alt="" style={{ width: 18, height: 18 }} />
                {guessMode ? "Cancel guess" : "Final Guess"}
              </PixelButton>
            </div>
            {view.ownConsultReveal && (
              <p>
                Consult says: their card {view.ownConsultReveal.value ? "HAS" : "does NOT have"} "
                {view.ownConsultReveal.tag}"
              </p>
            )}

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                background: palette.violet,
                border: `3px solid ${palette.ink}`,
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  alignSelf: "flex-start",
                  background: palette.ink,
                  padding: "2px 10px",
                  borderRadius: 4,
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                Question log
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, overflowY: "auto" }}>
                {view.log.length === 0 && (
                  <li style={{ listStyle: "none", marginLeft: -18, opacity: 0.7 }}>No questions asked yet.</li>
                )}
                {[...view.log].reverse().map((entry, i) => (
                  <li key={view.log.length - i}>
                    {labelFor(entry.askedBy)}: "{entry.question}" → {entry.answer}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {confirmingCardId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ background: palette.violet, padding: 24, borderRadius: 8 }}>
            <p>Final guess: {view.deck.find((c) => c.id === confirmingCardId)?.name}?</p>
            <div style={{ display: "flex", gap: 8 }}>
              <PixelButton onClick={confirmGuess}>Confirm</PixelButton>
              <PixelButton variant="danger" onClick={() => setConfirmingCardId(null)}>
                Cancel
              </PixelButton>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
