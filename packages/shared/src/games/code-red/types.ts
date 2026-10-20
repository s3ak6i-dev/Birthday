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
  /** Display-only - the engine itself never reads these, so they're
   * optional here rather than forcing every caller (e.g. engine tests'
   * minimal fixtures) to invent flavor text just to satisfy the type. The
   * real content schema (packages/content/src/schemas/code-red.ts)
   * requires all three; this type is intentionally the smaller "what the
   * engine needs" shape a full CodeRedScenarioContent still satisfies. */
  title?: string;
  briefing?: string;
  debriefNotes?: string;
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
  /** The non-secret half of the scenario - title/briefing text, the
   * examinable regions, and the order options - same for both roles,
   * every phase. `correctSequence` is NOT here: it's the one genuinely
   * secret field (FR-64: validated server-side, never trust the client
   * with it while "live"), so it only ever rides along inside the
   * `debrief` object below, once the scenario is actually over and FR-69
   * explicitly calls for showing it ("the full correct sequence, where
   * the pair diverged"). */
  scenario: { title?: string; briefing?: string; examineFindings: { regionId: string; text: string }[]; orderOptions: CodeRedOrder[] };
  /** Bedside-only while live - their own progress so far (not secret from
   * Bedside itself, just from Protocol - FR-63 is about the two roles not
   * seeing *each other's* screen, not Bedside forgetting its own clicks). */
  vitals?: VitalsSnapshot;
  findingsRevealed?: string[];
  ordersApplied?: string[];
  /** Protocol-only while live. */
  pinnedCards?: string[];
  /** Only present once phase is "debrief" (FR-69) - what was actually
   * applied, the real correct sequence (safe to reveal now that the
   * scenario is over), the outcome/star score, and the sourced teaching
   * note. */
  debrief?: {
    ordersApplied: string[];
    correctSequence: string[];
    outcome: CodeRedOutcome | null;
    stars: CodeRedState["stars"];
    debriefNotes?: string;
  };
}
