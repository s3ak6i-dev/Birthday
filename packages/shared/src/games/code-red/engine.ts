// Code Red engine (v1.5). See masterdoc.md section 3.4 (FR-60..69).
//
// Shape: "briefing" (role reveal, no clock running) -> startLive -> "live"
// (the scenario plays out - examine/applyOrder on Bedside, pinCard on
// Protocol, radioPhrase on either, tick advancing the clock) -> "debrief"
// once either the correct sequence completes, 3 errors are made (FR-66's
// "code called"), or the clock runs out.
//
// Content lives in packages/content/src/schemas/code-red.ts
// (CodeRedScenarioContent) - a single scenario is handed to init() via
// options, already chosen (scenario *selection* among the 3 launch
// scenarios, FR-68, happens one layer up, same as Wordle's daily/race/duel
// mode choice happening outside the engine) and then carried inside
// CodeRedState itself as `scenario` (see that type's own comment for why -
// short version: reduce()'s signature is fixed at (state, action,
// actingPlayer), so there's nowhere else to put it).
import type { GameEngine, PlayerId } from "../../types";
import type {
  CodeRedAction,
  CodeRedRedactedState,
  CodeRedRole,
  CodeRedScenarioRuntime,
  CodeRedState,
  VitalsSnapshot,
} from "./types";

export interface CodeRedInitOptions {
  scenario: CodeRedScenarioRuntime;
  timeLimitSeconds?: number; // defaults to 300 (~5 min), FR-62
  /** For tests / deterministic replays. Defaults to Math.random. */
  rng?: () => number;
  /** For tests - force who gets which role instead of random assignment (FR-60). */
  roleOf?: Record<PlayerId, CodeRedRole>;
}

const DEFAULT_TIME_LIMIT_SECONDS = 300;
const MAX_ERRORS = 3; // FR-66: "three serious errors end the scenario as code called"
const WRONG_ORDER_TIME_PENALTY_SECONDS = 20; // FR-66: costs time, not an instant fail

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`codeRedEngine: ${message}`);
}

/** A step function, not a smooth lerp - the timeline is a set of authored
 * keyframes (FR-61's "scripted timeline"), so the current vitals are
 * whichever keyframe's atSecond is the latest one not yet in the future. */
function vitalsAt(timeline: VitalsSnapshot[], elapsedSeconds: number): VitalsSnapshot {
  let current = timeline[0]!;
  for (const point of timeline) {
    if (point.atSecond > elapsedSeconds) break;
    current = point;
  }
  return current;
}

/** FR-67: "1 to 3 stars from time remaining and error count." Exact
 * thresholds are a first-pass placeholder (not spelled out numerically in
 * masterdoc.md) pending real playtesting once a real scenario exists -
 * same spirit as triage-dial's scoreBand bands. */
function computeStars(timeRemainingSeconds: number, timeLimitSeconds: number, errors: number): 0 | 1 | 2 | 3 {
  if (errors >= MAX_ERRORS) return 0;
  const timeFrac = Math.max(0, timeRemainingSeconds) / timeLimitSeconds;
  if (errors === 0 && timeFrac >= 0.5) return 3;
  if (errors <= 1 && timeFrac >= 0.25) return 2;
  return 1;
}

function roleOfPlayer(state: CodeRedState, player: PlayerId): CodeRedRole {
  const role = state.roleOf[player];
  assert(role !== undefined, "actingPlayer is not in this game");
  return role;
}

export const codeRedEngine: GameEngine<CodeRedState, CodeRedAction, CodeRedRedactedState> = {
  id: "code-red",

  init(players: [PlayerId, PlayerId], options: unknown): CodeRedState {
    const { scenario, timeLimitSeconds = DEFAULT_TIME_LIMIT_SECONDS, rng = Math.random, roleOf } =
      options as CodeRedInitOptions;
    assert(scenario.vitalsTimeline.length > 0, "scenario has no vitals timeline");
    assert(scenario.correctSequence.length > 0, "scenario has no correct order sequence");
    const validOrderIds = new Set(scenario.orderOptions.map((o) => o.id));
    for (const orderId of scenario.correctSequence) {
      assert(validOrderIds.has(orderId), `correctSequence references unknown order id "${orderId}"`);
    }

    // FR-60: randomly assigned each game. Caller (apps/rooms) is
    // responsible for actually swapping it on a rematch - this engine has
    // no memory of past games, same as every other engine here.
    const assignedRoleOf: Record<PlayerId, CodeRedRole> =
      roleOf ??
      (rng() < 0.5
        ? { [players[0]]: "bedside", [players[1]]: "protocol" }
        : { [players[0]]: "protocol", [players[1]]: "bedside" });

    return {
      players,
      roleOf: assignedRoleOf,
      scenario,
      elapsedSeconds: 0,
      timeLimitSeconds,
      vitals: scenario.vitalsTimeline[0]!,
      ordersApplied: [],
      findingsRevealed: [],
      pinnedCards: [],
      lastRadioPhrase: null,
      errors: 0,
      phase: "briefing",
      outcome: null,
      stars: null,
    };
  },

  reduce(state: CodeRedState, action: CodeRedAction, actingPlayer: PlayerId): CodeRedState {
    assert(state.phase !== "debrief", "the scenario is already over");
    roleOfPlayer(state, actingPlayer); // throws if actingPlayer isn't in this game

    switch (action.type) {
      case "startLive": {
        assert(state.phase === "briefing", "the scenario has already started");
        return { ...state, phase: "live" };
      }

      case "tick": {
        assert(state.phase === "live", "the clock isn't running right now");
        // Guards against an out-of-order/duplicate tick moving time
        // backwards - reduce() must be pure, so this can't just trust
        // whichever tick arrives most recently in wall-clock terms.
        const elapsedSeconds = Math.max(state.elapsedSeconds, action.elapsedSeconds);
        if (elapsedSeconds >= state.timeLimitSeconds) {
          const stars = computeStars(0, state.timeLimitSeconds, state.errors);
          return { ...state, elapsedSeconds: state.timeLimitSeconds, phase: "debrief", outcome: "timeout", stars };
        }
        return { ...state, elapsedSeconds, vitals: vitalsAt(state.scenario.vitalsTimeline, elapsedSeconds) };
      }

      case "examine": {
        assert(roleOfPlayer(state, actingPlayer) === "bedside", "only Bedside can examine the patient");
        assert(state.phase === "live", "the scenario hasn't started yet");
        if (state.findingsRevealed.includes(action.regionId)) return state; // already revealed, no-op
        return { ...state, findingsRevealed: [...state.findingsRevealed, action.regionId] };
      }

      case "applyOrder": {
        assert(roleOfPlayer(state, actingPlayer) === "bedside", "only Bedside can apply orders");
        assert(state.phase === "live", "the scenario hasn't started yet");
        assert(!state.ordersApplied.includes(action.orderId), "that order was already applied");

        const nextExpected = state.scenario.correctSequence[state.ordersApplied.length];
        const correct = nextExpected === action.orderId;

        // FR-66: wrong/out-of-sequence orders cost time/vitals, not an
        // instant fail - modeled here as an error tally plus a time
        // penalty (knocking seconds off the clock reads the same to a
        // player as "losing time" without needing a second, separate
        // penalty mechanism just for this).
        if (!correct) {
          const errors = state.errors + 1;
          if (errors >= MAX_ERRORS) {
            const stars = computeStars(state.timeLimitSeconds - state.elapsedSeconds, state.timeLimitSeconds, errors);
            return { ...state, errors, phase: "debrief", outcome: "code-called", stars };
          }
          return {
            ...state,
            errors,
            elapsedSeconds: Math.min(state.timeLimitSeconds, state.elapsedSeconds + WRONG_ORDER_TIME_PENALTY_SECONDS),
          };
        }

        const ordersApplied = [...state.ordersApplied, action.orderId];
        if (ordersApplied.length >= state.scenario.correctSequence.length) {
          const timeRemaining = state.timeLimitSeconds - state.elapsedSeconds;
          const stars = computeStars(timeRemaining, state.timeLimitSeconds, state.errors);
          return { ...state, ordersApplied, phase: "debrief", outcome: "success", stars };
        }
        return { ...state, ordersApplied };
      }

      case "pinCard": {
        assert(roleOfPlayer(state, actingPlayer) === "protocol", "only Protocol can pin binder cards");
        assert(state.phase === "live", "the scenario hasn't started yet");
        const pinned = state.pinnedCards.includes(action.cardId);
        return {
          ...state,
          pinnedCards: pinned
            ? state.pinnedCards.filter((id) => id !== action.cardId)
            : [...state.pinnedCards, action.cardId],
        };
      }

      case "radioPhrase": {
        assert(state.phase === "live", "the scenario hasn't started yet");
        return {
          ...state,
          lastRadioPhrase: { by: actingPlayer, phraseId: action.phraseId, atSecond: state.elapsedSeconds },
        };
      }

      default:
        throw new Error(`codeRedEngine: unknown action ${JSON.stringify(action)}`);
    }
  },

  redact(state: CodeRedState, forPlayer: PlayerId): CodeRedRedactedState {
    const role = roleOfPlayer(state, forPlayer);
    const base: CodeRedRedactedState = {
      role,
      phase: state.phase,
      elapsedSeconds: state.elapsedSeconds,
      timeLimitSeconds: state.timeLimitSeconds,
      errors: state.errors,
      lastRadioPhrase: state.lastRadioPhrase,
      // The non-secret half of the scenario (title/briefing/examine
      // regions/order options) - same for both roles, every phase. Never
      // includes correctSequence - see this field's own doc comment.
      scenario: {
        title: state.scenario.title,
        briefing: state.scenario.briefing,
        examineFindings: state.scenario.examineFindings,
        orderOptions: state.scenario.orderOptions,
      },
    };

    if (state.phase === "debrief") {
      // FR-69: full picture shown to both once it's over, INCLUDING the
      // real correct sequence now that there's nothing left to protect by
      // withholding it - "the full correct sequence, where the pair
      // diverged" is the spec's own wording, not just "what you applied."
      return {
        ...base,
        vitals: state.vitals,
        debrief: {
          ordersApplied: state.ordersApplied,
          correctSequence: state.scenario.correctSequence,
          outcome: state.outcome,
          stars: state.stars,
          debriefNotes: state.scenario.debriefNotes,
        },
      };
    }

    // FR-63: live play stays split - each role only gets its own half.
    // Bedside never receives state.scenario (which holds correctSequence)
    // at all via this path, satisfying FR-64's "validated server-side".
    return role === "bedside"
      ? { ...base, vitals: state.vitals, findingsRevealed: state.findingsRevealed, ordersApplied: state.ordersApplied }
      : { ...base, pinnedCards: state.pinnedCards };
  },

  isTerminal(state: CodeRedState): boolean {
    return state.phase === "debrief";
  },
};
