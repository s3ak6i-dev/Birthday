// A small realtime chat bubble between the two players, floating over the
// Lounge - no masterdoc.md screen/FR for this, built on request (see
// TODO.md). Backed by Supabase (supabase/migrations/0002_chat.sql), not the
// Cloudflare Worker's room protocol: chat needs to persist and be readable
// any time either player opens the Lounge, not just for the life of one
// game room, and Postgres+RLS is already this project's home for exactly
// that kind of shared, persistent state (garden, bond, scoreboard all work
// the same way).
//
// This is also the first use of Supabase Realtime (postgres_changes) in
// this codebase - every other "realtime" feature here is the bespoke
// Durable Object WebSocket rooms protocol in apps/rooms, a different
// transport for a different job (ephemeral, per-room game state).
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatIcon, IconButton, MIN_TOUCH_TARGET_PX, palette } from "@ward-games/ui";
import { supabase } from "../lib/supabase";
import { useProfiles } from "../lib/use-profiles";
import { sfxConfirm } from "../lib/sfx";

interface ChatRow {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

const HISTORY_LIMIT = 50;

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);
  const { byId: nameById } = useProfiles();

  const listRef = useRef<HTMLDivElement>(null);
  // The realtime subscription callback is set up once (mount-only effect
  // below) and would otherwise close over `open`'s very first value
  // forever - a ref is the usual fix for "a long-lived callback needs to
  // see fresh state" (PlayableCharacter's movement loop uses the same
  // trick for the same reason).
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSelfId(data.session?.user.id ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("chat_messages")
      .select("id, sender_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("chat history load failed", error);
          return;
        }
        setMessages([...(data ?? [])].reverse());
      });

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as ChatRow;
          setMessages((prev) => [...prev, row].slice(-HISTORY_LIMIT));
          if (!openRef.current) setUnread(true);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
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
    const { error } = await supabase.from("chat_messages").insert({ sender_id: selfId, body });
    if (error) console.error("chat send failed", error);
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
            zIndex: 3,
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
