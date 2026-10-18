// A small chat bubble between the two players, floating over the Lounge -
// no masterdoc.md screen/FR for this, built on request (see TODO.md).
// Backed by Supabase (supabase/migrations/0002_chat.sql), not the
// Cloudflare Worker's room protocol: chat needs to persist and be readable
// any time either player opens the Lounge, not just for the life of one
// game room, and Postgres+RLS is already this project's home for exactly
// that kind of shared, persistent state (garden, bond, scoreboard all work
// the same way).
//
// Was Supabase Realtime (postgres_changes) originally - switched to plain
// REST polling for the same reason the Lounge's character-position sync
// was (lib/use-lounge-presence.ts's own header comment has the full
// story): the Realtime WebSocket proved unreliable live on the actual
// phone/network this runs on (subscribe-status CHANNEL_ERROR, repeated
// connection failures), and this app is explicitly meant to run primarily
// on phones. Your own message now appears immediately too (optimistic,
// off the real inserted row - no round trip needed to see your own send
// land), which the realtime version never did on its own; it relied on
// the same subscription round-tripping your own insert back to you.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatIcon, IconButton, MIN_TOUCH_TARGET_PX, palette } from "@ward-games/ui";
import { supabase } from "../lib/supabase";
import { useProfiles } from "../lib/use-profiles";
import { sfxChatReceive, sfxConfirm } from "../lib/sfx";

interface ChatRow {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

const HISTORY_LIMIT = 50;
const POLL_INTERVAL_MS = 1500;

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);
  const { byId: nameById } = useProfiles();

  const listRef = useRef<HTMLDivElement>(null);
  // The poll loop is a long-lived effect (mount-only deps) and would
  // otherwise close over `open`'s/`selfId`'s very first value forever - a
  // ref is the usual fix for "a long-lived callback needs to see fresh
  // state" (PlayableCharacter's movement loop uses the same trick).
  const openRef = useRef(open);
  openRef.current = open;
  const selfIdRef = useRef(selfId);
  selfIdRef.current = selfId;
  // Every message id already shown, so a poll result that re-includes our
  // own just-sent message (or one already picked up by an earlier poll)
  // gets deduped instead of appended twice.
  const seenIdsRef = useRef<Set<string>>(new Set());
  // The newest message's created_at seen so far - a ref, not read off
  // `messages` state directly, since the poll loop below is a long-lived
  // effect that only runs once (mount-only deps); closing over `messages`
  // there would freeze it at the empty initial render forever instead of
  // seeing each new message as it arrives.
  const lastCreatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSelfId(data.session?.user.id ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, sender_id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);
      if (cancelled) return;
      if (error) {
        console.error("chat history load failed", error);
        return;
      }
      const rows = [...(data ?? [])].reverse();
      for (const row of rows) seenIdsRef.current.add(row.id);
      if (rows.length > 0) lastCreatedAtRef.current = rows[rows.length - 1]!.created_at;
      setMessages(rows);
    }

    async function poll() {
      let query = supabase
        .from("chat_messages")
        .select("id, sender_id, body, created_at")
        .order("created_at", { ascending: true })
        .limit(HISTORY_LIMIT);
      if (lastCreatedAtRef.current) query = query.gt("created_at", lastCreatedAtRef.current);
      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        console.error("chat poll failed", error);
        return;
      }
      const fresh = (data ?? []).filter((row) => !seenIdsRef.current.has(row.id));
      if (fresh.length === 0) return;
      for (const row of fresh) seenIdsRef.current.add(row.id);
      lastCreatedAtRef.current = fresh[fresh.length - 1]!.created_at;
      setMessages((prev) => [...prev, ...fresh].slice(-HISTORY_LIMIT));
      const fromPartner = fresh.some((row) => row.sender_id !== selfIdRef.current);
      if (fromPartner && !openRef.current) {
        setUnread(true);
        sfxChatReceive();
      }
    }

    loadHistory();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only; poll() reads `messages` fresh via closure each interval tick rather than restarting the interval on every new message
  }, []);

  // Auto-scroll to the newest message whenever the panel's open and the
  // list changes (new message in, or just opened on an existing history).
  useEffect(() => {
    if (!open) return;
    setUnread(false);
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [open, messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selfId) return;
    setDraft("");
    sfxConfirm();
    const { data, error } = await supabase.from("chat_messages").insert({ sender_id: selfId, body }).select().single();
    if (error || !data) {
      console.error("chat send failed", error);
      return;
    }
    // Shows your own message immediately, off the real inserted row -
    // doesn't wait on the next poll tick, and the id gets deduped against
    // if that same row comes back on one anyway.
    if (!seenIdsRef.current.has(data.id)) {
      seenIdsRef.current.add(data.id);
      const row = data as ChatRow;
      lastCreatedAtRef.current = row.created_at;
      setMessages((prev) => [...prev, row].slice(-HISTORY_LIMIT));
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <IconButton label={open ? "Close chat" : "Chat"} onClick={() => setOpen((o) => !o)}>
        <ChatIcon />
        {unread && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: palette.coral,
              border: `1.5px solid ${palette.ink}`,
            }}
          />
        )}
      </IconButton>

      {open && (
        <div
          style={{
            position: "absolute",
            top: MIN_TOUCH_TARGET_PX + 8,
            left: 0,
            width: 280,
            maxWidth: "80vw",
            background: "rgba(20,16,31,0.92)",
            border: `2px solid ${palette.ink}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            // Was 3 - far below a sitting/standing character's own
            // depth-sorted zIndex (PlayableCharacter: pos.top * 10, up to
            // ~920 for CHARACTER_WANDER_BOX's deepest edge), which could
            // visually cover the Send button entirely depending on where
            // in the room a character happened to be standing - caught
            // live via Playwright (a real click, not a visual glance,
            // failing with "element intercepts pointer events"), not just
            // a cosmetic z-fighting issue. 950 sits safely above every
            // realistic character position but still under the sit
            // button's 1000 (no real conflict there - different UI areas).
            zIndex: 950,
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
          }}
        >
          <div
            ref={listRef}
            style={{
              maxHeight: 220,
              minHeight: 80,
              overflowY: "auto",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {messages.length === 0 && (
              <p style={{ margin: 0, fontSize: 12, color: palette.lilacMist, opacity: 0.7 }}>
                No messages yet - say hi.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === selfId;
              const name = nameById[m.sender_id] ?? "...";
              return (
                <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: palette.lilacMist,
                      opacity: 0.7,
                      marginBottom: 1,
                      textAlign: mine ? "right" : "left",
                    }}
                  >
                    {mine ? "You" : name}
                  </div>
                  <div
                    style={{
                      background: mine ? palette.amethyst : "rgba(255,255,255,0.1)",
                      color: palette.white,
                      borderRadius: 10,
                      padding: "6px 10px",
                      fontSize: 13,
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                    }}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleSend}
            style={{
              display: "flex",
              gap: 6,
              padding: 8,
              borderTop: `1px solid rgba(255,255,255,0.15)`,
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message..."
              maxLength={500}
              style={{
                flex: 1,
                minWidth: 0,
                background: "rgba(255,255,255,0.08)",
                border: `1px solid rgba(255,255,255,0.2)`,
                borderRadius: 8,
                padding: "6px 8px",
                color: palette.white,
                fontSize: 13,
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              style={{
                background: palette.amethyst,
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                color: palette.white,
                fontSize: 13,
                cursor: draft.trim() ? "pointer" : "default",
                opacity: draft.trim() ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
