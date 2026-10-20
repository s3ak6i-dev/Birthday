// See masterdoc.md section 8.1 (unit tests per engine: normal play, every
// win/lose condition, every lifeline/band, illegal-action rejection).
import { describe, expect, it } from "vitest";
import { codeRedEngine } from "./engine";
import type { CodeRedScenarioRuntime, CodeRedState } from "./types";

const P1 = "p1";
const P2 = "p2";

// Fixture-only content - NOT a real sourced scenario (section 5.4/5.5
// cover the real packs, still empty pending authoring). Three orders,
// correct sequence is o1 -> o2 -> o3.
const TEST_SCENARIO: CodeRedScenarioRuntime = {
  id: "test-scenario",
  vitalsTimeline: [
    { atSecond: 0, hr: 110, bpSystolic: 100, bpDiastolic: 70, spo2: 97 },
    { atSecond: 60, hr: 130, bpSystolic: 85, bpDiastolic: 55, spo2: 94 },
    { atSecond: 120, hr: 150, bpSystolic: 70, bpDiastolic: 40, spo2: 90 },
  ],
  examineFindings: [
    { regionId: "abdomen", text: "test finding" },
    { regionId: "pulse", text: "test finding 2" },
  ],
  orderOptions: [
    { id: "o1", label: "Order 1" },
    { id: "o2", label: "Order 2" },
    { id: "o3", label: "Order 3" },
  ],
  correctSequence: ["o1", "o2", "o3"],
};

function freshState(roleOf?: Record<string, "bedside" | "protocol">): CodeRedState {
  return codeRedEngine.init([P1, P2], { scenario: TEST_SCENARIO, roleOf, timeLimitSeconds: 300 });
}

function bedsideOf(state: CodeRedState): string {
  return state.roleOf[P1] === "bedside" ? P1 : P2;
}
function protocolOf(state: CodeRedState): string {
  return state.roleOf[P1] === "protocol" ? P1 : P2;
}

describe("init", () => {
  it("assigns complementary roles and starts in briefing with no orders/errors yet", () => {
    const state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    expect(state.roleOf).toEqual({ [P1]: "bedside", [P2]: "protocol" });
    expect(state.phase).toBe("briefing");
    expect(state.elapsedSeconds).toBe(0);
    expect(state.ordersApplied).toEqual([]);
    expect(state.errors).toBe(0);
    expect(state.vitals).toEqual(TEST_SCENARIO.vitalsTimeline[0]);
  });

  it("assigns roles randomly when none are forced, both ways possible", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const state = codeRedEngine.init([P1, P2], {
        scenario: TEST_SCENARIO,
        rng: () => (i % 2 === 0 ? 0.1 : 0.9),
      });
      seen.add(state.roleOf[P1]!);
    }
    expect(seen).toEqual(new Set(["bedside", "protocol"]));
  });

  it("rejects a scenario whose correctSequence references an unknown order id", () => {
    const bad: CodeRedScenarioRuntime = { ...TEST_SCENARIO, correctSequence: ["o1", "nope"] };
    expect(() => codeRedEngine.init([P1, P2], { scenario: bad })).toThrow(/unknown order id/);
  });
});

describe("startLive", () => {
  it("moves briefing -> live", () => {
    let state = freshState();
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    expect(state.phase).toBe("live");
  });

  it("rejects starting twice", () => {
    let state = freshState();
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    expect(() => codeRedEngine.reduce(state, { type: "startLive" }, P1)).toThrow(/already started/);
  });
});

describe("examine", () => {
  it("only Bedside can examine, and repeated examines of the same region are a no-op", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    state = codeRedEngine.reduce(state, { type: "examine", regionId: "abdomen" }, P1);
    expect(state.findingsRevealed).toEqual(["abdomen"]);

    const again = codeRedEngine.reduce(state, { type: "examine", regionId: "abdomen" }, P1);
    expect(again.findingsRevealed).toEqual(["abdomen"]); // same array contents, not duplicated

    expect(() => codeRedEngine.reduce(state, { type: "examine", regionId: "pulse" }, P2)).toThrow(/only Bedside/);
  });
});

describe("applyOrder", () => {
  it("applying the full correct sequence ends the scenario as success with stars from time/errors", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    const bedside = bedsideOf(state);
    state = codeRedEngine.reduce(state, { type: "startLive" }, bedside);
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o1" }, bedside);
    expect(state.phase).toBe("live");
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o2" }, bedside);
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o3" }, bedside);

    expect(state.phase).toBe("debrief");
    expect(state.outcome).toBe("success");
    expect(state.ordersApplied).toEqual(["o1", "o2", "o3"]);
    // No time elapsed, no errors - top score.
    expect(state.stars).toBe(3);
  });

  it("only Bedside can apply orders", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    expect(() => codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o1" }, protocolOf(state))).toThrow(
      /only Bedside/
    );
  });

  it("a wrong/out-of-sequence order costs time and tallies an error instead of failing instantly", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    const bedside = bedsideOf(state);
    state = codeRedEngine.reduce(state, { type: "startLive" }, bedside);
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o3" }, bedside); // out of order
    expect(state.phase).toBe("live"); // not instantly over
    expect(state.errors).toBe(1);
    expect(state.elapsedSeconds).toBeGreaterThan(0); // time penalty applied
    expect(state.ordersApplied).toEqual([]); // the wrong order was never recorded as applied
  });

  it("three wrong orders end the scenario as code-called with 0 stars", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    const bedside = bedsideOf(state);
    state = codeRedEngine.reduce(state, { type: "startLive" }, bedside);
    // Three distinct wrong-at-the-time order ids so "already applied" never blocks these.
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o3" }, bedside);
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o2" }, bedside);
    expect(state.errors).toBe(2);
    expect(state.phase).toBe("live");
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o3" }, bedside);
    expect(state.phase).toBe("debrief");
    expect(state.outcome).toBe("code-called");
    expect(state.stars).toBe(0);
  });

  it("rejects applying the same order twice", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    const bedside = bedsideOf(state);
    state = codeRedEngine.reduce(state, { type: "startLive" }, bedside);
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o1" }, bedside);
    expect(() => codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o1" }, bedside)).toThrow(
      /already applied/
    );
  });
});

describe("tick", () => {
  it("advances elapsedSeconds and recomputes vitals from the scripted timeline", () => {
    let state = freshState();
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    state = codeRedEngine.reduce(state, { type: "tick", elapsedSeconds: 60 }, P1);
    expect(state.elapsedSeconds).toBe(60);
    expect(state.vitals).toEqual(TEST_SCENARIO.vitalsTimeline[1]);
  });

  it("never moves time backwards on an out-of-order tick", () => {
    let state = freshState();
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    state = codeRedEngine.reduce(state, { type: "tick", elapsedSeconds: 60 }, P1);
    state = codeRedEngine.reduce(state, { type: "tick", elapsedSeconds: 10 }, P1); // stale/out-of-order
    expect(state.elapsedSeconds).toBe(60);
  });

  it("running out the clock ends the scenario as a timeout", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    state = codeRedEngine.reduce(state, { type: "tick", elapsedSeconds: 300 }, P1);
    expect(state.phase).toBe("debrief");
    expect(state.outcome).toBe("timeout");
  });

  it("rejects ticking before the scenario has started", () => {
    const state = freshState();
    expect(() => codeRedEngine.reduce(state, { type: "tick", elapsedSeconds: 5 }, P1)).toThrow(/isn't running/);
  });
});

describe("pinCard", () => {
  it("only Protocol can pin, and pinning the same card twice toggles it off", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    const protocol = protocolOf(state);
    state = codeRedEngine.reduce(state, { type: "startLive" }, protocol);
    state = codeRedEngine.reduce(state, { type: "pinCard", cardId: "algo-1" }, protocol);
    expect(state.pinnedCards).toEqual(["algo-1"]);
    state = codeRedEngine.reduce(state, { type: "pinCard", cardId: "algo-1" }, protocol);
    expect(state.pinnedCards).toEqual([]);

    expect(() => codeRedEngine.reduce(state, { type: "pinCard", cardId: "algo-1" }, bedsideOf(state))).toThrow(
      /only Protocol/
    );
  });
});

describe("radioPhrase", () => {
  it("either role can send one, and it's recorded with who sent it", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    state = codeRedEngine.reduce(state, { type: "radioPhrase", phraseId: "copy-that" }, P2);
    expect(state.lastRadioPhrase).toEqual({ by: P2, phraseId: "copy-that", atSecond: 0 });
  });
});

describe("illegal actions", () => {
  it("rejects an action from a player not in this game", () => {
    const state = freshState();
    expect(() => codeRedEngine.reduce(state, { type: "startLive" }, "stranger")).toThrow(/not in this game/);
  });

  it("rejects any action once the scenario is already over", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    state = codeRedEngine.reduce(state, { type: "tick", elapsedSeconds: 300 }, P1);
    expect(state.phase).toBe("debrief");
    expect(() => codeRedEngine.reduce(state, { type: "radioPhrase", phraseId: "x" }, P1)).toThrow(/already over/);
  });
});

describe("redact", () => {
  it("while live, Bedside sees vitals/findings but not pinnedCards; Protocol sees pinnedCards but not vitals", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    state = codeRedEngine.reduce(state, { type: "examine", regionId: "abdomen" }, P1);
    state = codeRedEngine.reduce(state, { type: "pinCard", cardId: "algo-1" }, P2);

    const bedsideView = codeRedEngine.redact(state, P1);
    expect(bedsideView.role).toBe("bedside");
    expect(bedsideView.vitals).toEqual(state.vitals);
    expect(bedsideView.findingsRevealed).toEqual(["abdomen"]);
    expect(bedsideView.ordersApplied).toEqual([]); // Bedside sees its own progress live, just not Protocol's
    expect(bedsideView.pinnedCards).toBeUndefined();
    expect(bedsideView.debrief).toBeUndefined(); // not revealed until debrief

    const protocolView = codeRedEngine.redact(state, P2);
    expect(protocolView.role).toBe("protocol");
    expect(protocolView.pinnedCards).toEqual(["algo-1"]);
    expect(protocolView.vitals).toBeUndefined();
    expect(protocolView.findingsRevealed).toBeUndefined();
  });

  it("exposes the non-secret scenario structure (title/briefing/examine regions/order options) to both roles, but never the correct-sequence answer key while live", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);

    for (const player of [P1, P2]) {
      const live = codeRedEngine.redact(state, player);
      expect(live.scenario.examineFindings).toEqual(TEST_SCENARIO.examineFindings);
      expect(live.scenario.orderOptions).toEqual(TEST_SCENARIO.orderOptions);
      expect(live.debrief).toBeUndefined();
      expect(JSON.stringify(live)).not.toContain("correctSequence");
    }
  });

  it("at debrief, both roles see the full outcome/orders/stars AND the real correct sequence (FR-69) - safe to reveal now it's over", () => {
    let state = freshState({ [P1]: "bedside", [P2]: "protocol" });
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o1" }, P1);
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o2" }, P1);
    state = codeRedEngine.reduce(state, { type: "applyOrder", orderId: "o3" }, P1);
    expect(state.phase).toBe("debrief");

    for (const player of [P1, P2]) {
      const view = codeRedEngine.redact(state, player);
      expect(view.debrief?.outcome).toBe("success");
      expect(view.debrief?.ordersApplied).toEqual(["o1", "o2", "o3"]);
      expect(view.debrief?.correctSequence).toEqual(TEST_SCENARIO.correctSequence);
      expect(view.debrief?.stars).toBe(3);
    }
  });
});

describe("isTerminal", () => {
  it("is true only once phase is debrief", () => {
    let state = freshState();
    expect(codeRedEngine.isTerminal(state)).toBe(false);
    state = codeRedEngine.reduce(state, { type: "startLive" }, P1);
    expect(codeRedEngine.isTerminal(state)).toBe(false);
    state = codeRedEngine.reduce(state, { type: "tick", elapsedSeconds: 300 }, P1);
    expect(codeRedEngine.isTerminal(state)).toBe(true);
  });
});
