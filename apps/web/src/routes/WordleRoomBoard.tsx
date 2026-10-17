// The real, server-authoritative Medical Wordle board (S17/S18/S19),
// played over an actual room (apps/rooms) instead of the local pass-and-
// play simulation in WordleBoard.tsx. See masterdoc.md section 3.3 and
// section 4.6 (realtime rooms protocol).
//
// Same shape as GuessTheDiagnosisRoomBoard.tsx: everything renders off
// `room.gameState` (WordleRedactedState), already redacted per-player by
// the Durable Object - no "Viewing as" toggle, this device only ever has
// its own view. Not turn-based (same note as the local sim) - both players
// solve independently, `submitGuess`/`useHint` only ever touch the acting
// player's own board.
//
// One real gap the redacted state leaves open: in duel mode it never tells
// a player what word THEY set for their partner (only `ownTarget`, what
// *they* are solving) - but the setter already knows it, since they just
// typed it in. Tracked locally (`sentWord`) purely so the end-of-game
// Results screen can still show "the word was ___" for the partner's
// board, same as the local sim did from full un-redacted state.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import type { TileState, WordleAction, WordleRedactedState } from "@ward-games/shared";
import type { RoomHandle } from "../lib/use-room";
import { WORDLE_TUTORIAL } from "./wordle-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { recordGameResult, unlockSticker } from "../lib/progress";
import { GYNA_SQUAWK_KEY, GYNA_TYPE_KEY, sfxKeyTap, sfxLose, sfxStickerUnlock, sfxTileFlip, sfxWin } from "../lib/sfx";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const HINT_UNLOCKS_AFTER_GUESS = 4;
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const TILE_STYLE: Record<TileState, { bg: string; color: string; glyph: string }> = {
  correct: { bg: palette.mint, color: palette.ink, glyph: "✓" },
  present: { bg: palette.butter, color: palette.ink, glyph: "~" },
  absent: { bg: "rgba(255,255,255,0.15)", color: palette.white, glyph: "•" },
  empty: { bg: "transparent", color: palette.white, glyph: "" },
};
const TUTORIAL_SEEN_KEY = "ward-games:tutorial-seen:wordle";

function keyboardStates(guesses: { letters: string[]; tiles: TileState[] }[]): Record<string, TileState> {
  const priority: Record<TileState, number> = { correct: 3, present: 2, absent: 1, empty: 0 };
  const states: Record<string, TileState> = {};
  for (const row of guesses) {
    row.letters.forEach((letter, i) => {
      const tile = row.tiles[i]!;
      const existing = states[letter];
      if (!existing || priority[tile] > priority[existing]) states[letter] = tile;
    });
  }
  return states;
}

function Tile({ letter, state }: { letter: string; state: TileState }) {
  const style = TILE_STYLE[state];
  return (
    <div
      style={{
        width: 48,
        height: 48,
        display: "grid",
        placeItems: "center",
        background: style.bg,
        color: style.color,
        border: `2px solid ${state === "empty" ? palette.deepViolet : palette.ink}`,
        borderRadius: 6,
        fontSize: 20,
        fontWeight: "bold",
        position: "relative",
      }}
    >
      {letter}
      {state !== "empty" && (
        <span style={{ position: "absolute", bottom: 1, right: 3, fontSize: 9, opacity: 0.8 }}>{style.glyph}</span>
      )}
    </div>
  );
}

function Keyboard({ states, onPress, disabled }: { states: Record<string, TileState>; onPress: (key: string) => void; disabled: boolean }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {i === 2 && <KeyButton label="Enter" wide onClick={() => onPress("ENTER")} disabled={disabled} />}
          {row.split("").map((letter) => (
            <KeyButton key={letter} label={letter} state={states[letter]} onClick={() => onPress(letter)} disabled={disabled} />
          ))}
          {i === 2 && <KeyButton label="⌫" wide onClick={() => onPress("BACK")} disabled={disabled} />}
        </div>
      ))}
    </div>
  );
}

function KeyButton({
  label,
  state,
  wide,
  onClick,
  disabled,
}: {
  label: string;
  state?: TileState;
  wide?: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const style = state ? TILE_STYLE[state] : { bg: palette.lavender, color: palette.ink, glyph: "" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: wide ? 48 : 28,
        padding: "10px 4px",
        background: style.bg,
        color: style.color,
        border: `1px solid ${palette.ink}`,
        borderRadius: 4,
        fontSize: 12,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

export function WordleRoomBoard({
  room,
  labelFor,
}: {
  room: RoomHandle<unknown>;
  labelFor: (userId: string) => string;
}) {
  const [draft, setDraft] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [hintInput, setHintInput] = useState("");
  // Optimistic - the redacted state has no "have I already set my word"
  // flag of its own (see this file's header), so this flips the instant
  // the action is sent rather than waiting on a round-trip.
  const [wordSent, setWordSent] = useState<{ word: string } | null>(null);
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

  const view = room.gameState as WordleRedactedState | null;
  const board = view?.ownBoard ?? null;
  const finished = board ? board.solved || board.guesses.length >= MAX_GUESSES : false;
  const canType = !!view && view.phase === "solving" && !finished;

  function dispatch(action: WordleAction) {
    room.sendAction(action);
  }

  function submitDraft() {
    if (draft.length !== WORD_LENGTH) return;
    sfxTileFlip();
    dispatch({ type: "submitGuess", word: draft });
    setDraft("");
  }

  function pressKey(key: string) {
    if (!canType) return;
    if (key === "ENTER") {
      submitDraft();
    } else if (key === "BACK") {
      setDraft((d) => d.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && draft.length < WORD_LENGTH) {
      sfxKeyTap();
      setDraft((d) => d + key);
    }
  }

  // Own-board win/lose feedback - fires the instant MY board finishes
  // (solved or out of guesses), independent of mode or who's "ahead,"
  // same immediate feedback the local sim gave regardless of the
  // race/duel head-to-head outcome below.
  const soundedOwnBoardRef = useRef(false);
  useEffect(() => {
    if (!finished || soundedOwnBoardRef.current || !board) return;
    soundedOwnBoardRef.current = true;
    if (board.solved) sfxWin();
    else sfxLose();
  }, [finished, board]);

  // Race/duel only (daily has no opponent to beat - same word, not a
  // competition). Whoever solved in fewer guesses wins; solved beats
  // unsolved; an exact tie (including both unsolved) records nothing, same
  // "draws don't move the scoreboard" rule GuessTheDiagnosisRoomBoard
  // follows. opponentBoard is only populated once both are finished
  // (redact()'s bothFinished gate), which is exactly when phase is "done."
  const recordedResultRef = useRef(false);
  useEffect(() => {
    if (!view || view.phase !== "done" || view.mode === "daily" || recordedResultRef.current) return;
    const selfId = room.selfId;
    const opponentBoard = view.opponentBoard;
    if (!selfId || !opponentBoard) return;

    const ownGuesses = view.ownBoard.solved ? view.ownBoard.guesses.length : Infinity;
    const opponentGuesses = opponentBoard.solved ? opponentBoard.guesses.length : Infinity;
    if (ownGuesses === opponentGuesses) return; // true tie (incl. both unsolved) - nothing to record

    recordedResultRef.current = true;
    const outcome = ownGuesses < opponentGuesses ? "win" : "loss";
    recordGameResult(selfId, "wordle", outcome).catch(() => {});
    if (outcome === "loss") {
      unlockSticker(selfId, 7) // "Minor Setback" - lose any live game
        .then(() => sfxStickerUnlock())
        .catch(() => {});
    }
  }, [view, room.selfId]);

  useEffect(() => {
    if (!canType) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") pressKey("ENTER");
      else if (e.key === "Backspace") pressKey("BACK");
      else if (/^[a-zA-Z]$/.test(e.key)) pressKey(e.key.toUpperCase());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canType, draft]);

  if (showTutorial) {
    return (
      <DialogueScene
        lines={WORDLE_TUTORIAL}
        portraits={GYNA_PORTRAITS}
        squawkKey={GYNA_SQUAWK_KEY}
        typeKey={GYNA_TYPE_KEY}
        onComplete={dismissTutorial}
        onSkip={dismissTutorial}
      />
    );
  }

  if (!view || !board) {
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>Loading the board...</p>
      </main>
    );
  }

  const kbStates = keyboardStates(board.guesses);
  const partnerId = room.players.find((p) => p.userId !== room.selfId)?.userId;

  return (
    <main style={{ position: "relative", minHeight: "100vh", color: palette.white, padding: 16 }}>
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
          {view.mode === "daily" ? `Daily · ${view.istDate}` : view.mode === "race" ? "Race" : "Duel"} · Opponent guesses:{" "}
          {view.opponentGuessCount}
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto" }}>
        {view.phase === "setup" && (
          <DuelSetup
            wordSent={wordSent}
            setWordSent={setWordSent}
            wordInput={wordInput}
            setWordInput={setWordInput}
            hintInput={hintInput}
            setHintInput={setHintInput}
            onSubmit={(word, hint) => dispatch({ type: "setSecretWord", word, hint })}
            partnerLabel={partnerId ? labelFor(partnerId) : "your partner"}
          />
        )}

        {view.phase !== "setup" && view.phase !== "done" && (
          <>
            <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
              {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => {
                const submitted = board.guesses[rowIndex];
                const isDraftRow = !submitted && rowIndex === board.guesses.length && canType;
                return (
                  <div key={rowIndex} style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    {Array.from({ length: WORD_LENGTH }).map((__, colIndex) => {
                      if (submitted) {
                        return <Tile key={colIndex} letter={submitted.letters[colIndex]!} state={submitted.tiles[colIndex]!} />;
                      }
                      if (isDraftRow) {
                        return <Tile key={colIndex} letter={draft[colIndex] ?? ""} state="empty" />;
                      }
                      return <Tile key={colIndex} letter="" state="empty" />;
                    })}
                  </div>
                );
              })}
            </div>

            {finished && (
              <p style={{ textAlign: "center", opacity: 0.85, marginBottom: 12 }}>
                {board.solved ? "Solved! Waiting on the other player..." : "Out of guesses. Waiting on the other player..."}
              </p>
            )}

            {board.guesses.length >= HINT_UNLOCKS_AFTER_GUESS && !board.hintUsed && !finished && (
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <PixelButton onClick={() => dispatch({ type: "useHint" })}>Use hint</PixelButton>
              </div>
            )}
            {board.hintUsed && (
              <p style={{ textAlign: "center", fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
                Hint: {view.ownTarget.pack ? `${view.ownTarget.pack} - ${view.ownTarget.definition}` : view.ownTarget.setterHint}
              </p>
            )}

            <Keyboard states={kbStates} onPress={pressKey} disabled={!canType} />
          </>
        )}

        {view.phase === "done" && (
          <Results
            view={view}
            selfLabel={room.selfId ? labelFor(room.selfId) : "You"}
            partnerLabel={partnerId ? labelFor(partnerId) : "Partner"}
            sentWord={wordSent?.word ?? null}
          />
        )}
      </div>
    </main>
  );
}

function DuelSetup({
  wordSent,
  setWordSent,
  wordInput,
  setWordInput,
  hintInput,
  setHintInput,
  onSubmit,
  partnerLabel,
}: {
  wordSent: { word: string } | null;
  setWordSent: (v: { word: string }) => void;
  wordInput: string;
  setWordInput: (v: string) => void;
  hintInput: string;
  setHintInput: (v: string) => void;
  onSubmit: (word: string, hint?: string) => void;
  partnerLabel: string;
}) {
  if (wordSent) {
    return <p style={{ textAlign: "center", opacity: 0.85 }}>Waiting for {partnerLabel} to set their word...</p>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ fontSize: 14 }}>Set a 5-letter word for {partnerLabel} to solve:</p>
      <input
        value={wordInput}
        onChange={(e) => setWordInput(e.target.value.toUpperCase().slice(0, 5))}
        placeholder="WORD"
        style={{ padding: 8, borderRadius: 6, fontSize: 18, textAlign: "center", letterSpacing: 4 }}
      />
      <input
        value={hintInput}
        onChange={(e) => setHintInput(e.target.value)}
        placeholder="Optional one-line hint..."
        style={{ padding: 8, borderRadius: 6 }}
      />
      <PixelButton
        disabled={!/^[A-Z]{5}$/.test(wordInput)}
        onClick={() => {
          onSubmit(wordInput, hintInput || undefined);
          setWordSent({ word: wordInput });
          setWordInput("");
          setHintInput("");
        }}
      >
        Lock in word
      </PixelButton>
    </div>
  );
}

function Results({
  view,
  selfLabel,
  partnerLabel,
  sentWord,
}: {
  view: WordleRedactedState;
  selfLabel: string;
  partnerLabel: string;
  sentWord: string | null;
}) {
  const myBoard = view.ownBoard;
  const theirBoard = view.opponentBoard;
  // In daily/race the target is the same word for both players, so it's
  // safe to reuse ownTarget.word for "what they were solving" too; in duel
  // it's whatever word *I* set for them (sentWord, local-only - see this
  // file's header for why the server never echoes it back).
  const theirWord = view.mode === "duel" ? sentWord : view.ownTarget.word;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Results</h2>
      <div style={{ padding: 12, background: palette.violet, border: `2px solid ${palette.ink}`, borderRadius: 8 }}>
        <p style={{ margin: "0 0 4px" }}>
          You ({selfLabel}): {myBoard.solved ? `solved in ${myBoard.guesses.length}` : "not solved"} - the word was{" "}
          <strong>{view.ownTarget.word}</strong>
        </p>
        {view.ownTarget.definition && <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{view.ownTarget.definition}</p>}
      </div>
      <div style={{ padding: 12, background: "rgba(20,16,31,0.5)", border: `2px solid ${palette.deepViolet}`, borderRadius: 8 }}>
        <p style={{ margin: "0 0 4px" }}>
          {partnerLabel}: {theirBoard ? (theirBoard.solved ? `solved in ${theirBoard.guesses.length}` : "not solved") : "..."}
          {theirWord && (
            <>
              {" "}
              - the word was <strong>{theirWord}</strong>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
