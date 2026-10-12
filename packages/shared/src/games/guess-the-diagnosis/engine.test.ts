// See masterdoc.md section 8.1 (unit tests per engine: normal play, every
// win/lose condition, every lifeline, illegal-action rejection).
import { describe, expect, it } from "vitest";
import { guessTheDiagnosisEngine } from "./engine";
import type { GuessCard } from "./types";

const P1 = "p1";
const P2 = "p2";

// Fixture-only content for engine tests - NOT real sourced deck content
// (section 5.4/5.5 cover the real packs, still empty pending authoring).
const TEST_DECK: GuessCard[] = [
  { id: "a", name: "Condition A", specialty: "General", tags: ["fever", "acute"] },
  { id: "b", name: "Condition B", specialty: "General", tags: ["chronic"] },
  { id: "c", name: "Condition C", specialty: "OB-GYN", tags: ["emergency", "fever"] },
  { id: "d", name: "Condition D", specialty: "OB-GYN", tags: ["chronic", "rash"] },
];

function freshState(secretCardIds: [string, string] = ["a", "b"]) {
  return guessTheDiagnosisEngine.init([P1, P2], { deck: TEST_DECK, secretCardIds });
}

describe("init", () => {
  it("deals distinct secret cards and starts P1's turn with full lives", () => {
    const state = freshState();
    expect(state.secretCardOf[P1]).toBe("a");
    expect(state.secretCardOf[P2]).toBe("b");
    expect(state.turn).toBe(P1);
    expect(state.lives).toEqual({ [P1]: 3, [P2]: 3 });
    expect(state.winner).toBeNull();
  });
});

describe("ask / answer handshake", () => {
  it("logs the Q&A and hands the ask-turn to the answerer", () => {
    let state = freshState();
    state = guessTheDiagnosisEngine.reduce(state, { type: "askQuestion", question: "Fever?" }, P1);
    expect(state.pendingQuestion).toEqual({ askedBy: P1, question: "Fever?" });

    state = guessTheDiagnosisEngine.reduce(state, { type: "answerQuestion", answer: "no" }, P2);
    expect(state.pendingQuestion).toBeNull();
    expect(state.log).toEqual([expect.objectContaining({ askedBy: P1, question: "Fever?", answer: "no" })]);
    expect(state.turn).toBe(P2); // answerer becomes next asker
  });
});

describe("final guess", () => {
  it("correct guess wins immediately", () => {
    let state = freshState(); // P2's secret card is "b"
    state = guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "b" }, P1);
    expect(state.winner).toBe(P1);
  });

  it("wrong guess costs a life and passes the turn", () => {
    let state = freshState();
    state = guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "c" }, P1);
    expect(state.lives[P1]).toBe(2);
    expect(state.winner).toBeNull();
    expect(state.turn).toBe(P2);
  });

  it("both players exhausting all lives ends in a draw", () => {
    let state = freshState();
    // P1 guesses wrong 3 times (turn is handed back manually each time to keep it actingPlayer=P1 for this test)
    for (let i = 0; i < 3; i++) {
      state = { ...state, turn: P1 };
      state = guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "c" }, P1);
    }
    expect(state.lives[P1]).toBe(0);
    expect(state.winner).toBeNull(); // only P1 is out so far

    for (let i = 0; i < 3; i++) {
      state = { ...state, turn: P2 };
      state = guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "d" }, P2); // "d" is wrong for both (P1 holds "a")
    }
    expect(state.lives[P2]).toBe(0);
    expect(state.winner).toBe("draw");
  });
});

describe("lifelines", () => {
  it("Consult reveals a true/false tag about the opponent's card, once", () => {
    let state = freshState(); // P2 holds "b" (tags: ["chronic"])
    state = guessTheDiagnosisEngine.reduce(state, { type: "useConsult" }, P1);
    expect(state.lifelinesUsed[P1]!.consult).toBe(true);
    expect(state.consultReveals[P1]).not.toBeNull();
    expect(state.consultReveals[P1]!.value).toBe(TEST_DECK[1]!.tags.includes(state.consultReveals[P1]!.tag));

    expect(() => guessTheDiagnosisEngine.reduce(state, { type: "useConsult" }, P1)).toThrow();
  });

  it("2nd Opinion restores one lost life, once, and requires a lost life first", () => {
    let state = freshState();
    expect(() => guessTheDiagnosisEngine.reduce(state, { type: "useSecondOpinion" }, P1)).toThrow(
      /have not lost a life/
    );

    state = guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "c" }, P1); // wrong guess, -1 life
    state = { ...state, turn: P1 };
    state = guessTheDiagnosisEngine.reduce(state, { type: "useSecondOpinion" }, P1);
    expect(state.lives[P1]).toBe(3);
    expect(() => guessTheDiagnosisEngine.reduce(state, { type: "useSecondOpinion" }, P1)).toThrow();
  });
});

describe("turnTimeout", () => {
  it("passes the ask-turn with no penalty and clears any pending question", () => {
    let state = freshState();
    state = guessTheDiagnosisEngine.reduce(state, { type: "askQuestion", question: "Fever?" }, P1);
    state = guessTheDiagnosisEngine.reduce(state, { type: "turnTimeout" }, P1);
    expect(state.pendingQuestion).toBeNull();
    expect(state.turn).toBe(P2);
    expect(state.lives).toEqual({ [P1]: 3, [P2]: 3 });
  });
});

describe("illegal actions", () => {
  it("rejects asking out of turn", () => {
    const state = freshState();
    expect(() => guessTheDiagnosisEngine.reduce(state, { type: "askQuestion", question: "Fever?" }, P2)).toThrow(
      /not your turn/
    );
  });

  it("rejects answering when no question is pending", () => {
    const state = freshState();
    expect(() => guessTheDiagnosisEngine.reduce(state, { type: "answerQuestion", answer: "yes" }, P2)).toThrow(
      /no question is pending/
    );
  });

  it("rejects a second simultaneous question", () => {
    let state = freshState();
    state = guessTheDiagnosisEngine.reduce(state, { type: "askQuestion", question: "Fever?" }, P1);
    expect(() => guessTheDiagnosisEngine.reduce(state, { type: "askQuestion", question: "Rash?" }, P1)).toThrow(
      /already pending/
    );
  });

  it("rejects a final guess from a player with 0 lives", () => {
    let state = freshState();
    for (let i = 0; i < 3; i++) {
      state = { ...state, turn: P1 };
      state = guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "c" }, P1);
    }
    state = { ...state, turn: P1 };
    expect(() => guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "c" }, P1)).toThrow(
      /out of lives/
    );
  });

  it("rejects any action once the game is won", () => {
    let state = freshState();
    state = guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "b" }, P1);
    expect(state.winner).toBe(P1);
    expect(() => guessTheDiagnosisEngine.reduce(state, { type: "askQuestion", question: "Fever?" }, P2)).toThrow(
      /already over/
    );
  });
});

describe("redact", () => {
  it("never leaks the opponent's secret card id or consult reveal", () => {
    let state = freshState();
    state = guessTheDiagnosisEngine.reduce(state, { type: "useConsult" }, P1);

    const forP2 = guessTheDiagnosisEngine.redact(state, P2);
    expect(forP2.ownSecretCardId).toBe("b");
    expect(forP2.ownConsultReveal).toBeNull(); // P1's reveal, not P2's
    expect(forP2).not.toHaveProperty("secretCardOf");
    expect(forP2).not.toHaveProperty("consultReveals");

    const forP1 = guessTheDiagnosisEngine.redact(state, P1);
    expect(forP1.ownSecretCardId).toBe("a");
    expect(forP1.ownConsultReveal).not.toBeNull();
  });
});

describe("isTerminal", () => {
  it("is false while winner is null and true once set", () => {
    let state = freshState();
    expect(guessTheDiagnosisEngine.isTerminal(state)).toBe(false);
    state = guessTheDiagnosisEngine.reduce(state, { type: "finalGuess", cardId: "b" }, P1);
    expect(guessTheDiagnosisEngine.isTerminal(state)).toBe(true);
  });
});
