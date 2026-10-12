// Case Files (v2). See masterdoc.md section 3.5 (FR-70..79).
import type { PlayerId } from "../../types";

export type GridMark = "confirmed" | "ruled-out" | "unknown";

export interface EvidenceCard {
  id: string;
  text: string;
  heldBy: PlayerId; // split evidence, FR-71
  shared: boolean; // revealed to both via the corkboard, FR-72
}

export interface CaseFilesState {
  players: [PlayerId, PlayerId];
  caseId: string;
  differentials: [string, string, string, string, string];
  evidence: EvidenceCard[];
  grid: GridMark[][]; // 5 differentials x evidence.length
  sharesRemaining: number; // per-case pool, FR-72
  hintTokensRemaining: number; // typically 3, FR-74
  submitted: { differentialIndex: number; correct: boolean } | null;
  stars: 0 | 1 | 2 | 3 | null;
}

export type CaseFilesAction =
  | { type: "shareCard"; cardId: string } // FR-72
  | { type: "setGridMark"; differentialIndex: number; evidenceIndex: number; mark: GridMark } // FR-73
  | { type: "useHintToken" } // FR-74
  | { type: "submit"; differentialIndex: number }; // FR-75

/** Each player only ever receives their own hand plus whatever has been shared (FR-71/72). */
export interface CaseFilesRedactedState extends Omit<CaseFilesState, "evidence"> {
  ownHand: EvidenceCard[];
  sharedCards: EvidenceCard[];
}
