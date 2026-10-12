// Code Red engine (v1.5). See masterdoc.md section 3.4 (FR-60..69).
// TODO (M5, section 7.1): implement init/reduce/redact/isTerminal, including
// the scripted vitals timeline per scenario and the correct-sequence
// validation for applyOrder (FR-64). Content schema lives in
// packages/content/src/schemas (section 5.2, CodeRedScenario).

import type { GameEngine } from "../../types";
import type { CodeRedAction, CodeRedRedactedState, CodeRedState } from "./types";

export const codeRedEngine: GameEngine<CodeRedState, CodeRedAction, CodeRedRedactedState> = {
  id: "code-red",
  init(_players, _options) {
    throw new Error("TODO: codeRedEngine.init - see masterdoc.md section 3.4");
  },
  reduce(state, _action, _actingPlayer) {
    throw new Error("TODO: codeRedEngine.reduce - see masterdoc.md FR-64..66");
    return state;
  },
  redact(state, _forPlayer) {
    throw new Error("TODO: codeRedEngine.redact - split bedside/protocol views, FR-63");
    return state as unknown as CodeRedRedactedState;
  },
  isTerminal(state) {
    return state.phase === "debrief";
  },
};
