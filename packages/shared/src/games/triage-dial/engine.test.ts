// See masterdoc.md section 8.1 (unit tests per engine: normal play, every
// win/lose condition, every lifeline/band, illegal-action rejection).
import { describe, expect, it } from "vitest";
import { triageDialEngine } from "./engine";
import type { TriageDialState, TriageSpectrumCard } from "./types";

const P1 = "p1";
const P2 = "p2";

// Fixture-only content for engine tests - NOT real sourced spectrums
// (section 5.4/5.5 cover the real packs, still empty pending authoring).
const TEST_DECK: TriageSpectrumCard[] = Array.from({ length: 10 }, (_, i) => ({
  id: `s${i + 1}`,
  leftLabel: `Left ${i + 1}`,
  rightLabel: `Right ${i + 1}`,
  category: "General",
}));
const FIRST_EIGHT_IDS = TEST_DECK.slice(0, 8).map((c) => c.id);

function freshState(mode: "coop" | "versus" = "coop", targets = Array(8).fill(50)): TriageDialState {
  return triageDialEngine.init([P1, P2], {
    deck: TEST_DECK,
    mode,
    roundSpectrumIds: FIRST_EIGHT_IDS,
    targets,
    firstClueGiver: P1,
  });
}

function dialerOf(state: TriageDialState): string {
  return state.clueGiver === P1 ? P2 : P1;
}

/** Plays the current round end to end (clue -> dial -> lock in -> reveal ->
 * argue) and leaves the state sitting in "argue", one advanceRound short of
 * moving on - so callers can inspect the just-finished round or decide
 * whether to continue. */
function playRound(state: TriageDialState, needlePosition: number): TriageDialState {
  state = triageDialEngine.reduce(state, { type: "submitClue", clue: "test clue" }, state.clueGiver);
  const dialer = dialerOf(state);
  state = triageDialEngine.reduce(state, { type: "moveNeedle", position: needlePosition }, dialer);
  state = triageDialEngine.reduce(state, { type: "lockIn" }, dialer);
  state = triageDialEngine.reduce(state, { type: "advanceRound" }, dialer); // reveal -> argue
  return state;
}

describe("init", () => {
  it("deals 8 distinct rounds, starts round 1 in the clue phase with P1 giving the clue", () => {
    const state = freshState();
    expect(state.rounds).toHaveLength(8);
    expect(new Set(state.rounds.map((r) => r.spectrum.id)).size).toBe(8);
    expect(state.round).toBe(1);
    expect(state.phase).toBe("clue");
    expect(state.clueGiver).toBe(P1);
    expect(state.scores).toEqual({ [P1]: 0, [P2]: 0 });
  });

  it("rejects a deck with fewer than 8 spectrum cards", () => {
    expect(() =>
      triageDialEngine.init([P1, P2], { deck: TEST_DECK.slice(0, 3), mode: "coop" })
    ).toThrow(/at least 8/);
  });
});

describe("clue -> dial -> lock in handshake", () => {
  it("a submitted clue moves to the dial phase", () => {
    let state = freshState();
    state = triageDialEngine.reduce(state, { type: "submitClue", clue: "Can it wait?" }, P1);
    expect(state.phase).toBe("dial");
    expect(state.rounds[0]!.clue).toBe("Can it wait?");
  });

  it("the needle clamps to 0-100 and only the dialer can move it", () => {
    let state = freshState();
    state = triageDialEngine.reduce(state, { type: "submitClue", clue: "clue" }, P1);
    state = triageDialEngine.reduce(state, { type: "moveNeedle", position: 140 }, P2);
    expect(state.rounds[0]!.needlePosition).toBe(100);
    state = triageDialEngine.reduce(state, { type: "moveNeedle", position: -20 }, P2);
    expect(state.rounds[0]!.needlePosition).toBe(0);

    expect(() => triageDialEngine.reduce(state, { type: "moveNeedle", position: 50 }, P1)).toThrow(
      /only the dialer/
    );
  });

  it("locking in scores the round and moves to reveal; needle must be moved first", () => {
    let state = freshState(); // target forced to 50
    state = triageDialEngine.reduce(state, { type: "submitClue", clue: "clue" }, P1);
    expect(() => triageDialEngine.reduce(state, { type: "lockIn" }, P2)).toThrow(/move the needle/);

    state = triageDialEngine.reduce(state, { type: "moveNeedle", position: 50 }, P2);
    state = triageDialEngine.reduce(state, { type: "lockIn" }, P2);
    expect(state.phase).toBe("reveal");
    expect(state.rounds[0]!.lockedIn).toBe(true);
    expect(state.rounds[0]!.score).toBe(4); // bullseye
  });
});

describe("scoring bands (FR-43)", () => {
  it.each([
    [50, 4], // diff 0 - bullseye
    [60, 4], // diff 10 - bullseye boundary
    [70, 3], // diff 20 - close boundary
    [85, 2], // diff 35 - edge boundary
    [86, 0], // diff 36 - miss
  ])("needle at %i against target 50 scores %i points", (needlePosition, expectedScore) => {
    let state = freshState();
    state = triageDialEngine.reduce(state, { type: "submitClue", clue: "clue" }, P1);
    state = triageDialEngine.reduce(state, { type: "moveNeedle", position: needlePosition }, P2);
    state = triageDialEngine.reduce(state, { type: "lockIn" }, P2);
    expect(state.rounds[0]!.score).toBe(expectedScore);
  });
});

describe("score crediting by mode", () => {
  it("coop: both players' totals move together", () => {
    let state = freshState("coop");
    state = playRound(state, 50); // bullseye, +4
    expect(state.scores).toEqual({ [P1]: 4, [P2]: 4 });
  });

  it("versus: only the dialer is credited", () => {
    let state = freshState("versus"); // P1 clue-gives, P2 dials round 1
    state = playRound(state, 50); // bullseye, +4 to the dialer (P2) only
    expect(state.scores).toEqual({ [P1]: 0, [P2]: 4 });
  });
});

describe("round progression", () => {
  it("advanceRound moves reveal -> argue -> the next round's clue phase, swapping clue-giver", () => {
    let state = freshState();
    state = playRound(state, 50); // ends in argue
    expect(state.phase).toBe("argue");

    state = triageDialEngine.reduce(state, { type: "advanceRound" }, P1);
    expect(state.phase).toBe("clue");
    expect(state.round).toBe(2);
    expect(state.clueGiver).toBe(P2); // alternates every round, FR-45/46
  });

  it("finishes after round 8 when not tied", () => {
    let state = freshState("coop");
    for (let round = 1; round <= 8; round++) {
      state = playRound(state, 50); // -> argue
      state = triageDialEngine.reduce(state, { type: "advanceRound" }, state.clueGiver); // -> next clue, or done
    }
    expect(state.phase).toBe("done");
    expect(triageDialEngine.isTerminal(state)).toBe(true);
  });
});

describe("versus tie replay (FR-46)", () => {
  it("replays round 8 instead of ending when scores are tied", () => {
    // Clue-giver alternates every round starting with P1, and 8 rounds is
    // even, so each player dials exactly 4 of the 8 rounds. With the
    // needle dead-on target every time (every round a bullseye), that
    // guarantees both players finish round 8 with identical totals
    // (4 dials * 4 points = 16 each) - a tie every time, not a maybe.
    let state = freshState("versus");
    for (let round = 1; round <= 8; round++) {
      state = playRound(state, 50); // -> argue
      state = triageDialEngine.reduce(state, { type: "advanceRound" }, state.clueGiver); // -> replay's "clue", not "done"
    }
    expect(state.scores).toEqual({ [P1]: 16, [P2]: 16 });

    // The replay fires as part of that last advanceRound call above, so by
    // now round 8 should already be reset and waiting on a fresh clue.
    expect(state.round).toBe(8);
    expect(state.phase).toBe("clue");
    expect(state.rounds[7]!.lockedIn).toBe(false);
    expect(state.rounds[7]!.clue).toBeNull();
  });
});

describe("redact", () => {
  it("hides the current round's target from the dialer until reveal, but not from the clue-giver", () => {
    const state = freshState(); // P1 clue-gives, P2 dials, round 1 phase "clue"
    const forDialer = triageDialEngine.redact(state, P2);
    expect(forDialer.rounds[0]!.target).toBeNull();

    const forClueGiver = triageDialEngine.redact(state, P1);
    expect(forClueGiver.rounds[0]!.target).toBe(50);
  });

  it("reveals the target to the dialer once the round reaches reveal", () => {
    let state = freshState();
    state = triageDialEngine.reduce(state, { type: "submitClue", clue: "clue" }, P1);
    state = triageDialEngine.reduce(state, { type: "moveNeedle", position: 50 }, P2);
    state = triageDialEngine.reduce(state, { type: "lockIn" }, P2);

    const forDialer = triageDialEngine.redact(state, P2);
    expect(forDialer.rounds[0]!.target).toBe(50);
  });

  it("hides every future round's target from both players, dealt upfront or not", () => {
    const state = freshState();
    const forClueGiver = triageDialEngine.redact(state, P1);
    const forDialer = triageDialEngine.redact(state, P2);
    for (const view of [forClueGiver, forDialer]) {
      for (let i = 1; i < 8; i++) {
        expect(view.rounds[i]!.target).toBeNull();
      }
    }
  });

  it("keeps past rounds' targets visible to both players once played", () => {
    let state = freshState();
    state = playRound(state, 50);
    state = triageDialEngine.reduce(state, { type: "advanceRound" }, P2); // -> round 2, clue phase

    const forP1 = triageDialEngine.redact(state, P1);
    const forP2 = triageDialEngine.redact(state, P2);
    expect(forP1.rounds[0]!.target).toBe(50);
    expect(forP2.rounds[0]!.target).toBe(50);
  });
});

describe("illegal actions", () => {
  it("rejects a clue from the dialer", () => {
    const state = freshState();
    expect(() => triageDialEngine.reduce(state, { type: "submitClue", clue: "clue" }, P2)).toThrow(
      /only the clue-giver/
    );
  });

  it("rejects an empty clue", () => {
    const state = freshState();
    expect(() => triageDialEngine.reduce(state, { type: "submitClue", clue: "   " }, P1)).toThrow(/not be empty/);
  });

  it("rejects moving the needle before a clue exists", () => {
    const state = freshState();
    expect(() => triageDialEngine.reduce(state, { type: "moveNeedle", position: 50 }, P2)).toThrow(
      /not time to move the needle/
    );
  });

  it("rejects any action once the game is done", () => {
    let state = freshState("coop");
    for (let round = 1; round <= 8; round++) {
      state = playRound(state, 50);
      state = triageDialEngine.reduce(state, { type: "advanceRound" }, state.clueGiver);
    }
    expect(state.phase).toBe("done");
    expect(() => triageDialEngine.reduce(state, { type: "submitClue", clue: "clue" }, P1)).toThrow(/already over/);
  });

  it("rejects an acting player who isn't in the game", () => {
    const state = freshState();
    expect(() => triageDialEngine.reduce(state, { type: "submitClue", clue: "clue" }, "p3")).toThrow(
      /not in this game/
    );
  });
});

describe("isTerminal", () => {
  it("is false until phase is done", () => {
    const state = freshState();
    expect(triageDialEngine.isTerminal(state)).toBe(false);
  });
});
