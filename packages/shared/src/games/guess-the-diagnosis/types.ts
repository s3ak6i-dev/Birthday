// Guess the Diagnosis. See masterdoc.md section 3.1 (FR-30..39).
import type { PlayerId } from "../../types";

export interface GuessCard {
  id: string;
  name: string;
  specialty: string;
  tags: string[];
}

export interface GuessQAEntry {
  askedBy: PlayerId;
  question: string;
  answer: "yes" | "no" | "not-sure";
  at: number; // epoch ms
}

/** Set by askQuestion, cleared by answerQuestion - the game is "awaiting an answer" while this is non-null (FR-32/33). */
export interface PendingQuestion {
  askedBy: PlayerId;
  question: string;
}

/** One free yes/no fact about the OPPONENT's secret card, from the Consult lifeline (FR-38). Per-player - never shown to the opponent. */
export interface ConsultReveal {
  tag: string;
  value: boolean;
}

export interface GuessTheDiagnosisState {
  players: [PlayerId, PlayerId];
  deck: GuessCard[]; // shared 24-card board, FR-30
  secretCardOf: Record<PlayerId, string>; // card id, never redacted to the OTHER player
  lives: Record<PlayerId, number>; // starts at 3, FR-37
  lifelinesUsed: Record<PlayerId, { consult: boolean; secondOpinion: boolean }>; // FR-38
  consultReveals: Record<PlayerId, ConsultReveal | null>;
  turn: PlayerId; // whose turn it is to ask (or to final-guess instead)
  pendingQuestion: PendingQuestion | null;
  turnEndsAt: number; // epoch ms, 45s timer, FR-35
  log: GuessQAEntry[];
  winner: PlayerId | "draw" | null;
}

export type GuessTheDiagnosisAction =
  | { type: "askQuestion"; question: string }
  | { type: "answerQuestion"; answer: "yes" | "no" | "not-sure" }
  | { type: "finalGuess"; cardId: string }
  | { type: "useConsult" }
  | { type: "useSecondOpinion" }
  | { type: "turnTimeout" }; // dispatched by the room when the 45s clock genuinely runs out (FR-35), never trusted from an early client message

/** The other player's secret card id, and the other player's consult reveal, are never included (FR-31/38). */
export interface GuessTheDiagnosisRedactedState
  extends Omit<GuessTheDiagnosisState, "secretCardOf" | "consultReveals"> {
  ownSecretCardId: string;
  ownConsultReveal: ConsultReveal | null;
}
