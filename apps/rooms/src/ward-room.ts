// The Durable Object behind one live room. See masterdoc.md section 4.6
// (realtime rooms protocol) and D9 (server-authoritative games; secrets
// live on the server).
//
// Room identity: the DO's own name *is* the room code (partyserver routes
// `/parties/ward-room/<code>` to the DO named `<code>` - see index.ts). A
// room is created implicitly by whichever client connects first with a
// `?game=` query param; there's no separate "create room" HTTP endpoint,
// since a 4-letter code collision is practically impossible at this scale
// (masterdoc.md section 4.6) and the DO can just lazily initialize itself.
import { Server, type Connection, type WSMessage } from "partyserver";
import {
  GAME_ENGINES,
  PLACEHOLDER_DECK,
  PLACEHOLDER_ENTRIES,
  PLACEHOLDER_SPECTRUMS,
  ROOM,
  type GameId,
  type PlayerId,
  type RoomMessage,
  type RoomPhase,
  type RoomPlayerStatus,
} from "@ward-games/shared";
import type { Env } from "./env";

interface PersistedRoom {
  game: GameId | null;
  mode: string | null; // triage-dial's coop/versus, wordle's daily/race/duel - unused by other games
  players: PlayerId[]; // join order, at most 2
  ready: Record<string, boolean>;
  connected: Record<string, boolean>;
  phase: RoomPhase;
  gameState: unknown | null;
  disconnectedAt: Record<string, number | null>;
}

interface ConnState {
  userId: PlayerId;
}

const STORAGE_KEY = "room";

function emptyRoom(): PersistedRoom {
  return {
    game: null,
    mode: null,
    players: [],
    ready: {},
    connected: {},
    phase: "waiting",
    gameState: null,
    disconnectedAt: {},
  };
}

function otherPlayer(players: PlayerId[], userId: PlayerId): PlayerId | undefined {
  return players.find((p) => p !== userId);
}

/** Today's date in IST as "YYYY-MM-DD" (FR-50's daily-word rollover
 * timezone) - same logic as the client's todayIST() in WordleBoard.tsx,
 * duplicated here since the server (not the client) is what actually
 * decides the daily word once rooms are real. */
function todayIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function initOptionsFor(game: GameId, mode: string | null) {
  switch (game) {
    case "guess-the-diagnosis":
      return { deck: PLACEHOLDER_DECK };
    case "triage-dial":
      return { deck: PLACEHOLDER_SPECTRUMS, mode: mode === "versus" ? "versus" : "coop" };
    case "wordle":
      return {
        mode: mode === "race" || mode === "duel" ? mode : "daily",
        entries: PLACEHOLDER_ENTRIES,
        istDate: todayIST(),
      };
    default:
      return {};
  }
}

export class WardRoom extends Server<Env> {
  static options = { hibernate: true };

  // Rate-limiting state for high-frequency actions (e.g. Triage Dial's
  // moveNeedle, FR-48) - in-memory only, not persisted. Resets if the DO
  // hibernates and wakes again, which just means one extra update might
  // slip through right after a cold wake - harmless for a 2-person game.
  #lastHighFrequencyActionAt = new Map<string, number>();

  async #loadRoom(): Promise<PersistedRoom> {
    const stored = await this.ctx.storage.get<PersistedRoom>(STORAGE_KEY);
    return stored ?? emptyRoom();
  }

  async #saveRoom(room: PersistedRoom): Promise<void> {
    await this.ctx.storage.put(STORAGE_KEY, room);
  }

  #playerStatuses(room: PersistedRoom): RoomPlayerStatus[] {
    return room.players.map((userId) => ({
      userId,
      connected: room.connected[userId] ?? false,
      ready: room.ready[userId] ?? false,
    }));
  }

  #broadcastRoomState(room: PersistedRoom) {
    const msg: RoomMessage = {
      t: "roomState",
      game: room.game!,
      phase: room.phase,
      players: this.#playerStatuses(room),
      countdownEndsAt: null,
    };
    this.broadcast(JSON.stringify(msg));
  }

  /** Sends each connected player their own redacted view of the game state
   * - never the same payload to both (D9, masterdoc.md section 4.6). */
  #broadcastGameState(room: PersistedRoom) {
    const engine = GAME_ENGINES[room.game!];
    for (const connection of this.getConnections<ConnState>()) {
      const userId = connection.state?.userId;
      if (!userId) continue;
      const redacted = engine.redact(room.gameState, userId);
      const msg: RoomMessage = { t: "state", game: room.game!, state: redacted };
      connection.send(JSON.stringify(msg));
    }
  }

  #sendError(connection: Connection, message: string) {
    connection.send(JSON.stringify({ t: "error", message } satisfies RoomMessage));
  }

  async onConnect(connection: Connection, ctx: { request: Request }) {
    const url = new URL(ctx.request.url);
    // Already verified by index.ts's onBeforeConnect, which sets this
    // header itself (overwriting any client-supplied value) and rejects
    // the connection outright - before the WebSocket upgrade, not after -
    // if verification fails. This should never actually be missing, but
    // bail cleanly rather than trust an absent/empty id if it somehow is.
    const userId = ctx.request.headers.get("X-Ward-User-Id");
    if (!userId) {
      connection.close(4001, "unauthorized");
      return;
    }

    let room = await this.#loadRoom();

    // First connection to a brand-new room sets what game this room is for.
    if (room.game === null) {
      const gameParam = url.searchParams.get("game") as GameId | null;
      if (!gameParam || !(gameParam in GAME_ENGINES)) {
        connection.close(4002, "unknown game");
        return;
      }
      room.game = gameParam;
      room.mode = url.searchParams.get("mode");
    }

    if (!room.players.includes(userId)) {
      if (room.players.length >= 2) {
        this.#sendError(connection, "This ward is full - two people are already here.");
        connection.close(4003, "room full");
        return;
      }
      room.players.push(userId);
    }

    // Reconnecting: clear the hold timer, resume if we were paused for them.
    room.connected[userId] = true;
    room.disconnectedAt[userId] = null;
    if (room.phase === "paused" && Object.values(room.disconnectedAt).every((t) => t === null)) {
      room.phase = room.players.length === 2 ? "playing" : "waiting";
      await this.ctx.storage.deleteAlarm();
      if (room.phase === "playing") {
        const other = otherPlayer(room.players, userId);
        if (other) {
          const resumeMsg: RoomMessage = { t: "resume" };
          for (const c of this.getConnections<ConnState>()) {
            c.send(JSON.stringify(resumeMsg));
          }
        }
      }
    }

    connection.setState({ userId });
    await this.#saveRoom(room);

    this.#broadcastRoomState(room);
    // Debug logging for "stuck on Waiting for the other person" /
    // "Loading the board" reports (via `wrangler tail`) - temporary,
    // remove once the root cause is actually found. Not guessing at this
    // one without seeing what onConnect actually observes live.
    console.log(
      `[onConnect] userId=${userId} room.phase=${room.phase} gameState=${room.gameState === null ? "null" : "present"} willBroadcastGameState=${room.phase === "playing" && room.gameState !== null}`
    );
    if (room.phase === "playing" && room.gameState !== null) {
      this.#broadcastGameState(room);
    }
  }

  async onMessage(connection: Connection<ConnState>, message: WSMessage) {
    const userId = connection.state?.userId;
    if (!userId) return; // shouldn't happen - onConnect always sets this before messages can arrive

    let parsed: RoomMessage;
    try {
      parsed = JSON.parse(typeof message === "string" ? message : "");
    } catch {
      return; // malformed message, just drop it
    }

    const room = await this.#loadRoom();

    switch (parsed.t) {
      case "ready": {
        if (room.phase !== "waiting") return;
        room.ready[userId] = !room.ready[userId];

        const bothReady = room.players.length === 2 && room.players.every((p) => room.ready[p]);
        if (bothReady) {
          room.phase = "countdown";
          await this.#saveRoom(room);
          const countdownMsg: RoomMessage = {
            t: "roomState",
            game: room.game!,
            phase: "countdown",
            players: this.#playerStatuses(room),
            countdownEndsAt: Date.now() + ROOM.countdownSeconds * 1000,
          };
          this.broadcast(JSON.stringify(countdownMsg));

          // Short, fixed delay - a plain timer is fine here (unlike the
          // reconnect hold below) since both players are actively
          // connected for this brief window, nowhere near long enough for
          // the DO to hibernate mid-countdown.
          setTimeout(async () => {
            const freshRoom = await this.#loadRoom();
            if (freshRoom.phase !== "countdown") {
              console.log(`[countdown] aborted - freshRoom.phase was "${freshRoom.phase}", not "countdown"`);
              return; // someone left during the countdown
            }
            freshRoom.phase = "playing";
            const [p1, p2] = freshRoom.players;
            const engine = GAME_ENGINES[freshRoom.game!];
            freshRoom.gameState = engine.init([p1!, p2!], initOptionsFor(freshRoom.game!, freshRoom.mode));
            await this.#saveRoom(freshRoom);
            console.log(`[countdown] fired, game=${freshRoom.game} mode=${freshRoom.mode} initial state=${JSON.stringify(freshRoom.gameState)}`);
            this.#broadcastRoomState(freshRoom);
            this.#broadcastGameState(freshRoom);
          }, ROOM.countdownSeconds * 1000);
        } else {
          await this.#saveRoom(room);
          this.#broadcastRoomState(room);
        }
        return;
      }

      case "action": {
        if (room.phase !== "playing" || room.gameState === null) return;

        // FR-48: throttle high-frequency actions (identified generically by
        // a `type` field most game actions already carry, e.g. Triage
        // Dial's "moveNeedle") to ROOM.needleUpdatesPerSecond per connection.
        const payload = parsed.payload as { type?: string };
        if (payload?.type === "moveNeedle") {
          const now = Date.now();
          const last = this.#lastHighFrequencyActionAt.get(connection.id) ?? 0;
          const minGapMs = 1000 / ROOM.needleUpdatesPerSecond;
          if (now - last < minGapMs) return;
          this.#lastHighFrequencyActionAt.set(connection.id, now);
        }

        const engine = GAME_ENGINES[room.game!];
        try {
          room.gameState = engine.reduce(room.gameState, parsed.payload, userId);
        } catch (err) {
          console.log(`[action] userId=${userId} payload=${JSON.stringify(parsed.payload)} REJECTED: ${err instanceof Error ? err.message : err}`);
          this.#sendError(connection, err instanceof Error ? err.message : "That move isn't allowed right now.");
          return;
        }

        if (engine.isTerminal(room.gameState)) {
          room.phase = "done";
        }
        await this.#saveRoom(room);
        // Same temporary debug logging as onConnect above - a redacted
        // snapshot of post-reduce state, specifically to catch a duel
        // setSecretWord that both players apparently completed but one or
        // both got stuck seeing "Waiting for the other person" anyway.
        console.log(
          `[action] userId=${userId} payload=${JSON.stringify(parsed.payload)} ACCEPTED, new state=${JSON.stringify(room.gameState)}`
        );
        this.#broadcastGameState(room);
        if (room.phase === "done") this.#broadcastRoomState(room);
        return;
      }

      case "reaction": {
        // Ephemeral - relay to everyone else, nothing to persist (FR-23).
        const relay: RoomMessage = { t: "reaction", emoji: parsed.emoji };
        const serialized = JSON.stringify(relay);
        for (const c of this.getConnections<ConnState>()) {
          if (c.id !== connection.id) c.send(serialized);
        }
        return;
      }

      case "leave": {
        room.players = room.players.filter((p) => p !== userId);
        delete room.ready[userId];
        delete room.connected[userId];
        delete room.disconnectedAt[userId];
        room.phase = room.players.length === 0 ? "done" : "waiting";
        room.gameState = null;
        await this.#saveRoom(room);
        const endedMsg: RoomMessage = { t: "roomEnded", reason: "left" };
        for (const c of this.getConnections<ConnState>()) {
          if (c.id !== connection.id) c.send(JSON.stringify(endedMsg));
        }
        connection.close(4000, "left");
        return;
      }

      default:
        return; // server-originated message types received from a client - ignore
    }
  }

  async onClose(connection: Connection<ConnState>) {
    const userId = connection.state?.userId;
    if (!userId) return;

    const room = await this.#loadRoom();
    if (!room.players.includes(userId)) return;

    room.connected[userId] = false;
    room.ready[userId] = false;

    if (room.phase === "playing" || room.phase === "countdown") {
      room.phase = "paused";
      room.disconnectedAt[userId] = Date.now();
      await this.ctx.storage.setAlarm(Date.now() + ROOM.reconnectHoldSeconds * 1000);
      const pauseMsg: RoomMessage = { t: "pause", reason: "disconnect" };
      for (const c of this.getConnections<ConnState>()) {
        c.send(JSON.stringify(pauseMsg));
      }
    }

    await this.#saveRoom(room);
    this.#broadcastRoomState(room);
  }

  /** The 120s reconnect hold expired (FR-22/FR-ROOM-3) - the room ends and
   * whoever's still connected is told their partner isn't coming back. */
  async onAlarm() {
    const room = await this.#loadRoom();
    const stillDisconnected = Object.values(room.disconnectedAt).some((t) => t !== null);
    if (!stillDisconnected || room.phase !== "paused") return; // reconnected before the alarm fired

    room.phase = "done";
    await this.#saveRoom(room);
    const endedMsg: RoomMessage = { t: "roomEnded", reason: "abandoned" };
    for (const c of this.getConnections<ConnState>()) {
      c.send(JSON.stringify(endedMsg));
    }
  }
}
