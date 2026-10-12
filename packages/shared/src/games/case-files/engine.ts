// Case Files engine (v2). See masterdoc.md section 3.5 (FR-70..79).
// TODO (M6, section 7.1): implement init/reduce/redact/isTerminal, including
// the share-pool and hint-token accounting, and star scoring on submit
// (FR-75). Content schema lives in packages/content/src/schemas (section 5.2,
// CaseFile) - every evidence card must map to exactly one grid answer,
// validated at build time (FR-79).

import type { GameEngine } from "../../types";
import type { CaseFilesAction, CaseFilesRedactedState, CaseFilesState } from "./types";

export const caseFilesEngine: GameEngine<CaseFilesState, CaseFilesAction, CaseFilesRedactedState> = {
  id: "case-files",
  init(_players, _options) {
    throw new Error("TODO: caseFilesEngine.init - see masterdoc.md section 3.5");
  },
  reduce(state, _action, _actingPlayer) {
    throw new Error("TODO: caseFilesEngine.reduce - see masterdoc.md FR-72..75");
    return state;
  },
  redact(state, _forPlayer) {
    throw new Error("TODO: caseFilesEngine.redact - split evidence hands, FR-71/72");
    return state as unknown as CaseFilesRedactedState;
  },
  isTerminal(state) {
    return state.submitted !== null;
  },
};
