// The client half of the rooms protocol (masterdoc.md section 4.6). Wraps
// a PartySocket (the official client for partyserver, which apps/rooms is
// built on) and exposes the room's lobby status + live game state as React
// state, translating `send()` calls into the shared RoomMessage envelope.
import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import type { GameId, PlayerId, RoomMessage, RoomPhase, RoomPlayerStatus } from "@ward-games/shared";
import { supabase } from "./supabase";

// Matches apps/rooms' wrangler dev port locally; in production this should
// come from an env var pointing at the deployed Worker (TODO once that
// exists - see TODO.md M0, Cloudflare Worker deploy).
const ROOMS_HOST = import.meta.env.VITE_ROOMS_HOST ?? "127.0.0.1:8787";

export interface RoomHandle<TState> {
  /** "connecting" until the first roomState arrives; "closed" once the
   * server tells us the room ended or the socket itself dies. */
  status: "connecting" | "open" | "closed";
  phase: RoomPhase;
  players: RoomPlayerStatus[];
  countdownEndsAt: number | null;
  /** The redacted game state once phase is "playing"/"done" - null before
   * that, since there's nothing to show yet. */
  gameState: TState | null;
  /** This device's own user id, once known (after the Supabase session
   * loads) - null very briefly on first mount. */
  selfId: PlayerId | null;
  /** This device's own email, so the UI can resolve a display name/avatar
   * via lib/characters.ts's characterForEmail - the room protocol itself
   * never learns names, only the two known Supabase user ids. */
  selfEmail: string | null;
  endedReason: "abandoned" | "left" | null;
  lastError: string | null;
  toggleReady: () => void;
  sendAction: (payload: unknown) => void;
  sendReaction: (emoji: string) => void;
  leave: () => void;
}

export function useRoom<TState = unknown>(code: string, game: GameId, mode?: string): RoomHandle<TState> {
  const [status, setStatus] = useState<RoomHandle<TState>["status"]>("connecting");
  const [phase, setPhase] = useState<RoomPhase>("waiting");
  const [players, setPlayers] = useState<RoomPlayerStatus[]>([]);
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [gameState, setGameState] = useState<TState | null>(null);
  const [selfId, setSelfId] = useState<PlayerId | null>(null);
  const [selfEmail, setSelfEmail] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<"abandoned" | "left" | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: PartySocket | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const userId = data.session?.user.id;
      if (cancelled || !token || !userId) return;

      setSelfId(userId);
      setSelfEmail(data.session?.user.email ?? null);

      const query: Record<string, string> = { token };
      query.game = game;
      if (mode) query.mode = mode;

      socket = new PartySocket({ host: ROOMS_HOST, party: "ward-room", room: code, query });
      socketRef.current = socket;

      socket.addEventListener("message", (event) => {
        const msg: RoomMessage = JSON.parse(event.data);
        switch (msg.t) {
          case "roomState":
            setStatus("open");
            setPhase(msg.phase);
            setPlayers(msg.players);
            setCountdownEndsAt(msg.countdownEndsAt);
            return;
          case "state":
            setGameState(msg.state as TState);
            return;
          case "pause":
            return; // roomState's phase already reflects "paused"
          case "resume":
            return; // likewise, reflected via the next roomState
          case "roomEnded":
            setStatus("closed");
            setEndedReason(msg.reason);
            return;
          case "error":
            setLastError(msg.message);
            return;
          default:
            return;
        }
      });

      socket.addEventListener("close", () => {
        setStatus((s) => (s === "closed" ? s : "closed"));
      });
    })();

    return () => {
      cancelled = true;
      socket?.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, game, mode]);

  const send = useCallback((msg: RoomMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

  const toggleReady = useCallback(() => send({ t: "ready" }), [send]);
  const sendAction = useCallback((payload: unknown) => send({ t: "action", game, payload }), [send, game]);
  const sendReaction = useCallback((emoji: string) => send({ t: "reaction", emoji }), [send]);
  const leave = useCallback(() => send({ t: "leave" }), [send]);

  return {
    status,
    phase,
    players,
    countdownEndsAt,
    gameState,
    selfId,
    selfEmail,
    endedReason,
    lastError,
    toggleReady,
    sendAction,
    sendReaction,
    leave,
  };
}
