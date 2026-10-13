// Guess the Diagnosis board (S10/S11/S12). See masterdoc.md section 3.1 and
// screen inventory section 2.2.
//
// IMPORTANT SCOPE NOTE: the rooms layer (apps/rooms, section 4.6) doesn't
// dispatch to game engines yet (TODO.md M1) - there's no real two-device
// networking yet. This is a LOCAL pass-and-play simulation: both players'
// state lives in one browser tab, and a "Passing to" toggle swaps which
// player's redacted view is on screen, standing in for two devices. The
// engine itself (packages/shared) is the real, server-authoritative-ready
// implementation - only the transport is fake here. Swapping this for the
// real room/WebSocket flow is M1 work and shouldn't require engine changes.
//
// Card elimination marks are local-only UI state per FR-34 (never part of
// engine state, never synced beyond a remaining-count).
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import {
  guessTheDiagnosisEngine,
  PLACEHOLDER_DECK,
  type GuessTheDiagnosisState,
  type PlayerId,
} from "@ward-games/shared";
import { GUESS_THE_DIAGNOSIS_TUTORIAL } from "./guess-the-diagnosis-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";

const P1: PlayerId = "p1";
const P2: PlayerId = "p2";
const PLAYER_LABEL: Record<PlayerId, string> = { [P1]: "Player 1", [P2]: "Player 2" };

// Stand-in for the real `scene_flags` DB row (section 4.5) until that table
// is actually read/written (M3) - just remembers "seen it" per browser.
const TUTORIAL_SEEN_KEY = "ward-games:tutorial-seen:guess-the-diagnosis";

export function GuessTheDiagnosisBoard() {
  const [state, setState] = useState<GuessTheDiagnosisState>(() =>
    guessTheDiagnosisEngine.init([P1, P2], { deck: PLACEHOLDER_DECK })
  );
  const [viewingPlayer, setViewingPlayer] = useState<PlayerId>(P1);
  const [eliminated, setEliminated] = useState<Record<PlayerId, Set<string>>>({ [P1]: new Set(), [P2]: new Set() });
  const [questionDraft, setQuestionDraft] = useState("");
  const [guessMode, setGuessMode] = useState(false);
  const [confirmingCardId, setConfirmingCardId] = useState<string | null>(null);
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

  const view = useMemo(() => guessTheDiagnosisEngine.redact(state, viewingPlayer), [state, viewingPlayer]);
  const myEliminated = eliminated[viewingPlayer]!;
  const isMyTurn = state.turn === viewingPlayer;
  const isAnswering = state.pendingQuestion !== null && state.pendingQuestion.askedBy !== viewingPlayer;
  const myLifelines = state.lifelinesUsed[viewingPlayer]!;

  function dispatch(action: Parameters<typeof guessTheDiagnosisEngine.reduce>[1], actingPlayer: PlayerId) {
    setState((s) => guessTheDiagnosisEngine.reduce(s, action, actingPlayer));
  }

  function toggleEliminated(cardId: string) {
    setEliminated((prev) => {
      const next = new Set(prev[viewingPlayer]);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return { ...prev, [viewingPlayer]: next };
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
    if (confirmingCardId) dispatch({ type: "finalGuess", cardId: confirmingCardId }, viewingPlayer);
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

  if (state.winner) {
    const text =
      state.winner === "draw"
        ? "Both out of lives. It's a draw - differential: too differential."
        : `${PLAYER_LABEL[state.winner]} wins! Discharged with a clean bill of health.`;
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>
        <h1>{text}</h1>
        <PixelButton onClick={() => setState(guessTheDiagnosisEngine.init([P1, P2], { deck: PLACEHOLDER_DECK }))}>
          Rematch
        </PixelButton>
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
      {/* Backdrop as a CSS background, not a layout-height <img> - the whole
          screen is the game now, not "image, then page scrolls to find the
          game below it". */}
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
        {/* Header: back link, viewing-as toggle, turn/lives status - fixed height */}
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
          <strong>Viewing as:</strong>
          {([P1, P2] as const).map((p) => (
            <PixelButton
              key={p}
              variant={viewingPlayer === p ? "primary" : "danger"}
              onClick={() => setViewingPlayer(p)}
            >
              {PLAYER_LABEL[p]}
            </PixelButton>
          ))}
          <span style={{ opacity: 0.7, fontSize: 13 }}>(stand-in for two devices until rooms/M1)</span>
          <PixelButton onClick={() => setShowTutorial(true)}>How to play</PixelButton>
          <span style={{ marginLeft: "auto" }}>
            {isMyTurn ? "Your turn" : `${PLAYER_LABEL[state.turn]}'s turn`}
            {isAnswering && " (you must answer)"}
          </span>
          <span>Lives: {"❤".repeat(state.lives[viewingPlayer] ?? 0) || "none"}</span>
          <span>Your card: {state.deck.find((c) => c.id === view.ownSecretCardId)?.name}</span>
        </div>

        {/* Body: board on the left, controls+log in a sidebar on the right
            on wide screens; stacks vertically and scrolls on narrow ones
            (.ward-gtd-body/.ward-gtd-sidebar/.ward-gtd-card-grid in
            index.css - the responsive parts of this layout can't be
            inline styles since those can't express a media query). */}
        <div className="ward-gtd-body" style={{ flex: 1, minHeight: 0, display: "flex", gap: 16, padding: 16 }}>
          <div style={{ flex: "1 1 60%", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              className="ward-gtd-card-grid"
              style={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridAutoRows: "1fr",
                gap: 6,
                overflowY: "auto",
              }}
            >
              {state.deck.map((card) => {
                const isOut = myEliminated.has(card.id);
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
              Remaining (your board): {state.deck.length - myEliminated.size} / {state.deck.length}
            </p>
          </div>

          <div
            className="ward-gtd-sidebar"
            style={{
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              overflowY: "auto",
            }}
          >
            {/* Ask / answer */}
            {isMyTurn && !state.pendingQuestion && (
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
                    dispatch({ type: "askQuestion", question: questionDraft.trim() }, viewingPlayer);
                    setQuestionDraft("");
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <img src="/guess-the-diagnosis-ui/icon-ask.png" alt="" style={{ width: 18, height: 18 }} />
                  Ask
                </PixelButton>
              </div>
            )}
            {state.pendingQuestion && !isAnswering && (
              <p>
                Waiting for {PLAYER_LABEL[state.pendingQuestion.askedBy === P1 ? P2 : P1]} to answer: "
                {state.pendingQuestion.question}"
              </p>
            )}
            {isAnswering && (
              <div>
                <p>"{state.pendingQuestion!.question}"</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["yes", "no", "not-sure"] as const).map((answer) => (
                    <PixelButton
                      key={answer}
                      onClick={() => dispatch({ type: "answerQuestion", answer }, viewingPlayer)}
                    >
                      {answer}
                    </PixelButton>
                  ))}
                </div>
              </div>
            )}

            {/* Lifelines */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PixelButton
                disabled={myLifelines.consult}
                onClick={() => dispatch({ type: "useConsult" }, viewingPlayer)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <img src="/guess-the-diagnosis-ui/icon-consult.png" alt="" style={{ width: 18, height: 18 }} />
                Consult {myLifelines.consult && "(used)"}
              </PixelButton>
              <PixelButton
                disabled={myLifelines.secondOpinion}
                onClick={() => dispatch({ type: "useSecondOpinion" }, viewingPlayer)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <img src="/guess-the-diagnosis-ui/icon-second-opinion.png" alt="" style={{ width: 18, height: 18 }} />
                2nd Opinion {myLifelines.secondOpinion && "(used)"}
              </PixelButton>
              <PixelButton
                variant={guessMode ? "danger" : "primary"}
                disabled={!isMyTurn || state.pendingQuestion !== null}
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

            {/* Log */}
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
                {state.log.length === 0 && <li style={{ listStyle: "none", marginLeft: -18, opacity: 0.7 }}>No questions asked yet.</li>}
                {[...state.log].reverse().map((entry, i) => (
                  <li key={state.log.length - i}>
                    {PLAYER_LABEL[entry.askedBy]}: "{entry.question}" → {entry.answer}
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
            // See the identical fix's comment in GuessTheDiagnosisRoomBoard.tsx -
            // without an explicit z-index this painted behind the zIndex:1
            // board wrapper above and was unclickable.
            zIndex: 2,
            background: "rgba(0,0,0,0.6)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ background: palette.violet, padding: 24, borderRadius: 8 }}>
            <p>Final guess: {state.deck.find((c) => c.id === confirmingCardId)?.name}?</p>
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
