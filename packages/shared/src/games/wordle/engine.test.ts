// See masterdoc.md section 8.1 (unit tests per engine: normal play, every
// mode, hint gating, illegal-action rejection, redaction).
import { describe, expect, it } from "vitest";
import { wordleEngine } from "./engine";
import type { WordleEntry, WordleState } from "./types";

const P1 = "p1";
const P2 = "p2";

// Fixture-only content for engine tests - NOT real sourced words (section
// 5.4/5.5 cover the real packs, still empty pending authoring).
const TEST_ENTRIES: WordleEntry[] = [
  { word: "FEVER", definition: "Elevated body temperature", pack: "General", source: "test" },
  { word: "RADAR", definition: "Not actually a medical term, just a good duplicate-letter test", pack: "General", source: "test" },
  { word: "NURSE", definition: "A clinician who runs the whole ward", pack: "General", source: "test" },
];

function dailyState(istDate = "2026-01-01"): WordleState {
  return wordleEngine.init([P1, P2], { mode: "daily", entries: TEST_ENTRIES, istDate });
}

function raceState(rng: () => number = () => 0): WordleState {
  return wordleEngine.init([P1, P2], { mode: "race", entries: TEST_ENTRIES, rng });
}

function duelState(): WordleState {
  return wordleEngine.init([P1, P2], { mode: "duel" });
}

function guess(state: WordleState, player: string, word: string): WordleState {
  return wordleEngine.reduce(state, { type: "submitGuess", word }, player);
}

describe("init", () => {
  it("daily mode picks the same word deterministically for a given date, regardless of call order", () => {
    const a = dailyState("2026-03-14");
    const b = dailyState("2026-03-14");
    expect(a.targetFor[P1]!.word).toBe(b.targetFor[P1]!.word);
    expect(a.phase).toBe("solving");
  });

  it("daily mode picks different words for different dates (usually)", () => {
    const words = new Set(["2026-01-01", "2026-02-02", "2026-03-03", "2026-04-04", "2026-05-05"].map((d) => dailyState(d).targetFor[P1]!.word));
    expect(words.size).toBeGreaterThan(1);
  });

  it("both players share the same target in daily/race mode", () => {
    const state = dailyState();
    expect(state.targetFor[P1]!.word).toBe(state.targetFor[P2]!.word);
  });

  it("duel mode starts in setup with no target set for either player", () => {
    const state = duelState();
    expect(state.phase).toBe("setup");
    expect(state.targetFor[P1]!.word).toBe("");
    expect(state.targetFor[P2]!.word).toBe("");
  });

  it("rejects daily mode without an istDate", () => {
    expect(() => wordleEngine.init([P1, P2], { mode: "daily", entries: TEST_ENTRIES })).toThrow(/istDate/);
  });

  it("rejects daily/race mode with an empty entries pack", () => {
    expect(() => wordleEngine.init([P1, P2], { mode: "race", entries: [] })).toThrow(/non-empty entries/);
  });
});

describe("scoring (duplicate letters)", () => {
  it("doesn't over-count a guessed letter beyond how many times it's actually left in the target", () => {
    // target ABCDE (each letter once), guess AABCX:
    //  i0 A vs A -> correct, consumes the target's only A
    //  i1 A vs B -> target's only A is already consumed by i0 -> absent (the classic bug: a
    //               naive scorer would wrongly mark this "present" since A exists in ABCDE)
    //  i2 B vs C -> target has an unconsumed B -> present
    //  i3 C vs D -> target has an unconsumed C -> present
    //  i4 X vs E -> no X in target -> absent
    let state = dailyState("2026-01-02"); // whichever word this lands on, we overwrite it below
    state = { ...state, targetFor: { [P1]: { ...state.targetFor[P1]!, word: "ABCDE" }, [P2]: state.targetFor[P2]! } };
    state = guess(state, P1, "AABCX");
    const tiles = state.boards[P1]!.guesses[0]!.tiles;
    expect(tiles).toEqual(["correct", "absent", "present", "present", "absent"]);
  });

  it("marks an exact match as solved", () => {
    let state = dailyState("2026-01-02");
    state = { ...state, targetFor: { [P1]: { ...state.targetFor[P1]!, word: "FEVER" }, [P2]: state.targetFor[P2]! } };
    state = guess(state, P1, "FEVER");
    expect(state.boards[P1]!.solved).toBe(true);
  });
});

describe("race mode", () => {
  it("doesn't finish the game until BOTH boards are done, even after one player solves", () => {
    let state = raceState();
    const word = state.targetFor[P1]!.word;
    state = guess(state, P1, word); // P1 solves immediately
    expect(state.boards[P1]!.solved).toBe(true);
    expect(state.phase).toBe("solving"); // P2 hasn't finished yet
    expect(wordleEngine.isTerminal(state)).toBe(false);
  });

  it("finishes once the second player also exhausts their guesses", () => {
    let state = raceState();
    const word = state.targetFor[P1]!.word;
    state = guess(state, P1, word);
    for (let i = 0; i < 6; i++) {
      state = guess(state, P2, "WRONG" === word ? "ABCDE" : "WRONG");
    }
    expect(state.phase).toBe("done");
    expect(wordleEngine.isTerminal(state)).toBe(true);
  });
});

describe("duel setup (FR-53)", () => {
  it("each player sets the OTHER player's target word, and solving starts once both are set", () => {
    let state = duelState();
    state = wordleEngine.reduce(state, { type: "setSecretWord", word: "nurse", hint: "They run the ward" }, P1);
    expect(state.targetFor[P2]!.word).toBe("NURSE"); // P1 set P2's target
    expect(state.targetFor[P1]!.word).toBe(""); // not set yet
    expect(state.phase).toBe("setup");

    state = wordleEngine.reduce(state, { type: "setSecretWord", word: "FEVER" }, P2);
    expect(state.targetFor[P1]!.word).toBe("FEVER");
    expect(state.phase).toBe("solving");
  });

  it("rejects setting a word twice", () => {
    let state = duelState();
    state = wordleEngine.reduce(state, { type: "setSecretWord", word: "NURSE" }, P1);
    expect(() => wordleEngine.reduce(state, { type: "setSecretWord", word: "FEVER" }, P1)).toThrow(/already set/);
  });

  it("rejects an invalid word", () => {
    const state = duelState();
    expect(() => wordleEngine.reduce(state, { type: "setSecretWord", word: "AB" }, P1)).toThrow(/5 letters/);
  });

  it("rejects guessing before setup is complete", () => {
    let state = duelState();
    state = wordleEngine.reduce(state, { type: "setSecretWord", word: "NURSE" }, P1);
    expect(() => guess(state, P2, "FEVER")).toThrow(/no solving/);
  });
});

describe("hints (FR-55)", () => {
  it("rejects a hint before guess 4", () => {
    const state = dailyState();
    expect(() => wordleEngine.reduce(state, { type: "useHint" }, P1)).toThrow(/unlocks after guess 4/);
  });

  it("unlocks after 4 guesses and reveals definition/pack but not the word", () => {
    let state = dailyState();
    const word = state.targetFor[P1]!.word;
    const wrong = word === "WRONG" ? "ABCDE" : "WRONG";
    for (let i = 0; i < 4; i++) state = guess(state, P1, wrong);
    state = wordleEngine.reduce(state, { type: "useHint" }, P1);
    expect(state.boards[P1]!.hintUsed).toBe(true);

    const redacted = wordleEngine.redact(state, P1);
    expect(redacted.ownTarget.definition).not.toBeNull();
    expect(redacted.ownTarget.pack).not.toBeNull();
    expect(redacted.ownTarget.word).toBeNull(); // still hidden - hint ≠ solve
  });

  it("rejects using a hint twice", () => {
    let state = dailyState();
    const word = state.targetFor[P1]!.word;
    const wrong = word === "WRONG" ? "ABCDE" : "WRONG";
    for (let i = 0; i < 4; i++) state = guess(state, P1, wrong);
    state = wordleEngine.reduce(state, { type: "useHint" }, P1);
    expect(() => wordleEngine.reduce(state, { type: "useHint" }, P1)).toThrow(/already used/);
  });
});

describe("redact", () => {
  it("hides the own target word until solved", () => {
    const state = dailyState();
    const redacted = wordleEngine.redact(state, P1);
    expect(redacted.ownTarget.word).toBeNull();
  });

  it("reveals the own target word once solved", () => {
    let state = dailyState();
    const word = state.targetFor[P1]!.word;
    state = guess(state, P1, word);
    const redacted = wordleEngine.redact(state, P1);
    expect(redacted.ownTarget.word).toBe(word);
    expect(redacted.ownTarget.source).not.toBeNull();
  });

  it("always exposes the opponent's guess count (ghost indicator, FR-52)", () => {
    let state = raceState();
    const word = state.targetFor[P1]!.word;
    const wrong = word === "WRONG" ? "ABCDE" : "WRONG";
    state = guess(state, P2, wrong);
    state = guess(state, P2, wrong === "WRONG" ? "ABCDE" : "WRONG");
    const redacted = wordleEngine.redact(state, P1);
    expect(redacted.opponentGuessCount).toBe(2);
  });

  it("hides the opponent's full board until both players are finished", () => {
    let state = raceState();
    const word = state.targetFor[P1]!.word;
    state = guess(state, P1, word); // P1 done, P2 not yet
    let redacted = wordleEngine.redact(state, P1);
    expect(redacted.opponentBoard).toBeNull();

    const wrong = word === "WRONG" ? "ABCDE" : "WRONG";
    for (let i = 0; i < 6; i++) state = guess(state, P2, wrong);
    redacted = wordleEngine.redact(state, P1);
    expect(redacted.opponentBoard).not.toBeNull();
    expect(redacted.opponentBoard!.guesses).toHaveLength(6);
  });
});

describe("illegal actions", () => {
  it("rejects a malformed guess", () => {
    const state = dailyState();
    expect(() => guess(state, P1, "AB")).toThrow(/5 letters/);
  });

  it("rejects guessing on an already-finished board", () => {
    let state = dailyState();
    const word = state.targetFor[P1]!.word;
    state = guess(state, P1, word);
    expect(() => guess(state, P1, word)).toThrow(/already finished/);
  });

  it("rejects an acting player who isn't in the game", () => {
    const state = dailyState();
    expect(() => guess(state, "p3", "FEVER")).toThrow(/not in this game/);
  });

  it("rejects any action once the game is done", () => {
    let state = raceState();
    const word = state.targetFor[P1]!.word;
    state = guess(state, P1, word);
    const wrong = word === "WRONG" ? "ABCDE" : "WRONG";
    for (let i = 0; i < 6; i++) state = guess(state, P2, wrong);
    expect(state.phase).toBe("done");
    expect(() => guess(state, P1, word)).toThrow(/already over/);
  });
});

describe("isTerminal", () => {
  it("is false until phase is done", () => {
    expect(wordleEngine.isTerminal(dailyState())).toBe(false);
  });
});
