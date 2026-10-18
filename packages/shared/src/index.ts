// @ward-games/shared - game engines, types, and tunable config shared by
// apps/web and apps/rooms. See masterdoc.md section 4.7.

export * from "./types";
export * from "./config";
export * from "./stickers";
export * from "./rooms/messages";
export * from "./scenes/types";
export * from "./placeholder-content";

export { triageDialEngine } from "./games/triage-dial/engine";
export { guessTheDiagnosisEngine } from "./games/guess-the-diagnosis/engine";
export { wordleEngine, MIN_WORD_LENGTH, MAX_WORD_LENGTH } from "./games/wordle/engine";
export { codeRedEngine } from "./games/code-red/engine";
export { caseFilesEngine } from "./games/case-files/engine";
export { GAME_ENGINES } from "./games/registry";

export type * from "./games/triage-dial/types";
export type * from "./games/guess-the-diagnosis/types";
export type * from "./games/wordle/types";
export type * from "./games/code-red/types";
export type * from "./games/case-files/types";
