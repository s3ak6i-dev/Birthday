// Medical Wordle engine. See masterdoc.md section 3.3 (FR-50..59).
//
// Unlike Guess the Diagnosis / Triage Dial, this is NOT turn-based -
// `submitGuess` and `useHint` only ever touch the acting player's own
// board, so there's no "whose turn is it" check anywhere here. Both
// players solve independently/simultaneously; what differs by mode is
// purely how the target word gets chosen and how much of the *other*
// player's board is visible before the game ends (see `redact`).
//
// Daily (FR-50): the word is picked deterministically from the day's IST
// date + the pack, not rolled randomly - `init` takes `istDate` as an
// explicit input rather than calling `new Date()` itself, so the engine
// stays a pure function of its inputs (same reasoning as Triage Dial's
// tie-replay needing to avoid Math.random() mid-game).
//
// Duel (FR-53) needs a "setup" phase first to collect both players'
// secret words before solving can start; daily/race skip straight to
// "solving" since the target's already chosen at init.

import type { GameEngine, PlayerId } from "../../types";
import type {
  TileState,
  WordleAction,
  WordleEntry,
  WordleGuessRow,
  WordlePlayerBoard,
  WordleRedactedState,
  WordleState,
  WordleTargetInfo,
} from "./types";

// Was a flat 5 (masterdoc.md 3.3's original "five-letter words" spec) until
// custom-length words were added - now a range, with the guess budget
// scaling per word via `maxGuessesFor` (classic Wordle convention: one more
// guess than the word's own length) instead of one fixed number for every
// word regardless of how long it is.
export const MIN_WORD_LENGTH = 4;
export const MAX_WORD_LENGTH = 8;
const HINT_UNLOCKS_AFTER_GUESS = 4;

function maxGuessesFor(wordLength: number): number {
  return wordLength + 1;
}

export interface WordleInitOptions {
  mode: WordleState["mode"];
  /** Required for daily/race - the word is chosen from here. Unused for
   * duel, where players type their own words in during setup. */
  entries?: WordleEntry[];
  /** Required for daily mode (FR-50) - "YYYY-MM-DD" in IST. The caller
   * computes "today," not the engine, so `init` stays a pure function of
   * its inputs. */
  istDate?: string;
  /** Race mode's word pick. Defaults to Math.random; irrelevant for daily
   * (date-hash governed) and duel (no pack involved). */
  rng?: () => number;
}

function otherPlayer(players: [PlayerId, PlayerId], player: PlayerId): PlayerId {
  return players[0] === player ? players[1] : players[0];
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`wordleEngine: ${message}`);
}

function normalizeWord(word: string): string {
  return word.trim().toUpperCase();
}

function assertValidWord(word: string): void {
  assert(/^[A-Z]+$/.test(word), `"${word}" must contain only letters A-Z`);
  assert(
    word.length >= MIN_WORD_LENGTH && word.length <= MAX_WORD_LENGTH,
    `"${word}" must be ${MIN_WORD_LENGTH}-${MAX_WORD_LENGTH} letters long`
  );
}

/** Small deterministic string hash -> array index, same technique as
 * Triage Dial's tie-replay target - keeps word selection reproducible
 * from (date, pack) alone, with no server round-trip or randomness that
 * two clients could ever disagree on (FR-50's whole point). */
function hashIndex(seed: string, length: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % length;
}

function emptyTarget(): WordleTargetInfo {
  return { word: "", definition: null, pack: null, source: null, setterHint: null };
}

function emptyBoard(): WordlePlayerBoard {
  return { guesses: [], solved: false, hintUsed: false };
}

function isBoardFinished(board: WordlePlayerBoard, targetWord: string): boolean {
  return board.solved || board.guesses.length >= maxGuessesFor(targetWord.length);
}

/** Standard Wordle scoring with correct duplicate-letter handling: a
 * repeated guessed letter only lights up "present" as many times as it
 * actually appears unmatched in the target (e.g. guessing "ARRAY" against
 * target "RADAR" shouldn't mark every R as present). */
function scoreGuess(guess: string, target: string): TileState[] {
  const length = target.length;
  const tiles: TileState[] = new Array(length).fill("absent");
  const targetChars = target.split("");
  const guessChars = guess.split("");
  const consumed = new Array(length).fill(false);

  for (let i = 0; i < length; i++) {
    if (guessChars[i] === targetChars[i]) {
      tiles[i] = "correct";
      consumed[i] = true;
    }
  }
  for (let i = 0; i < length; i++) {
    if (tiles[i] === "correct") continue;
    const matchIndex = targetChars.findIndex((c, j) => !consumed[j] && c === guessChars[i]);
    if (matchIndex !== -1) {
      tiles[i] = "present";
      consumed[matchIndex] = true;
    }
  }
  return tiles;
}

export const wordleEngine: GameEngine<WordleState, WordleAction, WordleRedactedState> = {
  id: "wordle",

  init(players: [PlayerId, PlayerId], options: unknown): WordleState {
    const { mode, entries, istDate, rng = Math.random } = options as WordleInitOptions;

    if (mode === "duel") {
      return {
        players,
        mode,
        istDate: null,
        phase: "setup",
        targetFor: { [players[0]]: emptyTarget(), [players[1]]: emptyTarget() },
        boards: { [players[0]]: emptyBoard(), [players[1]]: emptyBoard() },
      };
    }

    assert(entries !== undefined && entries.length > 0, `${mode} mode needs a non-empty entries pack`);
    let entry: WordleEntry;
    if (mode === "daily") {
      assert(istDate !== undefined && istDate.length > 0, "daily mode needs istDate (FR-50)");
      entry = entries[hashIndex(istDate, entries.length)]!;
    } else {
      entry = entries[Math.floor(rng() * entries.length)]!;
    }

    const target: WordleTargetInfo = {
      word: entry.word,
      definition: entry.definition,
      pack: entry.pack,
      source: entry.source,
      setterHint: null,
    };

    return {
      players,
      mode,
      istDate: mode === "daily" ? (istDate ?? null) : null,
      phase: "solving",
      targetFor: { [players[0]]: target, [players[1]]: target },
      boards: { [players[0]]: emptyBoard(), [players[1]]: emptyBoard() },
    };
  },

  reduce(state: WordleState, action: WordleAction, actingPlayer: PlayerId): WordleState {
    assert(state.phase !== "done", "the game is already over");
    assert(state.players.includes(actingPlayer), "actingPlayer is not in this game");

    switch (action.type) {
      case "setSecretWord": {
        assert(state.mode === "duel", "setSecretWord is only for duel mode");
        assert(state.phase === "setup", "secret words can only be set during setup");
        const word = normalizeWord(action.word);
        assertValidWord(word);

        const opponent = otherPlayer(state.players, actingPlayer);
        const existing = state.targetFor[opponent];
        assert(existing !== undefined && existing.word === "", "you have already set your word");

        const targetFor = {
          ...state.targetFor,
          [opponent]: {
            word,
            definition: null,
            pack: null,
            source: null,
            setterHint: action.hint?.trim() || null,
          },
        };
        const bothSet = Object.values(targetFor).every((t) => t.word !== "");
        return { ...state, targetFor, phase: bothSet ? "solving" : "setup" };
      }

      case "submitGuess": {
        assert(state.phase === "solving", "no solving is happening right now");
        const board = state.boards[actingPlayer];
        assert(board !== undefined, "actingPlayer is not in this game");
        const target = state.targetFor[actingPlayer];
        assert(target !== undefined && target.word !== "", "no target word set for you yet");
        assert(!isBoardFinished(board, target.word), "your board is already finished");

        const guess = normalizeWord(action.word);
        assertValidWord(guess);
        assert(guess.length === target.word.length, `guess must be ${target.word.length} letters, matching the target`);

        const tiles = scoreGuess(guess, target.word);
        const row: WordleGuessRow = { letters: guess.split(""), tiles };
        const solved = guess === target.word;
        const nextBoard: WordlePlayerBoard = { ...board, guesses: [...board.guesses, row], solved };

        const boards = { ...state.boards, [actingPlayer]: nextBoard };
        const allFinished = state.players.every((p) => isBoardFinished(boards[p]!, state.targetFor[p]!.word));
        return { ...state, boards, phase: allFinished ? "done" : "solving" };
      }

      case "useHint": {
        assert(state.phase === "solving", "no solving is happening right now");
        const board = state.boards[actingPlayer];
        assert(board !== undefined, "actingPlayer is not in this game");
        assert(!board.hintUsed, "hint already used");
        assert(board.guesses.length >= HINT_UNLOCKS_AFTER_GUESS, `hint unlocks after guess ${HINT_UNLOCKS_AFTER_GUESS}`);

        const target = state.targetFor[actingPlayer];
        const hasHintContent = Boolean(target?.definition || target?.setterHint);
        assert(hasHintContent, "no hint is available for this word");

        return { ...state, boards: { ...state.boards, [actingPlayer]: { ...board, hintUsed: true } } };
      }

      default:
        throw new Error(`wordleEngine: unknown action ${JSON.stringify(action)}`);
    }
  },

  redact(state: WordleState, forPlayer: PlayerId): WordleRedactedState {
    const opponent = otherPlayer(state.players, forPlayer);
    const ownBoard = state.boards[forPlayer] ?? emptyBoard();
    const opponentBoard = state.boards[opponent] ?? emptyBoard();
    const rawTarget = state.targetFor[forPlayer] ?? emptyTarget();

    const fullyRevealed = ownBoard.solved || state.phase === "done";
    const hintRevealed = fullyRevealed || ownBoard.hintUsed;

    const opponentTarget = state.targetFor[opponent] ?? emptyTarget();
    const bothFinished = isBoardFinished(ownBoard, rawTarget.word) && isBoardFinished(opponentBoard, opponentTarget.word);

    return {
      players: state.players,
      mode: state.mode,
      istDate: state.istDate,
      phase: state.phase,
      ownTarget: {
        word: fullyRevealed ? rawTarget.word || null : null,
        source: fullyRevealed ? rawTarget.source : null,
        definition: hintRevealed ? rawTarget.definition : null,
        pack: hintRevealed ? rawTarget.pack : null,
        setterHint: hintRevealed ? rawTarget.setterHint : null,
      },
      // The word's own length isn't a spoiler the way the word itself is -
      // the solver needs it up front just to know how many tile boxes to
      // render (same as seeing N empty boxes in a fixed-length Wordle).
      // 0 during duel's "setup" phase, before the opponent has typed a
      // word yet - the client only reads this once `phase === "solving"`.
      ownTargetLength: rawTarget.word.length,
      ownMaxGuesses: maxGuessesFor(rawTarget.word.length),
      ownBoard,
      opponentGuessCount: opponentBoard.guesses.length,
      opponentBoard: bothFinished ? opponentBoard : null,
    };
  },

  isTerminal(state: WordleState): boolean {
    return state.phase === "done";
  },
};
