// Cross-device sync for the Lounge's PlayableCharacter (packages/ui) -
// "I don't see Surya on the screen and the movements syncing" (reported
// live, two real devices in the Lounge at once). PlayableCharacter's own
// header comment already named the intended shape: broadcast the same
// position/facing/state its movement loop already computes, feed it into
// another instance of the same component via its `remote` prop instead of
// live input.
//
// Plain REST polling against a `lounge_presence` table (supabase/migrations
// /0003_lounge_presence.sql), not Supabase Realtime Broadcast/Presence -
// that was the first version, and it looked right in local testing, but
// failed live on the actual phone/network this is meant to run on:
// console logging (see the debug log below, same pattern as
// lib/audio-debug.ts) showed `subscribe-status CHANNEL_ERROR` and repeated
// WebSocket connection failures. Broadcasts could still *send* - the
// Supabase client silently falls back to a plain REST call when the socket
// is down - but *receiving* absolutely requires a live subscription, which
// never actually established. Since this is explicitly meant to run
// primarily on phones (switching WiFi/cellular, getting backgrounded,
// often behind a carrier proxy that doesn't love long-lived WebSockets),
// the fix isn't to keep chasing WebSocket reliability - it's to not depend
// on a persistent connection for this at all. Plain request/response HTTP
// degrades far more gracefully on a flaky network: every poll is
// independent, nothing has to stay alive in between.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CharState, Dir, RemoteCharacterState } from "@ward-games/ui";
import { supabase } from "./supabase";

const TABLE = "lounge_presence";
// How often we write our own row while something's actually changing -
// not a frame-rate, just often enough that the partner's polling (below)
// always has something recent to read. A discrete change (new facing,
// started/stopped sitting) always writes immediately regardless of this
// gap, same reasoning as the old broadcast version's throttle.
const WRITE_MIN_INTERVAL_MS = 300;
// How often we ask the server for the partner's current row. Independent
// of WRITE_MIN_INTERVAL_MS - this is "how fresh do I want my view of them
// to be," not tied to how often they personally happen to be writing.
const POLL_INTERVAL_MS = 600;
// If the partner's row hasn't been touched in this long, treat them as
// gone (closed the tab, lost network, crashed) rather than leaving a
// stale last-known position on screen forever - the real backstop here,
// since the clean-exit delete (below) only covers a normal leave.
const STALE_MS = 8000;
// An idle player (not moving) only ever triggers one write - PlayableCharacter's
// onStateChange only fires when pos/facing/state actually change, so with
// nothing re-touching the row, `updated_at` would just age past STALE_MS
// and they'd incorrectly appear to vanish from their partner's screen
// despite still being right there. Caught live: two sessions, one not
// moving, its row went stale and disappeared within STALE_MS even though
// nothing was actually wrong. A heartbeat re-write of the last known
// state (not necessarily a changed one) at a safe fraction of STALE_MS
// keeps a merely-idle player's row fresh the same way the broadcast
// version's heartbeat did.
const HEARTBEAT_MS = 3000;

interface PresenceRow {
  user_id: string;
  pos_left: number;
  pos_top: number;
  facing: Dir;
  state: CharState;
  scrub_color: string | null;
  updated_at: string;
}

// Observability for exactly this "why don't I see my partner" class of bug
// - there's no way to eyeball a REST poll loop from the outside either, so
// keep the same console+window-global logging lib/audio-debug.ts already
// uses for sound playback: every write, poll result, and staleness
// decision logs to the console and keeps the last 50 on a window global.
export interface LoungePresenceLogEntry {
  at: number;
  event: "write" | "poll" | "stale" | "write-error" | "poll-error";
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
   * writes - null if they're not actually in the Lounge right now (never
   * joined this session, left cleanly, or gone stale per STALE_MS), not
   * merely "hasn't moved yet." */
  partnerState: RemoteCharacterState | null;
  /** Feed PlayableCharacter's `onStateChange` straight into the first
   * three args - internally throttled, so it's safe to call on every
   * pos/facing/state change without worrying about writing too often.
   * `scrubColorHex` is separate from that movement callback (Avatar
   * Setup's choice is static per session, not something PlayableCharacter
   * tracks) - pass it every call anyway, it's cheap, and it rides along
   * on whatever write was already about to happen rather than needing its
   * own throttling/timing logic. */
  broadcastSelf: (pos: { left: number; top: number }, facing: Dir, state: CharState, scrubColorHex?: string) => void;
}

export function useLoungePresence(selfId: string | null): LoungePresence {
  const [partnerState, setPartnerState] = useState<RemoteCharacterState | null>(null);
  const lastWriteAtRef = useRef(0);
  const lastWriteDiscreteRef = useRef<{ facing: Dir; state: CharState } | null>(null);
  // The latest pos/facing/state regardless of throttling - what the
  // heartbeat resends. Separate from lastWriteDiscreteRef (which only
  // tracks facing/state, for the "did the discrete part change" check);
  // this needs the full triple, including pos, since the heartbeat has to
  // send a real row, not just know whether to skip.
  const lastKnownRef = useRef<{ pos: { left: number; top: number }; facing: Dir; state: CharState; scrubColorHex?: string } | null>(
    null
  );

  useEffect(() => {
    if (!selfId) return;
    const myId = selfId; // plain string, so nested closures below don't need their own null check
    let cancelled = false;

    async function poll() {
      const { data, error } = await supabase.from(TABLE).select("*").neq("user_id", myId).limit(1);
      if (cancelled) return;
      if (error) {
        logEvent("poll-error", error.message);
        return;
      }
      const row = (data as PresenceRow[] | null)?.[0];
      if (!row) {
        logEvent("poll", { found: false });
        setPartnerState(null);
        return;
      }
      const ageMs = Date.now() - new Date(row.updated_at).getTime();
      const stale = ageMs > STALE_MS;
      logEvent("poll", { found: true, ageMs, stale, scrub_color: row.scrub_color, pos_left: row.pos_left, pos_top: row.pos_top });
      if (stale) {
        setPartnerState(null);
        return;
      }
      setPartnerState({
        pos: { left: row.pos_left, top: row.pos_top },
        facing: row.facing,
        state: row.state,
        scrubColorHex: row.scrub_color ?? undefined,
      });
    }

    function writeRow(pos: { left: number; top: number }, facing: Dir, state: CharState, scrubColorHex?: string) {
      const row = {
        user_id: myId,
        pos_left: pos.left,
        pos_top: pos.top,
        facing,
        state,
        scrub_color: scrubColorHex ?? null,
        updated_at: new Date().toISOString(),
      };
      logEvent("write", row);
      supabase
        .from(TABLE)
        .upsert(row)
        .then(({ error }) => {
          if (error) logEvent("write-error", error.message);
        });
    }

    poll();
    const pollTimer = window.setInterval(poll, POLL_INTERVAL_MS);
    // Keeps a merely-idle (not moving) player's row from going stale - see
    // the HEARTBEAT_MS comment above. Only fires once there's something
    // real to resend; before the first broadcastSelf call (nothing to
    // report yet), this is a harmless no-op.
    const heartbeatTimer = window.setInterval(() => {
      if (!lastKnownRef.current) return;
      writeRow(lastKnownRef.current.pos, lastKnownRef.current.facing, lastKnownRef.current.state, lastKnownRef.current.scrubColorHex);
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.clearInterval(heartbeatTimer);
      setPartnerState(null);
      lastWriteAtRef.current = 0;
      lastWriteDiscreteRef.current = null;
      lastKnownRef.current = null;
      // Best-effort clean-exit signal - fire-and-forget, nothing here
      // blocks on it finishing, and the STALE_MS timeout already covers
      // the case where this never lands (network gone, tab killed).
      supabase
        .from(TABLE)
        .delete()
        .eq("user_id", myId)
        .then(({ error }) => {
          if (error) logEvent("write-error", error.message);
        });
    };
  }, [selfId]);

  const broadcastSelf = useCallback(
    (pos: { left: number; top: number }, facing: Dir, state: CharState, scrubColorHex?: string) => {
      lastKnownRef.current = { pos, facing, state, scrubColorHex }; // always kept fresh, for the heartbeat to resend
      if (!selfId) return;
      const now = Date.now();
      const last = lastWriteDiscreteRef.current;
      const discreteChanged = !last || last.facing !== facing || last.state !== state;
      if (!discreteChanged && now - lastWriteAtRef.current < WRITE_MIN_INTERVAL_MS) return;
      lastWriteAtRef.current = now;
      lastWriteDiscreteRef.current = { facing, state };
      const row = {
        user_id: selfId,
        pos_left: pos.left,
        pos_top: pos.top,
        facing,
        state,
        scrub_color: scrubColorHex ?? null,
        updated_at: new Date().toISOString(),
      };
      logEvent("write", row);
      supabase
        .from(TABLE)
        .upsert(row)
        .then(({ error }) => {
          if (error) logEvent("write-error", error.message);
        });
    },
    [selfId]
  );

  return { partnerState, broadcastSelf };
}
