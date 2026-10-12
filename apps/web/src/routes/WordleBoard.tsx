// Medical Wordle board (S17/S18/S19). See masterdoc.md section 3.3 and
// screen inventory section 2.2.
//
// Same scope note as the other two boards: the rooms layer doesn't
// dispatch to engines yet (TODO.md M1), so this is a LOCAL pass-and-play
// simulation - a "Viewing as" toggle stands in for two devices. Unlike the
// other two games, Wordle isn't turn-based: both players solve their own
// board independently, so there's no "whose turn" concept here at all,
// just per-player board state.
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DialogueScene, PixelButton, palette } from "@ward-games/ui";
import {
  wordleEngine,
  PLACEHOLDER_ENTRIES,
  type PlayerId,
  type TileState,
  type WordleMode,
  type WordleState,
} from "@ward-games/shared";
import { WORDLE_TUTORIAL } from "./wordle-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";

const P1: PlayerId = "p1";
const P2: PlayerId = "p2";
const PLAYER_LABEL: Record<PlayerId, string> = { [P1]: "Player 1", [P2]: "Player 2" };
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

function otherPlayer(players: [PlayerId, PlayerId], player: PlayerId): PlayerId {
  return players[0] === player ? players[1] : players[0];
}

/** Today's date in IST as "YYYY-MM-DD" (FR-50's daily-word rollover
 * timezone) - computed here, not inside the engine, so `init` stays a
 * pure function of its inputs. */
function todayIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function initStateFor(mode: WordleMode): WordleState {
  if (mode === "duel") return wordleEngine.init([P1, P2], { mode: "duel" });
  if (mode === "daily") return wordleEngine.init([P1, P2], { mode: "daily", entries: PLACEHOLDER_ENTRIES, istDate: todayIST() });
  return wordleEngine.init([P1, P2], { mode: "race", entries: PLACEHOLDER_ENTRIES });
}

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

export function WordleBoard() {
  const [searchParams] = useSearchParams();
  const mode: WordleMode = (["daily", "race", "duel"] as const).includes(searchParams.get("mode") as WordleMode)
    ? (searchParams.get("mode") as WordleMode)
    : "daily";

  const [state, setState] = useState<WordleState>(() => initStateFor(mode));
  const [viewingPlayer, setViewingPlayer] = useState<PlayerId>(P1);
  const [draft, setDraft] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [hintInput, setHintInput] = useState("");
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

  const view = useMemo(() => wordleEngine.redact(state, viewingPlayer), [state, viewingPlayer]);
  const board = view.ownBoard;
  const finished = board.solved || board.guesses.length >= MAX_GUESSES;
  const canType = state.phase === "solving" && !finished;

  function submitDraft() {
    if (draft.length !== WORD_LENGTH) return;
    setState((s) => wordleEngine.reduce(s, { type: "submitGuess", word: draft }, viewingPlayer));
    setDraft("");
  }

  function pressKey(key: string) {
    if (!canType) return;
    if (key === "ENTER") {
      submitDraft();
    } else if (key === "BACK") {
      setDraft((d) => d.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && draft.length < WORD_LENGTH) {
      setDraft((d) => d + key);
    }
  }

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
      <DialogueScene lines={WORDLE_TUTORIAL} portraits={GYNA_PORTRAITS} onComplete={dismissTutorial} onSkip={dismissTutorial} />
    );
  }

  const kbStates = keyboardStates(board.guesses);

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
        <strong>Viewing as:</strong>
        {([P1, P2] as const).map((p) => (
          <PixelButton key={p} variant={viewingPlayer === p ? "primary" : "danger"} onClick={() => setViewingPlayer(p)}>
            {PLAYER_LABEL[p]}
          </PixelButton>
        ))}
        <span style={{ opacity: 0.7, fontSize: 13 }}>(stand-in for two devices until rooms/M1)</span>
        <PixelButton onClick={() => setShowTutorial(true)}>How to play</PixelButton>
        <span style={{ marginLeft: "auto" }}>
          {mode === "daily" ? `Daily · ${state.istDate}` : mode === "race" ? "Race" : "Duel"} · Opponent guesses:{" "}
          {view.opponentGuessCount}
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto" }}>
        {state.phase === "setup" && (
          <DuelSetup state={state} viewingPlayer={viewingPlayer} setState={setState} wordInput={wordInput}
            setWordInput={setWordInput} hintInput={hintInput} setHintInput={setHintInput} />
        )}

        {state.phase !== "setup" && state.phase !== "done" && (
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
                <PixelButton onClick={() => setState((s) => wordleEngine.reduce(s, { type: "useHint" }, viewingPlayer))}>
                  Use hint
                </PixelButton>
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

        {state.phase === "done" && <Results state={state} viewingPlayer={viewingPlayer} />}
      </div>
    </main>
  );
}

function Keyboard({ states, onPress, disabled }: { states: Record<string, TileState>; onPress: (key: string) => void; disabled: boolean }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {i === 2 && <KeyButton label="Enter" wide onClick={() => onPress("ENTER")} disabled={disabled} />}
          {row.split("").map((letter) => (
            <KeyButton
              key={letter}
              label={letter}
              state={states[letter]}
              onClick={() => onPress(letter)}
              disabled={disabled}
            />
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

function DuelSetup({
  state,
  viewingPlayer,
  setState,
  wordInput,
  setWordInput,
  hintInput,
  setHintInput,
}: {
  state: WordleState;
  viewingPlayer: PlayerId;
  setState: Dispatch<SetStateAction<WordleState>>;
  wordInput: string;
  setWordInput: (v: string) => void;
  hintInput: string;
  setHintInput: (v: string) => void;
}) {
  const opponent = otherPlayer(state.players, viewingPlayer);
  const alreadySet = state.targetFor[opponent]!.word !== "";

  if (alreadySet) {
    return <p style={{ textAlign: "center", opacity: 0.85 }}>Waiting for {PLAYER_LABEL[opponent]} to set their word...</p>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ fontSize: 14 }}>Set a 5-letter word for {PLAYER_LABEL[opponent]} to solve:</p>
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
          setState((s) =>
            wordleEngine.reduce(s, { type: "setSecretWord", word: wordInput, hint: hintInput || undefined }, viewingPlayer)
          );
          setWordInput("");
          setHintInput("");
        }}
      >
        Lock in word
      </PixelButton>
    </div>
  );
}

function Results({ state, viewingPlayer }: { state: WordleState; viewingPlayer: PlayerId }) {
  const opponent = otherPlayer(state.players, viewingPlayer);
  const myBoard = state.boards[viewingPlayer]!;
  const theirBoard = state.boards[opponent]!;
  const myTarget = state.targetFor[viewingPlayer]!;
  const theirTarget = state.targetFor[opponent]!;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Results</h2>
      <div style={{ padding: 12, background: palette.violet, border: `2px solid ${palette.ink}`, borderRadius: 8 }}>
        <p style={{ margin: "0 0 4px" }}>
          You ({PLAYER_LABEL[viewingPlayer]}): {myBoard.solved ? `solved in ${myBoard.guesses.length}` : "not solved"} - the
          word was <strong>{myTarget.word}</strong>
        </p>
        {myTarget.definition && <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{myTarget.definition}</p>}
      </div>
      <div style={{ padding: 12, background: "rgba(20,16,31,0.5)", border: `2px solid ${palette.deepViolet}`, borderRadius: 8 }}>
        <p style={{ margin: "0 0 4px" }}>
          {PLAYER_LABEL[opponent]}: {theirBoard.solved ? `solved in ${theirBoard.guesses.length}` : "not solved"} - the word
          was <strong>{theirTarget.word}</strong>
        </p>
        {theirTarget.definition && <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{theirTarget.definition}</p>}
      </div>
    </div>
  );
}
