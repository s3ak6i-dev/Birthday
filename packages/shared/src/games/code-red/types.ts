// Code Red (v1.5). See masterdoc.md section 3.4 (FR-60..69).
import type { PlayerId } from "../../types";

export type CodeRedRole = "bedside" | "protocol";

export interface VitalsSnapshot {
  atSecond: number; // position in the scripted timeline
  hr: number;
  bpSystolic: number;
  bpDiastolic: number;
  spo2: number;
  bloodLossMl?: number;
}

export interface CodeRedOrder {
  id: string;
  label: string;
}

export interface CodeRedState {
  players: [PlayerId, PlayerId];
  roleOf: Record<PlayerId, CodeRedRole>;
  scenarioId: string;
  elapsedSeconds: number;
  timeLimitSeconds: number; // ~300, FR-62
  vitals: VitalsSnapshot;
  ordersApplied: string[];
  errors: number; // 3 serious errors -> "code called" failure, FR-66
  phase: "briefing" | "live" | "debrief";
  stars: 0 | 1 | 2 | 3 | null;
}

export type CodeRedAction =
  | { type: "examine"; regionId: string } // bedside only
  | { type: "applyOrder"; orderId: string } // bedside only, validated server-side, FR-64
  | { type: "pinCard"; cardId: string } // protocol only
  | { type: "radioPhrase"; phraseId: string }; // either role, FR-65

/** Bedside never sees the protocol binder; protocol never sees live vitals detail (FR-63). */
export type CodeRedRedactedState =
  | ({ role: "bedside" } & Pick<CodeRedState, "vitals" | "elapsedSeconds" | "timeLimitSeconds" | "phase" | "errors">)
  | ({ role: "protocol" } & Pick<CodeRedState, "elapsedSeconds" | "timeLimitSeconds" | "phase" | "errors">);
