// Triage Dial. See masterdoc.md section 3.2 (FR-40..49).
import type { PlayerId } from "../../types";

export interface TriageSpectrumCard {
  id: string;
  leftLabel: string;
  rightLabel: string;
  category: string;
}

export interface TriageRound {
  spectrum: TriageSpectrumCard;
  target: number; // 0-100, known only to the clue-giver until reveal
  clue: string | null;
  needlePosition: number | null; // 0-100, set by the dialer
  lockedIn: boolean;
  score: number | null; // set on reveal
}

export interface TriageDialState {
  players: [PlayerId, PlayerId];
  mode: "coop" | "versus";
  round: number; // 1-8, FR-40
  clueGiver: PlayerId;
  rounds: TriageRound[];
  phase: "clue" | "dial" | "reveal" | "argue" | "done";
  /** The full pack(s) chosen pre-game (FR-40) - kept in state, not just at
   * init, because a versus-mode tie replay (FR-46) needs to deal one more
   * card from it after the game's already underway. */
  deck: TriageSpectrumCard[];
  /**
   * Running totals. Co-op (FR-45, "the pair shares one running score"):
   * every round's points are credited to both players equally, so the two
   * numbers always match - there's no separate "team score" concept, just
   * two always-equal per-player numbers, which keeps one shape for both
   * modes instead of a union. Versus (FR-46): only the round's *dialer*
   * (not the clue-giver) is credited, so the two numbers diverge and are
   * compared head-to-head at the end.
   */
  scores: Record<PlayerId, number>;
}

export type TriageDialAction =
  | { type: "submitClue"; clue: string }
  | { type: "moveNeedle"; position: number } // throttled client-side to 15/sec, FR-48
  | { type: "lockIn" }
  | { type: "advanceRound" };

/** What each client actually receives - the hidden target is stripped for the dialer until reveal (FR-41/48). */
export interface TriageDialRedactedState extends Omit<TriageDialState, "rounds"> {
  rounds: Array<Omit<TriageRound, "target"> & { target: number | null }>;
}
