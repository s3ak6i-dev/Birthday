// Cross-device sync for the Lounge's PlayableCharacter (packages/ui) -
// "I don't see Surya on the screen and the movements syncing" (reported
// live, two real devices in the Lounge at once). PlayableCharacter's own
// header comment already named the intended shape: broadcast the same
// position/facing/state its movement loop already computes, feed it into
// another instance of the same component via its `remote` prop instead of
// live input.
//
// Built on Supabase Realtime's Broadcast + Presence, not the Cloudflare
// Worker rooms protocol (apps/rooms) - the Lounge isn't a bounded game
// session with a room code and a start/end, it's an always-on shared
// space, which is exactly what Presence/Broadcast are for (same system
// ChatPanel already uses for the Lounge's chat thread, just the
// broadcast/presence half of Realtime instead of postgres_changes).
// Broadcast messages never touch Postgres - pure ephemeral pub/sub over
// the Realtime server, so there's no database cost to a frequent position
// broadcast, only WebSocket message volume (trivial for two users).
import { useCallback, useEffect, useRef, useState } from "react";
import type { CharState, Dir, RemoteCharacterState } from "@ward-games/ui";
import { supabase } from "./supabase";

const CHANNEL_NAME = "lounge-presence";
const BROADCAST_EVENT = "move";
// A position sample is sent at most this often; a facing/state change
// (e.g. starting to sit) always goes out immediately regardless of this
// gap, since that's a discrete event worth not delaying, not a continuous
// value worth sampling.
const MIN_BROADCAST_INTERVAL_MS = 100;
// A self-healing resend, independent of whatever triggered the original
// broadcastSelf call - belt-and-suspenders against any one-off race around
// first joining (observed live: the flush-on-"SUBSCRIBED" fix below
// mostly closes this, but didn't fully account for React StrictMode's
// double effect-invocation in dev tearing a channel down and recreating
// it right as the first one subscribes). Cheap at a 2s interval for two
// users on an ephemeral broadcast channel - this is not a database write.
const HEARTBEAT_MS = 2000;

interface MovePayload {
  senderId: string;
  state: RemoteCharacterState;
}

// Observability for exactly this "why don't I see my partner" class of bug
// - there's no way to eyeball a WebSocket from the outside, so the first
// debugging session for this feature (both players actually in the Lounge,
// still not seeing each other even after confirming chat's own Realtime
// connection works) needed instrumentation, not another guess. Same
// pattern lib/audio-debug.ts already uses for "did this sound actually
// play": log to console AND keep the last N entries on a window global, so
// either a person with devtools open or a Playwright check can read back
// what actually happened instead of needing to catch it live.
export interface LoungePresenceLogEntry {
  at: number;
  event: "subscribe-status" | "send" | "receive" | "presence-sync";
  detail: unknown;
}
const MAX_LOG_ENTRIES = 50;
declare global {
  interface Window {
    __loungePresenceLog?: LoungePresenceLogEntry[];
  }
}
function logEvent(event: LoungePresenceLogEntry["event"], detail: unknown) {
  if (typeof window === "undefined") return;
  window.__loungePresenceLog = window.__loungePresenceLog ?? [];
  window.__loungePresenceLog.push({ at: Date.now(), event, detail });
  if (window.__loungePresenceLog.length > MAX_LOG_ENTRIES) window.__loungePresenceLog.shift();
  // eslint-disable-next-line no-console
  console.log(`[lounge-presence] ${event}`, detail);
}

export interface LoungePresence {
  /** The partner's last-known pos/facing/state, straight off their own
   * broadcasts - null if they're not actually in the Lounge right now
   * (never joined this session, or just left/closed the tab), not merely
   * "hasn't moved yet." */
  partnerState: RemoteCharacterState | null;
  /** Feed PlayableCharacter's `onStateChange` straight into this -
   * internally throttled, so it's safe to call on every pos/facing/state
   * change without worrying about flooding the channel. */
  broadcastSelf: (pos: { left: number; top: number }, facing: Dir, state: CharState) => void;
}

export function useLoungePresence(selfId: string | null): LoungePresence {
  const [partnerState, setPartnerState] = useState<RemoteCharacterState | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentAtRef = useRef(0);
  const lastSentDiscreteRef = useRef<{ facing: Dir; state: CharState } | null>(null);
  // PlayableCharacter reports its initial pos/facing/state on mount (see
  // its own onStateChange effect), typically well before this channel has
  // finished subscribing - a send attempted that early silently never
  // reaches anyone (Realtime has no "queue it for once I'm ready" behavior
  // of its own), and if nothing moves after that - two players standing
  // still - the partner never learns the other one is even in the Lounge.
  // Caught live: standing still after joining showed 0 elements for the
  // partner on the other device. Fixed by stashing whatever the latest
  // call to `broadcastSelf` was and flushing it for real the instant the
  // channel actually reaches "SUBSCRIBED", instead of only ever sending in
  // direct response to a state change.
  const pendingRef = useRef<MovePayload["state"] | null>(null);

  useEffect(() => {
    if (!selfId) return;
    const myId = selfId; // narrowed to a plain string so the nested flushPending() closure below can use it - TS doesn't carry the `if (!selfId) return` narrowing into a nested function body
    const channel = supabase.channel(CHANNEL_NAME, { config: { presence: { key: myId } } });
    channelRef.current = channel;

    channel.on("broadcast", { event: BROADCAST_EVENT }, ({ payload }: { payload: MovePayload }) => {
      logEvent("receive", payload);
      if (payload.senderId === myId) return; // shouldn't normally happen, cheap safety net either way
      setPartnerState(payload.state);
    });

    // Presence is the "are they actually here" signal a broadcast channel
    // has no concept of on its own - clears the partner's character the
    // instant they leave (tab close, navigate away, lose connection)
    // instead of leaving a stale last-known position on screen forever.
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const keys = Object.keys(state);
      const partnerStillHere = keys.some((key) => key !== myId);
      logEvent("presence-sync", { keys, partnerStillHere });
      if (!partnerStillHere) setPartnerState(null);
    });

    function flushPending() {
      if (!pendingRef.current) return;
      const payload: MovePayload = { senderId: myId, state: pendingRef.current };
      channel.send({ type: "broadcast", event: BROADCAST_EVENT, payload });
      logEvent("send", payload);
    }

    channel.subscribe((status) => {
      logEvent("subscribe-status", status);
      if (status !== "SUBSCRIBED") return;
      channel.track({ online: true });
      flushPending();
    });

    const heartbeat = window.setInterval(flushPending, HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
      setPartnerState(null);
      lastSentAtRef.current = 0;
      lastSentDiscreteRef.current = null;
      pendingRef.current = null;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selfId]);

  const broadcastSelf = useCallback(
    (pos: { left: number; top: number }, facing: Dir, state: CharState) => {
      pendingRef.current = { pos, facing, state }; // always kept fresh, flushed on subscribe if nothing's sent yet
      const channel = channelRef.current;
      if (!channel || !selfId) {
        logEvent("send", { skipped: "no channel yet", pos, facing, state });
        return;
      }
      const now = Date.now();
      const last = lastSentDiscreteRef.current;
      const discreteChanged = !last || last.facing !== facing || last.state !== state;
      if (!discreteChanged && now - lastSentAtRef.current < MIN_BROADCAST_INTERVAL_MS) return; // too frequent, not worth logging every skip
      lastSentAtRef.current = now;
      lastSentDiscreteRef.current = { facing, state };
      const payload: MovePayload = { senderId: selfId, state: { pos, facing, state } };
      logEvent("send", payload);
      channel.send({ type: "broadcast", event: BROADCAST_EVENT, payload });
    },
    [selfId]
  );

  return { partnerState, broadcastSelf };
}
