// Medical Wordle. See masterdoc.md section 3.3 (FR-50..59).
import type { PlayerId } from "../../types";

export type WordleMode = "daily" | "race" | "duel";
export type TileState = "correct" | "present" | "absent" | "empty";

/** One authored content-pack word (section 5.2's `{id, word, definition,
 * pack, difficultyTier, source, reviewed}` schema, minus the authoring-only
 * fields the engine itself doesn't need). Used for daily/race mode's word
 * pool - duel mode doesn't use this at all, since its words are typed in
 * live by the other player (FR-53). */
export interface WordleEntry {
  word: string; // 5 uppercase letters
  definition: string;
  pack: string;
  source: string;
}

export interface WordleGuessRow {
  letters: string[]; // length 5
  tiles: TileState[]; // length 5, shape-coded too in the UI per section 2.8
}

export interface WordlePlayerBoard {
  guesses: WordleGuessRow[]; // max 6 rows
  solved: boolean;
  hintUsed: boolean; // unlocks after guess 4, FR-55
}

/**
 * What a given player is trying to solve, plus everything needed for the
 * hint (FR-55) and the end-of-game share card (FR-58). Daily/race words
 * come from an authored content pack, so `definition`/`pack`/`source` are
 * populated and `setterHint` is null. Duel words are typed in live by the
 * *other* player (FR-53), so it's the reverse: `setterHint` may be set (an
 * optional one-liner) but there's no authored definition/pack/source to
 * show, since there's no real dictionary data to validate or describe a
 * player-typed word against. `word` is "" to mean "not set yet" (only
 * possible transiently during duel's setup phase).
 */
export interface WordleTargetInfo {
  word: string;
  definition: string | null;
  pack: string | null;
  source: string | null;
  setterHint: string | null;
}

export interface WordleState {
  players: [PlayerId, PlayerId];
  mode: WordleMode;
  istDate: string | null; // set for "daily" mode, FR-50
  /** Duel needs a setup step to collect both secret words first (FR-53);
   * daily/race skip straight to "solving" since the target is already
   * chosen at init. */
  phase: "setup" | "solving" | "done";
  targetFor: Record<PlayerId, WordleTargetInfo>; // what THIS player is trying to solve
  boards: Record<PlayerId, WordlePlayerBoard>;
}

export type WordleAction =
  | { type: "submitGuess"; word: string }
  | { type: "useHint" }
  | { type: "setSecretWord"; word: string; hint?: string }; // duel setup only, FR-53

/** Redacted view of `WordleTargetInfo` - `word`/`source` only appear once
 * solved or the game's done; `definition`/`pack`/`setterHint` appear
 * earlier too, once the hint is used (see the gating comment above
 * `redact` in engine.ts). Always present as an object (never a bare
 * null), even pre-reveal, so the UI doesn't need two different shapes to
 * check for. */
export interface WordleTargetInfoRedacted {
  word: string | null;
  definition: string | null;
  pack: string | null;
  source: string | null;
  setterHint: string | null;
}

/** Per-recipient view. The opponent's own board stays fully hidden until
 * both players are done (solved or out of guesses) - only their guess
 * count leaks early, as the "ghost indicator" FR-52 calls for in Race mode
 * (harmless to expose in every mode, so it's not mode-gated here). */
export interface WordleRedactedState extends Omit<WordleState, "targetFor" | "boards"> {
  ownTarget: WordleTargetInfoRedacted;
  ownBoard: WordlePlayerBoard;
  opponentGuessCount: number;
  opponentBoard: WordlePlayerBoard | null;
}
