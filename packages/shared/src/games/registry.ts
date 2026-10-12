// A GameId -> engine lookup, so the rooms Durable Object (apps/rooms) can
// dispatch actions generically without a switch statement per game. See
// masterdoc.md section 4.6/4.7.
//
// The `any`s here are a deliberate, contained exception to this repo's
// usual typing discipline: a single map holding five *different*
// GameEngine<TState, TAction, TRedacted> instantiations has no sound way
// to stay fully generic in TypeScript's structural type system without
// either `any` here or unsafe casts at every call site instead. Every real
// usage - the game board components, the engine unit tests - imports its
// own engine directly and gets full type safety there; only the room
// layer's generic dispatch goes through this untyped lookup, and it only
// ever calls the three methods already shared by `GameEngine<unknown,
// unknown, unknown>` (init/reduce/redact/isTerminal), so there's nothing
// for stronger typing here to actually catch.
import type { GameEngine, GameId } from "../types";
import { guessTheDiagnosisEngine } from "./guess-the-diagnosis/engine";
import { triageDialEngine } from "./triage-dial/engine";
import { wordleEngine } from "./wordle/engine";
import { codeRedEngine } from "./code-red/engine";
import { caseFilesEngine } from "./case-files/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAME_ENGINES: Record<GameId, GameEngine<any, any, any>> = {
  "guess-the-diagnosis": guessTheDiagnosisEngine,
  "triage-dial": triageDialEngine,
  wordle: wordleEngine,
  "code-red": codeRedEngine,
  "case-files": caseFilesEngine,
};
