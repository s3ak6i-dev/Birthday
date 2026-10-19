// S08 Waiting room + S09 pause overlay, generic across every game. See
// masterdoc.md section 2.2 (screen inventory), FR-20..23, and section 4.6
// (realtime rooms protocol).
//
// Route: /g/:game/:code. Connecting here is what *creates* the room if
// `:code` doesn't exist yet (apps/rooms/src/ward-room.ts: a room is
// created lazily by whichever client connects first) - there's no
// separate "create" step, "Create Room" on the intro screen just means
// "navigate here with a fresh random code".
//
// Once the room's phase moves to "playing"/"done" this renders the
// game's real board instead of the lobby. Guess the Diagnosis, Triage
// Dial, and Wordle all have real room boards now (GuessTheDiagnosisRoomBoard/
// TriageDialRoomBoard/WordleRoomBoard) - Code Red and Case Files still only
// have engine stubs with no board at all (TODO.md M2/M3), so this says so
// plainly rather than silently falling back to something that isn't
// actually multiplayer.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PixelButton, palette } from "@ward-games/ui";
import { ROOM, type GameId } from "@ward-games/shared";
import { useRoom } from "../lib/use-room";
import { CHARACTERS, characterForEmail } from "../lib/characters";
import { supabase } from "../lib/supabase";
import { useProfiles } from "../lib/use-profiles";
import { sfxCountdownGo, sfxCountdownTick, sfxReactionPop } from "../lib/sfx";
import { GuessTheDiagnosisRoomBoard } from "./GuessTheDiagnosisRoomBoard";
import { TriageDialRoomBoard } from "./TriageDialRoomBoard";
import { WordleRoomBoard } from "./WordleRoomBoard";
import { GAME_META_BY_ID } from "../lib/game-meta";

const GAME_LABEL: Record<GameId, string> = {
  "guess-the-diagnosis": "Guess the Diagnosis",
  "triage-dial": "Triage Dial",
  wordle: "Medical Wordle",
  "code-red": "Code Red",
  "case-files": "Case Files",
};

const REACTION_GLYPH: Record<string, string> = {
  clap: "👏",
  heart: "❤️",
  skull: "💀",
  brain: "🧠",
  laugh: "😂",
  stethoscope: "🩺",
};

function isGameId(value: string | undefined): value is GameId {
  return !!value && value in GAME_LABEL;
}

export function WaitingRoom() {
  const { game, code } = useParams<{ game: string; code: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selfEmailFallback, setSelfEmailFallback] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState("");

  const validGame = isGameId(game);
  // Only meaningful the moment a room is first created (ward-room.ts only
  // reads this from whoever connects first) - Triage Dial's coop/versus and
  // Wordle's daily/race/duel. Carried as a query param rather than part of
  // the route itself since every other game (and "Join room," which never
  // sets this) uses the exact same /g/:game/:code shape.
  const mode = searchParams.get("mode") ?? undefined;
  const room = useRoom(code ?? "", validGame ? (game as GameId) : "guess-the-diagnosis", mode);

  useEffect(() => {
    // Backfill only - useRoom already resolves this from the session itself
    // a tick later; this just avoids "Loading..." flashing self's own slot
    // in the (common) case the session was already warm on mount.
    supabase.auth.getSession().then(({ data }) => setSelfEmailFallback(data.session?.user.email ?? null));
  }, []);

  useEffect(() => {
    if (room.lastError === null) return;
    // Transient - the server already dropped the bad message, nothing to
    // retry; just surface it and let it clear on the next render pass.
  }, [room.lastError]);

  useEffect(() => {
    let raf: number;
    let lastShown: string | null = null;
    function tick() {
      if (room.countdownEndsAt) {
        const msLeft = room.countdownEndsAt - Date.now();
        const shown = msLeft > 500 ? String(Math.ceil(msLeft / 1000)) : "Go!";
        if (shown !== lastShown) {
          // Only on an actual second-transition (3 -> 2 -> 1 -> Go!), not
          // every animation frame in between.
          lastShown = shown;
          if (shown === "Go!") sfxCountdownGo();
          else sfxCountdownTick();
        }
        setCountdownText(shown);
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(raf);
  }, [room.countdownEndsAt]);

  // Your own tap: sent immediately, locally, without waiting on a server
  // round-trip. The floating animation itself is handled inside
  // ReactionDock now (see its own comment) - it owns the button DOM nodes
  // it needs to measure to spawn a float from the right one.
  function sendReaction(emoji: string) {
    sfxReactionPop();
    room.sendReaction(emoji);
  }

  // The partner's reaction: ward-room.ts relays a "reaction" message to
  // every *other* connection in the room (never echoed back to the
  // sender), and useRoom surfaces that as `incomingReaction` - this was the
  // missing half (FR-23 shipped send+relay but never actually displayed
  // what arrived on the receiving end, see TODO.md). Passed straight
  // through to ReactionDock, which spawns a float from its own matching
  // button the same way a local click does.

  if (!validGame || !code) {
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>
        <h1>Unknown room</h1>
      </main>
    );
  }

  const selfEmail = room.selfEmail ?? selfEmailFallback;
  const selfCharacter = characterForEmail(selfEmail);
  const partnerCharacter = selfCharacter ? CHARACTERS.find((c) => c.id !== selfCharacter.id) : undefined;
  // Settings' display-name field writes to this same `profiles` table -
  // prefer it over the fixed character label so a rename actually shows
  // up in a live room, not just in chat (ChatPanel already reads the same
  // table). Falls back to the character label whenever profiles hasn't
  // loaded yet or someone hasn't set a custom name.
  const { byId: profileNameById } = useProfiles();

  function labelFor(userId: string): string {
    if (profileNameById[userId]) return profileNameById[userId];
    if (userId === room.selfId) return selfCharacter?.label ?? "You";
    return partnerCharacter?.label ?? "Partner";
  }

  function bustFor(userId: string): string | undefined {
    if (userId === room.selfId) return selfCharacter?.bust;
    return partnerCharacter?.bust;
  }

  if (room.endedReason) {
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>
        <h1>
          {room.endedReason === "abandoned"
            ? "Your partner didn't reconnect in time - the ward closed this room."
            : "This room was left."}
        </h1>
        <PixelButton onClick={() => navigate(GAME_META_BY_ID[game as GameId].introRoute)}>
          Back to {GAME_LABEL[game as GameId]}
        </PixelButton>
      </main>
    );
  }

  if (room.phase === "playing" || room.phase === "done" || room.phase === "paused") {
    const board =
      game === "guess-the-diagnosis" ? (
        <GuessTheDiagnosisRoomBoard room={room} labelFor={labelFor} />
      ) : game === "triage-dial" ? (
        <TriageDialRoomBoard room={room} labelFor={labelFor} />
      ) : game === "wordle" ? (
        <WordleRoomBoard room={room} labelFor={labelFor} />
      ) : null;

    if (board) {
      return (
        <>
          {board}
          {room.phase === "paused" && <ReconnectOverlay onLeave={() => room.leave()} />}
          <ReactionDock onReact={sendReaction} incoming={room.incomingReaction} />
        </>
      );
    }
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>
          <Link to="/" style={{ color: palette.white }}>
            ← Back to the Lounge
          </Link>
        </p>
        <h1>{GAME_LABEL[game as GameId]} multiplayer isn't wired up yet</h1>
        <p style={{ opacity: 0.8, maxWidth: 480 }}>
          The room itself is live and your partner is connected, but this game's board still only knows how to play
          locally on one device (TODO.md M1) - the real-room version hasn't been built for it yet.
        </p>
      </main>
    );
  }

  const code4 = code.toUpperCase();
  const shareUrl = `${window.location.origin}/g/${game}/${code4}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        color: palette.white,
        background: palette.ink,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "min(92vw, 560px)" }}>
        <p>
          <Link to={GAME_META_BY_ID[game as GameId].introRoute} style={{ color: palette.white }}>
            ← Back to {GAME_LABEL[game as GameId]}
          </Link>
        </p>

        <h1 style={{ margin: "8px 0 4px" }}>
          {room.phase === "countdown" ? `Starting in ${countdownText}` : "Waiting room"}
        </h1>

        {room.phase === "waiting" && (
          <>
            <p style={{ opacity: 0.8 }}>Share this code or link with your partner to start {GAME_LABEL[game as GameId]}.</p>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                background: palette.violet,
                border: `3px solid ${palette.ink}`,
                borderRadius: 8,
                padding: "12px 16px",
                margin: "12px 0",
              }}
            >
              <span style={{ fontSize: 32, letterSpacing: 6, fontWeight: 700 }}>{code4}</span>
              <PixelButton onClick={() => navigator.clipboard?.writeText(shareUrl).catch(() => {})}>
                Copy link
              </PixelButton>
            </div>
          </>
        )}

        <div style={{ display: "grid", gap: 10, margin: "16px 0" }}>
          {[0, 1].map((slot) => {
            const status = room.players[slot];
            if (!status) {
              return (
                <div
                  key={slot}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    border: `1px dashed ${palette.deepViolet}`,
                    borderRadius: 8,
                    opacity: 0.6,
                  }}
                >
                  Waiting for someone to join...
                </div>
              );
            }
            const bust = bustFor(status.userId);
            return (
              <div
                key={status.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "rgba(20,16,31,0.55)",
                  border: `1px solid ${palette.deepViolet}`,
                  borderRadius: 8,
                }}
              >
                {bust && <img src={bust} alt="" style={{ height: 48, width: "auto", objectFit: "contain" }} />}
                <div style={{ flex: 1 }}>
                  <strong>{labelFor(status.userId)}</strong>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {status.connected ? "Connected" : "Disconnected"}
                    {status.ready && " - Ready"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {room.phase === "waiting" && (
          <PixelButton onClick={() => room.toggleReady()}>
            {room.players.find((p) => p.userId === room.selfId)?.ready ? "Not ready" : "I'm ready"}
          </PixelButton>
        )}

        {room.lastError && <p style={{ color: palette.coral, marginTop: 12 }}>{room.lastError}</p>}
      </div>
    </main>
  );
}

function ReconnectOverlay({ onLeave }: { onLeave: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(ROOM.reconnectHoldSeconds);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      setSecondsLeft(Math.max(0, ROOM.reconnectHoldSeconds - Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
    >
      <div style={{ background: palette.violet, padding: 24, borderRadius: 8, textAlign: "center", color: palette.white }}>
        <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Partner reconnecting...</p>
        <p style={{ margin: "0 0 16px", opacity: 0.85 }}>Holding this seat for {secondsLeft}s.</p>
        <PixelButton variant="danger" onClick={onLeave}>
          Leave room
        </PixelButton>
      </div>
    </div>
  );
}

interface ReactionFloat {
  id: number;
  emoji: string;
  left: number;
}

function ReactionDock({
  onReact,
  incoming,
}: {
  onReact: (emoji: string) => void;
  incoming: { emoji: string; at: number } | null;
}) {
  const [floats, setFloats] = useState<ReactionFloat[]>([]);
  // One ref per emoji button - spawning a float needs that specific
  // button's own on-screen position, not a single shared spot, so mashing
  // the same emoji streams repeatedly up from directly above it instead of
  // every tap (self or partner's) always rising from one fixed corner.
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function spawnFloat(emoji: string) {
    const btn = buttonRefs.current[emoji];
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setFloats((prev) => [...prev, { id, emoji: REACTION_GLYPH[emoji] ?? emoji, left: rect.left + rect.width / 2 }]);
    // Floats are appended, never overwritten, so tapping the same emoji
    // repeatedly stacks several rising at once (a "stream") instead of
    // each new tap just restarting the one shared float that used to
    // exist here.
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 1400);
  }

  function handleClick(emoji: string) {
    onReact(emoji);
    spawnFloat(emoji);
  }

  // `at` makes the same emoji received twice in a row still a distinct
  // dependency value, so this fires again instead of no-op'ing on an
  // unchanged object.
  useEffect(() => {
    if (!incoming) return;
    spawnFloat(incoming.emoji);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- spawnFloat closes over current buttonRefs/setFloats, re-created each render is fine; only `incoming` should re-trigger this
  }, [incoming]);

  return (
    <>
      <style>{`@keyframes ward-float-up { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-60px); opacity: 0; } }`}</style>
      <div
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          display: "flex",
          gap: 6,
          zIndex: 40,
        }}
      >
        {ROOM.reactionEmojis.map((emoji) => (
          <button
            key={emoji}
            ref={(el) => {
              buttonRefs.current[emoji] = el;
            }}
            onClick={() => handleClick(emoji)}
            title={emoji}
            style={{
              fontSize: 20,
              background: "rgba(20,16,31,0.7)",
              border: `1px solid ${palette.deepViolet}`,
              borderRadius: 999,
              width: 36,
              height: 36,
              cursor: "pointer",
            }}
          >
            {REACTION_GLYPH[emoji] ?? emoji}
          </button>
        ))}
      </div>
      {floats.map((f) => (
        <div
          key={f.id}
          style={{
            position: "fixed",
            bottom: 60,
            left: f.left,
            transform: "translateX(-50%)",
            zIndex: 41,
            pointerEvents: "none",
          }}
        >
          {/* The rise animation sets `transform` itself (translateY), which
              would clobber the translateX(-50%) centering above if both
              lived on the same element - split across an inner/outer pair
              so each transform applies independently. */}
          <div style={{ fontSize: 32, animation: "ward-float-up 1.4s ease-out forwards" }}>{f.emoji}</div>
        </div>
      ))}
    </>
  );
}
