// Shared cross-game types. See masterdoc.md section 4.7 (game engines) and 3.1-3.5 (game specs).

export type GameId =
  | "guess-the-diagnosis"
  | "triage-dial"
  | "wordle"
  | "code-red"
  | "case-files";

export type PlayerId = string; // Supabase auth user id (one of exactly two accounts)

export interface RoomPlayer {
  userId: PlayerId;
  displayName: string;
  ready: boolean;
  connected: boolean;
}

/**
 * Every per-game engine implements this shape. `reduce` is a pure function:
 * same (state, action) always produces the same next state, with no I/O.
 * The Cloudflare Durable Object (apps/rooms) is the only thing that calls
 * `reduce` against the real, un-redacted state; `redact` produces the
 * per-recipient view that actually gets sent to each client (masterdoc 4.6/4.7).
 */
export interface GameEngine<TState, TAction, TRedacted> {
  id: GameId;
  init(players: [PlayerId, PlayerId], options: unknown): TState;
  reduce(state: TState, action: TAction, actingPlayer: PlayerId): TState;
  redact(state: TState, forPlayer: PlayerId): TRedacted;
  isTerminal(state: TState): boolean;
}
