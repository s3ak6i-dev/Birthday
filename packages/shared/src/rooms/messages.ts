// The room WebSocket message envelope. See masterdoc.md section 4.6.
// Both apps/web (client) and apps/rooms (Cloudflare Worker) import this
// so they can never disagree on the wire format.
//
// Expanded from the masterdoc.md sketch while actually building the rooms
// layer: that first draft didn't have enough for a real waiting room (who's
// joined, who's ready, is there a countdown running) - `roomState` carries
// that lobby-level snapshot, separate from `state`, which only ever carries
// the per-recipient redacted *game* state once play has actually started.
// `userId` was dropped from client-sent messages (`ready`/`action`) - the
// server already knows who's sending from the authenticated connection, so
// trusting a self-reported id in the payload would just be a spoofing risk
// for no benefit. `join` was dropped entirely for the same reason: opening
// the WebSocket connection already *is* joining, a separate message added
// nothing.

import type { GameId, PlayerId } from "../types";

export type RoomPhase = "waiting" | "countdown" | "playing" | "paused" | "done";

export interface RoomPlayerStatus {
  userId: PlayerId;
  connected: boolean;
  ready: boolean;
}

export type RoomMessage =
  // client -> server
  | { t: "ready" }
  | { t: "action"; game: GameId; payload: unknown }
  | { t: "reaction"; emoji: string }
  | { t: "leave" }
  // server -> client
  | { t: "roomState"; game: GameId; phase: RoomPhase; players: RoomPlayerStatus[]; countdownEndsAt: number | null }
  | { t: "state"; game: GameId; state: unknown } // redacted per recipient, never the same payload to both
  | { t: "pause"; reason: "disconnect" }
  | { t: "resume" }
  | { t: "roomEnded"; reason: "abandoned" | "left" }
  | { t: "error"; message: string };
