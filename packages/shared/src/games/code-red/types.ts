// Code Red (v1.5). See masterdoc.md section 3.4 (FR-60..69).
import type { PlayerId } from "../../types";

export type CodeRedRole = "bedside" | "protocol";

export interface VitalsSnapshot {
  atSecond: number; // position in the scripted timeline
  hr: number;
  bpSystolic: number;
  bpDiastolic: number;
  spo2: number;
  bloodLossMl?: number;
}

export interface CodeRedOrder {
  id: string;
  label: string;
}

export type CodeRedOutcome = "success" | "code-called" | "timeout";

/** The slice of scenario content the engine actually needs at runtime
 * (vitals timeline for `tick`, order options + correct sequence for
 * `applyOrder`'s server-side validation, FR-64). Embedded in CodeRedState
 * itself (set once by init(), never mutated after) rather than passed as
 * a separate reduce() argument, since GameEngine.reduce's signature is
 * fixed at (state, action, actingPlayer) - apps/rooms' generic dispatch
 * has no way to thread a 4th, per-game argument through. redact() must
 * never spread this wholesale into a redacted view - Bedside's view in
 * particular must never see `correctSequence` while the scenario is
 * still "live" (FR-64 says this is validated *server-side*; if the
 * answer key rode along in the redacted state, the client would just be
 * trusted not to read it, which isn't the same thing). */
export interface CodeRedScenarioRuntime {
  id: string;
  vitalsTimeline: VitalsSnapshot[]; // sorted by atSecond
  examineFindings: { regionId: string; text: string }[];
  orderOptions: CodeRedOrder[];
  correctSequence: string[]; // order ids, in the required sequence - FR-64
}

export interface CodeRedState {
  players: [PlayerId, PlayerId];
  roleOf: Record<PlayerId, CodeRedRole>;
  scenario: CodeRedScenarioRuntime;
  // Deliberately NOT a wall-clock timestamp (e.g. Date.now()) - reduce()
  // must stay pure (same state+action always produces the same next
  // state, per the GameEngine contract in ../../types.ts), so time only
  // ever advances via an explicit `tick` action carrying the client's own
  // elapsedSeconds reading, the same pattern already used for Triage
  // Dial's frequent moveNeedle updates (and already rate-limited the same
  // way in apps/rooms/src/ward-room.ts).
  elapsedSeconds: number;
  timeLimitSeconds: number; // ~300, FR-62
  vitals: VitalsSnapshot;
  ordersApplied: string[];
  findingsRevealed: string[]; // bedside-only while live, FR-61
  pinnedCards: string[]; // protocol-only while live, FR-62
  lastRadioPhrase: { by: PlayerId; phraseId: string; atSecond: number } | null; // FR-65
  errors: number; // 3 serious errors -> "code called" failure, FR-66
  phase: "briefing" | "live" | "debrief";
  outcome: CodeRedOutcome | null;
  stars: 0 | 1 | 2 | 3 | null;
}

export type CodeRedAction =
  | { type: "startLive" } // either role - leaves briefing, starts the scenario clock
  | { type: "tick"; elapsedSeconds: number } // client-paced clock advance while live, FR-62's countdown
  | { type: "examine"; regionId: string } // bedside only, FR-61
  | { type: "applyOrder"; orderId: string } // bedside only, validated server-side, FR-64
  | { type: "pinCard"; cardId: string } // protocol only, FR-62
  | { type: "radioPhrase"; phraseId: string }; // either role, FR-65

/**
 * Bedside never sees the protocol binder; protocol never sees live vitals
 * detail (FR-63) - but at debrief (FR-69) the full picture (what was
 * ordered, how it went, the score) is shown to both, so this isn't a
 * strict per-role Pick the way it first looked: the optional fields below
 * are present/absent by *phase*, not just by *role*.
 */
export interface CodeRedRedactedState {
  role: CodeRedRole;
  phase: CodeRedState["phase"];
  elapsedSeconds: number;
  timeLimitSeconds: number;
  errors: number;
  lastRadioPhrase: CodeRedState["lastRadioPhrase"];
  /** Bedside-only while live. */
  vitals?: VitalsSnapshot;
  findingsRevealed?: string[];
  /** Protocol-only while live. */
  pinnedCards?: string[];
  /** Visible to both once phase is "debrief" (FR-69) - undefined before then. */
  ordersApplied?: string[];
  outcome?: CodeRedOutcome | null;
  stars?: CodeRedState["stars"];
}
