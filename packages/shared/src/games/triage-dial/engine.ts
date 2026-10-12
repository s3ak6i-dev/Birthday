// Triage Dial engine. See masterdoc.md section 3.2 (FR-40..49).
//
// Round shape: "clue" (clue-giver submits a one-line clue) -> "dial" (the
// *other* player drags the needle and locks in) -> "reveal" (target shown,
// score computed) -> "argue" (a beat for the reaction bar / taunts, purely
// a UI window - modeled as its own phase anyway since the type already
// shaped it that way) -> back to "clue" for the next round, or "done".
//
// `advanceRound` is one action reused for both the reveal->argue and the
// argue->next-round transitions, since neither needs new input from
// either player - it just moves the state machine forward one step from
// wherever it currently sits.
//
// Scoring (FR-43) always computes a band off |needlePosition - target|;
// who gets credited for it differs by mode (see the `scores` field comment
// in types.ts) but the band math itself doesn't.
//
// Versus tie-break (FR-46, "ties replay the final round"): reaching round
// 8's argue phase with equal scores in versus mode deals a fresh spectrum
// for round 8 instead of ending the game, and loops again if that replay
// is *also* tied - rare, but simpler to let it loop than to special-case
// "only replay once".

import type { GameEngine, PlayerId } from "../../types";
import type { TriageDialAction, TriageDialRedactedState, TriageDialState, TriageRound, TriageSpectrumCard } from "./types";

const ROUNDS_PER_GAME = 8;

export interface TriageDialInitOptions {
  deck: TriageSpectrumCard[]; // the pack(s) chosen pre-game - FR-40
  mode: "coop" | "versus";
  /** For tests / deterministic replays. Defaults to Math.random. */
  rng?: () => number;
  /** For tests - skip the random deal and assign these directly (8 entries, one per round). */
  roundSpectrumIds?: string[];
  targets?: number[];
  /** For tests - who gives the clue in round 1. Defaults to players[0]. */
  firstClueGiver?: PlayerId;
}

function otherPlayer(players: [PlayerId, PlayerId], player: PlayerId): PlayerId {
  return players[0] === player ? players[1] : players[0];
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`triageDialEngine: ${message}`);
}

function scoreBand(target: number, needlePosition: number): number {
  const diff = Math.abs(target - needlePosition);
  if (diff <= 10) return 4; // bullseye
  if (diff <= 20) return 3; // close
  if (diff <= 35) return 2; // edge
  return 0; // miss
}

function dealSpectrum(
  deck: TriageSpectrumCard[],
  excludeIds: ReadonlySet<string>,
  rng: () => number
): TriageSpectrumCard {
  const available = deck.filter((card) => !excludeIds.has(card.id));
  assert(available.length > 0, "deck has no unused spectrum cards left to deal");
  const card = available[Math.floor(rng() * available.length)];
  assert(card !== undefined, "dealt index out of range");
  return card;
}

function dealRound(
  deck: TriageSpectrumCard[],
  excludeIds: ReadonlySet<string>,
  rng: () => number,
  forcedSpectrumId?: string,
  forcedTarget?: number
): TriageRound {
  const spectrum = forcedSpectrumId
    ? deck.find((c) => c.id === forcedSpectrumId) ?? assertUnreachable(`unknown spectrum id ${forcedSpectrumId}`)
    : dealSpectrum(deck, excludeIds, rng);
  const target = forcedTarget ?? Math.floor(rng() * 101); // 0-100 inclusive, FR-41
  return { spectrum, target, clue: null, needlePosition: null, lockedIn: false, score: null };
}

function assertUnreachable(message: string): never {
  throw new Error(`triageDialEngine: ${message}`);
}

/** A small deterministic string hash -> [0, 100], used only for the rare
 * tie-break replay target (see the note where it's called) where `reduce`
 * needs a "random-looking" number without actually calling Math.random(). */
function deterministicTarget(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 101;
}

export const triageDialEngine: GameEngine<TriageDialState, TriageDialAction, TriageDialRedactedState> = {
  id: "triage-dial",

  init(players: [PlayerId, PlayerId], options: unknown): TriageDialState {
    const { deck, mode, rng = Math.random, roundSpectrumIds, targets, firstClueGiver } =
      options as TriageDialInitOptions;
    assert(deck.length >= ROUNDS_PER_GAME, `deck must have at least ${ROUNDS_PER_GAME} spectrum cards`);

    const usedIds = new Set<string>();
    const rounds: TriageRound[] = [];
    for (let i = 0; i < ROUNDS_PER_GAME; i++) {
      const round = dealRound(deck, usedIds, rng, roundSpectrumIds?.[i], targets?.[i]);
      usedIds.add(round.spectrum.id);
      rounds.push(round);
    }

    const clueGiver = firstClueGiver ?? players[0];
    return {
      players,
      mode,
      round: 1,
      clueGiver,
      rounds,
      phase: "clue",
      deck,
      scores: { [players[0]]: 0, [players[1]]: 0 },
    };
  },

  reduce(state: TriageDialState, action: TriageDialAction, actingPlayer: PlayerId): TriageDialState {
    assert(state.phase !== "done", "the game is already over");
    assert(state.players.includes(actingPlayer), "actingPlayer is not in this game");

    const roundIndex = state.round - 1;
    const currentRound = state.rounds[roundIndex];
    assert(currentRound !== undefined, "round index out of range");
    const dialer = otherPlayer(state.players, state.clueGiver);

    switch (action.type) {
      case "submitClue": {
        assert(state.phase === "clue", "no clue is expected right now");
        assert(actingPlayer === state.clueGiver, "only the clue-giver can submit a clue");
        assert(action.clue.trim().length > 0, "clue must not be empty");
        const rounds = [...state.rounds];
        rounds[roundIndex] = { ...currentRound, clue: action.clue.trim() };
        return { ...state, rounds, phase: "dial" };
      }

      case "moveNeedle": {
        assert(state.phase === "dial", "it is not time to move the needle");
        assert(actingPlayer === dialer, "only the dialer can move the needle");
        const position = Math.max(0, Math.min(100, action.position));
        const rounds = [...state.rounds];
        rounds[roundIndex] = { ...currentRound, needlePosition: position };
        return { ...state, rounds };
      }

      case "lockIn": {
        assert(state.phase === "dial", "it is not time to lock in");
        assert(actingPlayer === dialer, "only the dialer can lock in");
        assert(currentRound.needlePosition !== null, "move the needle before locking in");

        const score = scoreBand(currentRound.target, currentRound.needlePosition);
        const rounds = [...state.rounds];
        rounds[roundIndex] = { ...currentRound, lockedIn: true, score };

        const scores = { ...state.scores };
        if (state.mode === "coop") {
          // shared pot - both players' numbers move together (see types.ts)
          scores[state.players[0]] = (scores[state.players[0]] ?? 0) + score;
          scores[state.players[1]] = (scores[state.players[1]] ?? 0) + score;
        } else {
          scores[dialer] = (scores[dialer] ?? 0) + score;
        }

        return { ...state, rounds, phase: "reveal", scores };
      }

      case "advanceRound": {
        if (state.phase === "reveal") {
          return { ...state, phase: "argue" };
        }

        assert(state.phase === "argue", "there is nothing to advance right now");

        const isLastRound = state.round >= ROUNDS_PER_GAME;
        const tied = state.mode === "versus" && state.scores[state.players[0]] === state.scores[state.players[1]];

        if (isLastRound && !tied) {
          return { ...state, phase: "done" };
        }

        const nextClueGiver = otherPlayer(state.players, state.clueGiver);
        const usedIds = new Set(state.rounds.map((r) => r.spectrum.id));

        if (isLastRound && tied) {
          // FR-46: replay the final round with a fresh spectrum instead of
          // ending on a tie - round number stays 8, everything else about
          // that slot resets. `reduce` must stay pure (same input -> same
          // output, per the GameEngine contract in types.ts), so this picks
          // the first unused card in deck order rather than calling
          // Math.random() mid-game - deterministic, not actually random,
          // but the deck's own ordering already isn't meaningful to players.
          const next = state.deck.find((card) => !usedIds.has(card.id));
          assert(next !== undefined, "no unused spectrum cards left in the deck for a tie-break replay");
          const replay: TriageRound = {
            spectrum: next,
            target: deterministicTarget(`${next.id}:${state.players[0]}:${state.players[1]}`),
            clue: null,
            needlePosition: null,
            lockedIn: false,
            score: null,
          };
          const rounds = [...state.rounds];
          rounds[ROUNDS_PER_GAME - 1] = replay;
          return { ...state, rounds, clueGiver: nextClueGiver, phase: "clue" };
        }

        return { ...state, round: state.round + 1, clueGiver: nextClueGiver, phase: "clue" };
      }

      default:
        throw new Error(`triageDialEngine: unknown action ${JSON.stringify(action)}`);
    }
  },

  redact(state: TriageDialState, forPlayer: PlayerId): TriageDialRedactedState {
    const dialer = otherPlayer(state.players, state.clueGiver);
    const currentIndex = state.round - 1;
    const currentRevealed = state.phase === "reveal" || state.phase === "argue" || state.phase === "done";

    return {
      ...state,
      rounds: state.rounds.map((round, i) => {
        if (i < currentIndex) return round; // past rounds: already revealed, stay visible to both
        if (i === currentIndex) {
          // the clue-giver always knows their own target (FR-41); the
          // dialer only finds out once this round reaches reveal (FR-48)
          const visible = currentRevealed || forPlayer !== dialer;
          return visible ? round : { ...round, target: null };
        }
        // every round is dealt upfront at init (see dealRound calls in
        // init()), so without this, a future round's target would leak to
        // both players well before that round is even reached - hide it
        // from everyone until its turn comes
        return { ...round, target: null };
      }),
    };
  },

  isTerminal(state: TriageDialState): boolean {
    return state.phase === "done";
  },
};
