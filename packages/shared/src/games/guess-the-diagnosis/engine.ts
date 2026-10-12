// Guess the Diagnosis engine. See masterdoc.md section 3.1 (FR-30..39).
//
// Turn shape: it's always exactly one player's turn to either ask a
// question or make a final guess. Asking sets `pendingQuestion`, which the
// OTHER player must clear with answerQuestion before anything else can
// happen - and answering hands the "turn to ask" to them (classic
// alternating Guess Who). This is why `turn` flips on answerQuestion, not
// on askQuestion.
//
// Card elimination (tapping a card to mark it ruled out) is deliberately
// NOT modelled here - FR-34 says it's private per-screen and never synced
// except as a remaining-count badge, so it's pure client UI state, not
// server-authoritative game state (see GuessTheDiagnosisBoard.tsx).
//
// Illegal actions throw rather than silently no-op, so a bug on either the
// client or the room dispatch layer fails loudly instead of desyncing two
// screens quietly (see the illegal-action tests in engine.test.ts).

import type { GameEngine, PlayerId } from "../../types";
import type {
  ConsultReveal,
  GuessCard,
  GuessTheDiagnosisAction,
  GuessTheDiagnosisRedactedState,
  GuessTheDiagnosisState,
} from "./types";

const STARTING_LIVES = 3;
const TURN_SECONDS = 45;

export interface GuessTheDiagnosisInitOptions {
  deck: GuessCard[]; // the 24-card board, already built from the chosen pack(s) - FR-30
  /** For tests / deterministic replays. Defaults to Math.random. */
  rng?: () => number;
  /** For tests - skip the random deal and assign these secret cards directly. */
  secretCardIds?: [string, string];
}

function otherPlayer(players: [PlayerId, PlayerId], player: PlayerId): PlayerId {
  return players[0] === player ? players[1] : players[0];
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`guessTheDiagnosisEngine: ${message}`);
}

function dealSecretCards(deck: GuessCard[], rng: () => number): [string, string] {
  assert(deck.length >= 2, "deck must have at least 2 cards to deal from");
  const firstIndex = Math.floor(rng() * deck.length);
  let secondIndex = Math.floor(rng() * deck.length);
  while (secondIndex === firstIndex) {
    secondIndex = Math.floor(rng() * deck.length);
  }
  const first = deck[firstIndex];
  const second = deck[secondIndex];
  assert(first !== undefined && second !== undefined, "dealt index out of range");
  return [first.id, second.id];
}

export const guessTheDiagnosisEngine: GameEngine<
  GuessTheDiagnosisState,
  GuessTheDiagnosisAction,
  GuessTheDiagnosisRedactedState
> = {
  id: "guess-the-diagnosis",

  init(players: [PlayerId, PlayerId], options: unknown): GuessTheDiagnosisState {
    const { deck, rng = Math.random, secretCardIds } = options as GuessTheDiagnosisInitOptions;
    const [cardA, cardB] = secretCardIds ?? dealSecretCards(deck, rng);

    return {
      players,
      deck,
      secretCardOf: { [players[0]]: cardA, [players[1]]: cardB },
      lives: { [players[0]]: STARTING_LIVES, [players[1]]: STARTING_LIVES },
      lifelinesUsed: {
        [players[0]]: { consult: false, secondOpinion: false },
        [players[1]]: { consult: false, secondOpinion: false },
      },
      consultReveals: { [players[0]]: null, [players[1]]: null },
      turn: players[0],
      pendingQuestion: null,
      turnEndsAt: Date.now() + TURN_SECONDS * 1000,
      log: [],
      winner: null,
    };
  },

  reduce(state: GuessTheDiagnosisState, action: GuessTheDiagnosisAction, actingPlayer: PlayerId): GuessTheDiagnosisState {
    assert(state.winner === null, "the game is already over");
    assert(state.players.includes(actingPlayer), "actingPlayer is not in this game");

    switch (action.type) {
      case "askQuestion": {
        assert(actingPlayer === state.turn, "it is not your turn to ask");
        assert(state.pendingQuestion === null, "a question is already pending an answer");
        assert(action.question.trim().length > 0, "question must not be empty");
        return { ...state, pendingQuestion: { askedBy: actingPlayer, question: action.question } };
      }

      case "answerQuestion": {
        assert(state.pendingQuestion !== null, "no question is pending");
        assert(actingPlayer !== state.pendingQuestion.askedBy, "you asked the question, you cannot answer it");
        const entry = {
          askedBy: state.pendingQuestion.askedBy,
          question: state.pendingQuestion.question,
          answer: action.answer,
          at: Date.now(),
        };
        return {
          ...state,
          log: [...state.log, entry],
          pendingQuestion: null,
          turn: actingPlayer, // the answerer becomes the next asker
          turnEndsAt: Date.now() + TURN_SECONDS * 1000,
        };
      }

      case "finalGuess": {
        assert(actingPlayer === state.turn, "it is not your turn to guess");
        assert(state.pendingQuestion === null, "answer the pending question first");
        assert((state.lives[actingPlayer] ?? 0) > 0, "you are out of lives and can no longer win");

        const opponent = otherPlayer(state.players, actingPlayer);
        if (action.cardId === state.secretCardOf[opponent]) {
          return { ...state, winner: actingPlayer };
        }

        const lives = { ...state.lives, [actingPlayer]: (state.lives[actingPlayer] ?? 0) - 1 };
        const bothOut = (lives[state.players[0]] ?? 0) <= 0 && (lives[state.players[1]] ?? 0) <= 0;
        return {
          ...state,
          lives,
          winner: bothOut ? "draw" : null,
          turn: bothOut ? state.turn : opponent,
          turnEndsAt: Date.now() + TURN_SECONDS * 1000,
        };
      }

      case "useConsult": {
        const used = state.lifelinesUsed[actingPlayer];
        assert(used !== undefined && !used.consult, "Consult has already been used");

        const opponent = otherPlayer(state.players, actingPlayer);
        const opponentCardId = state.secretCardOf[opponent];
        const opponentCard = state.deck.find((c) => c.id === opponentCardId);
        assert(opponentCard !== undefined, "opponent's secret card is not in the deck");

        const allTags = Array.from(new Set(state.deck.flatMap((c) => c.tags)));
        assert(allTags.length > 0, "deck has no tags to consult about");
        const tag = allTags[Math.floor(Math.random() * allTags.length)];
        assert(tag !== undefined, "no tag selected");
        const reveal: ConsultReveal = { tag, value: opponentCard.tags.includes(tag) };

        return {
          ...state,
          consultReveals: { ...state.consultReveals, [actingPlayer]: reveal },
          lifelinesUsed: { ...state.lifelinesUsed, [actingPlayer]: { ...used, consult: true } },
        };
      }

      case "useSecondOpinion": {
        const used = state.lifelinesUsed[actingPlayer];
        assert(used !== undefined && !used.secondOpinion, "2nd Opinion has already been used");
        assert((state.lives[actingPlayer] ?? 0) < STARTING_LIVES, "you have not lost a life yet");

        return {
          ...state,
          lives: { ...state.lives, [actingPlayer]: Math.min(STARTING_LIVES, (state.lives[actingPlayer] ?? 0) + 1) },
          lifelinesUsed: { ...state.lifelinesUsed, [actingPlayer]: { ...used, secondOpinion: true } },
        };
      }

      case "turnTimeout": {
        // Idle turn auto-passes with no penalty (FR-35). If a question was
        // pending and never answered, treat it as withdrawn; either way the
        // ask-turn simply moves to the other player.
        const opponent = otherPlayer(state.players, state.turn);
        return {
          ...state,
          pendingQuestion: null,
          turn: opponent,
          turnEndsAt: Date.now() + TURN_SECONDS * 1000,
        };
      }

      default:
        throw new Error(`guessTheDiagnosisEngine: unknown action ${JSON.stringify(action)}`);
    }
  },

  redact(state: GuessTheDiagnosisState, forPlayer: PlayerId): GuessTheDiagnosisRedactedState {
    const { secretCardOf, consultReveals, ...rest } = state;
    return {
      ...rest,
      ownSecretCardId: secretCardOf[forPlayer] ?? "",
      ownConsultReveal: consultReveals[forPlayer] ?? null,
    };
  },

  isTerminal(state: GuessTheDiagnosisState): boolean {
    return state.winner !== null;
  },
};
