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

const MAX_GUESSES = 6;
const HINT_UNLOCKS_AFTER_GUESS = 4;

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
  assert(/^[A-Z]{5}$/.test(word), `"${word}" must be exactly 5 letters A-Z`);
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

function isBoardFinished(board: WordlePlayerBoard): boolean {
  return board.solved || board.guesses.length >= MAX_GUESSES;
}

/** Standard Wordle scoring with correct duplicate-letter handling: a
 * repeated guessed letter only lights up "present" as many times as it
 * actually appears unmatched in the target (e.g. guessing "ARRAY" against
 * target "RADAR" shouldn't mark every R as present). */
function scoreGuess(guess: string, target: string): TileState[] {
  const tiles: TileState[] = new Array(5).fill("absent");
  const targetChars = target.split("");
  const guessChars = guess.split("");
  const consumed = new Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === targetChars[i]) {
      tiles[i] = "correct";
      consumed[i] = true;
    }
  }
  for (let i = 0; i < 5; i++) {
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
        assert(!isBoardFinished(board), "your board is already finished");

        const guess = normalizeWord(action.word);
        assertValidWord(guess);

        const target = state.targetFor[actingPlayer];
        assert(target !== undefined && target.word !== "", "no target word set for you yet");

        const tiles = scoreGuess(guess, target.word);
        const row: WordleGuessRow = { letters: guess.split(""), tiles };
        const solved = guess === target.word;
        const nextBoard: WordlePlayerBoard = { ...board, guesses: [...board.guesses, row], solved };

        const boards = { ...state.boards, [actingPlayer]: nextBoard };
        const allFinished = Object.values(boards).every(isBoardFinished);
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

    const bothFinished = isBoardFinished(ownBoard) && isBoardFinished(opponentBoard);

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
      ownBoard,
      opponentGuessCount: opponentBoard.guesses.length,
      opponentBoard: bothFinished ? opponentBoard : null,
    };
  },

  isTerminal(state: WordleState): boolean {
    return state.phase === "done";
  },
};
