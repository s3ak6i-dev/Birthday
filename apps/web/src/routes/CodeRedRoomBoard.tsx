// The real, server-authoritative Code Red board (S31/32/33), played over
// an actual room (apps/rooms). See masterdoc.md section 3.4 (FR-60..69)
// and section 4.6 (realtime rooms protocol). Same shape as
// GuessTheDiagnosisRoomBoard.tsx/TriageDialRoomBoard.tsx: everything here
// renders off `room.gameState`, already redacted for this exact player
// (CodeRedRedactedState - see that type's own header comment for exactly
// what each role can and can't see and why).
//
// No local-sim counterpart exists for this game (unlike the other three,
// which each started as a pass-and-play board before the real room
// version) - FR-63's whole point is that Bedside and Protocol can't see
// each other's screen, which a single-device local sim can't honestly
// represent at all.
//
// The shared countdown (FR-62) is driven by a `tick` action the client
// sends periodically rather than the server reading its own clock -
// reduce() must stay pure (see engine.ts's own comment on this), so the
// client is the one pacing time, same pattern Triage Dial's moveNeedle
// already established for frequent updates.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DialogueScene, PixelButton, palette, playLoopingSound } from "@ward-games/ui";
import type { CodeRedAction, CodeRedOrder, CodeRedRedactedState } from "@ward-games/shared";
import type { RoomHandle } from "../lib/use-room";
import { CODE_RED_TUTORIAL } from "./code-red-tutorial";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { recordGameResult, unlockSticker } from "../lib/progress";
import {
  CODE_RED_HEART_MONITOR_KEY,
  GYNA_SQUAWK_KEY,
  GYNA_TYPE_KEY,
  sfxConfirm,
  sfxError,
  sfxLockIn,
  sfxLose,
  sfxStickerUnlock,
  sfxWin,
} from "../lib/sfx";
import { ChatPanel } from "../components/ChatPanel";

const TUTORIAL_SEEN_KEY = "ward-games:tutorial-seen:code-red";

// How often the client pings the server with its own elapsed-time
// reading while live. 2s rather than every second - this only needs to
// be frequent enough that the vitals timeline and the 5-minute countdown
// both feel live, not frame-perfect (it's a cooperative puzzle clock, not
// a reaction-time test).
const TICK_INTERVAL_MS = 2000;

// No dedicated Code Red sounds exist yet (a heart-monitor beep, an alarm
// pulse - masterdoc.md 2.7's own wishlist) - reusing the closest existing
// registered sounds rather than blocking this board on new audio assets.
// Swap these for real ones once sourced, same as the art.
const SFX_ORDER_CORRECT = sfxConfirm;
const SFX_ORDER_WRONG = sfxError;
const SFX_RADIO_SEND = sfxLockIn;

const RADIO_PHRASES: { id: string; label: string }[] = [
  { id: "copy", label: "Copy that" },
  { id: "say-again", label: "Say again?" },
  { id: "hold-on", label: "Hold on" },
  { id: "applying", label: "Applying now" },
  { id: "trouble", label: "Something's wrong" },
];
const RADIO_PHRASE_LABEL: Record<string, string> = Object.fromEntries(RADIO_PHRASES.map((p) => [p.id, p.label]));

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function orderLabel(orderOptions: CodeRedOrder[], orderId: string): string {
  return orderOptions.find((o) => o.id === orderId)?.label ?? orderId;
}

const OUTCOME_HEADLINE: Record<string, string> = {
  success: "Patient stabilized.",
  "code-called": "Code called.",
  timeout: "Time ran out.",
};

export function CodeRedRoomBoard({ room, labelFor: _labelFor }: { room: RoomHandle<unknown>; labelFor: (userId: string) => string }) {
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return localStorage.getItem(TUTORIAL_SEEN_KEY) !== "1";
    } catch {
      return true;
    }
  });

  function dismissTutorial() {
    setShowTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    } catch {
      // per artifact/browser-storage guidance: never let a storage failure break the page
    }
  }

  const view = room.gameState as CodeRedRedactedState | null;

  function dispatch(action: CodeRedAction) {
    room.sendAction(action);
  }

  // Client-paced clock: re-anchor to the latest server-confirmed
  // elapsedSeconds every time one arrives (covers a fresh start AND a
  // reconnect picking up mid-scenario, since either way the next value
  // this effect sees is simply "whatever the server now says"), then tick
  // forward locally from that anchor. Never read Date.now() to decide
  // *what to send* without going through this anchor-then-offset dance -
  // see engine.ts's own note on why reduce() can't take a raw timestamp.
  const clockAnchorRef = useRef<{ base: number; syncedAt: number } | null>(null);
  useEffect(() => {
    if (!view || view.phase !== "live") {
      clockAnchorRef.current = null;
      return;
    }
    clockAnchorRef.current = { base: view.elapsedSeconds, syncedAt: Date.now() };
  }, [view?.phase, view?.elapsedSeconds]);

  useEffect(() => {
    if (!view || view.phase !== "live") return;
    const id = window.setInterval(() => {
      const anchor = clockAnchorRef.current;
      if (!anchor) return;
      dispatch({ type: "tick", elapsedSeconds: anchor.base + (Date.now() - anchor.syncedAt) / 1000 });
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispatch is stable (closes over room, not state)
  }, [view?.phase]);

  // Ambient heart-monitor loop for the duration of "live" - plays for both
  // roles (Protocol's in the same room on a call, not literally deaf to
  // the monitor beeping just because it's not their screen), stops the
  // instant phase moves on so debrief doesn't play over it.
  useEffect(() => {
    if (!view || view.phase !== "live") return;
    const stop = playLoopingSound(CODE_RED_HEART_MONITOR_KEY);
    return () => stop();
  }, [view?.phase]);

  // Order-attempt feedback: the engine never throws for a wrong-but-legal
  // order (FR-66 - it costs time/an error instead of failing the action
  // outright), so there's no rejected-action error message to hang a
  // sound off. Comparing this render's errors/ordersApplied against the
  // previous one is what actually tells a Bedside player "that last tap
  // was right" vs "wrong" distinctly from a sound.
  const prevErrorsRef = useRef<number | null>(null);
  const prevAppliedCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!view || view.role !== "bedside" || view.phase !== "live") return;
    const appliedCount = view.ordersApplied?.length ?? 0;
    if (prevErrorsRef.current !== null && view.errors > prevErrorsRef.current) {
      SFX_ORDER_WRONG();
    } else if (prevAppliedCountRef.current !== null && appliedCount > prevAppliedCountRef.current) {
      SFX_ORDER_CORRECT();
    }
    prevErrorsRef.current = view.errors;
    prevAppliedCountRef.current = appliedCount;
  }, [view]);

  // Cooperative, not adversarial (FR-60..69 never pits the two players
  // against each other) - both roles record the same outcome, same as
  // each other, rather than one "winning" and the other "losing" the way
  // Guess the Diagnosis/Triage Dial versus do.
  const recordedResultRef = useRef(false);
  useEffect(() => {
    if (!view || view.phase !== "debrief" || !view.debrief || recordedResultRef.current) return;
    const selfId = room.selfId;
    if (!selfId) return;
    recordedResultRef.current = true;
    const outcome = view.debrief.outcome === "success" ? "win" : "loss";
    recordGameResult(selfId, "code-red", outcome).catch(() => {});
    if (outcome === "win") {
      sfxWin();
    } else {
      sfxLose();
      unlockSticker(selfId, 7) // "Minor Setback" - lose any live game
        .then(() => sfxStickerUnlock())
        .catch(() => {});
    }
  }, [view, room.selfId]);

  if (showTutorial) {
    return (
      <DialogueScene
        lines={CODE_RED_TUTORIAL}
        portraits={GYNA_PORTRAITS}
        squawkKey={GYNA_SQUAWK_KEY}
        typeKey={GYNA_TYPE_KEY}
        onComplete={dismissTutorial}
        onSkip={dismissTutorial}
      />
    );
  }

  if (!view) {
    return (
      <main style={{ padding: 24, color: palette.white, background: palette.ink, minHeight: "100vh" }}>
        <p>Loading the board...</p>
      </main>
    );
  }

  const timeRemaining = Math.max(0, view.timeLimitSeconds - view.elapsedSeconds);
  const roleLabel = view.role === "bedside" ? "Bedside" : "Protocol";
  // Two different backgrounds, not one shared board image like the other
  // three games - FR-63's whole premise is that Bedside and Protocol are
  // in two different physical spots, so the one thing every other board
  // gets to assume (both players are looking at the same scene) doesn't
  // hold here. Same background for every phase (briefing/live/debrief) -
  // role is already known at briefing, no reason to pick a third "neutral"
  // background just for that screen.
  const boardImage = view.role === "bedside" ? "/code_red_board_bedside.png" : "/code_red_board_protocol.png";

  return (
    <main style={{ position: "relative", minHeight: "100vh", color: palette.white, padding: 16 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${boardImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,31,0.6)", zIndex: 0 }} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          paddingBottom: 10,
          borderBottom: `1px solid ${palette.deepViolet}`,
          marginBottom: 16,
        }}
      >
        <Link to="/" style={{ color: palette.white }}>
          ← Lounge
        </Link>
        <PixelButton onClick={() => setShowTutorial(true)}>How to play</PixelButton>
        <ChatPanel />
        <span style={{ marginLeft: "auto", fontSize: 13 }}>
          {roleLabel}
          {view.phase === "live" && ` · ${formatClock(timeRemaining)} · Errors: ${view.errors}/3`}
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
        {view.phase === "briefing" && <BriefingScreen view={view} onBegin={() => dispatch({ type: "startLive" })} />}
        {view.phase === "live" && view.role === "bedside" && <BedsideScreen view={view} dispatch={dispatch} />}
        {view.phase === "live" && view.role === "protocol" && <ProtocolScreen view={view} dispatch={dispatch} />}
        {view.phase === "debrief" && <DebriefScreen view={view} />}
      </div>
    </main>
  );
}

function BriefingScreen({ view, onBegin }: { view: CodeRedRedactedState; onBegin: () => void }) {
  const [started, setStarted] = useState(false);
  return (
    <div style={{ textAlign: "center", marginTop: 24 }}>
      <h1 style={{ margin: "0 0 8px" }}>{view.scenario.title ?? "Code Red"}</h1>
      <p style={{ opacity: 0.85, maxWidth: 520, margin: "0 auto 20px" }}>{view.scenario.briefing}</p>
      <div
        style={{
          display: "inline-block",
          padding: "12px 20px",
          background: palette.violet,
          border: `3px solid ${palette.ink}`,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>You are</p>
        <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700 }}>{view.role === "bedside" ? "Bedside" : "Protocol"}</p>
      </div>
      <p style={{ fontSize: 13, opacity: 0.75, maxWidth: 480, margin: "0 auto 20px" }}>
        {view.role === "bedside"
          ? "You'll see the patient's vitals and apply orders. Your partner has the reference binder - talk it through."
          : "You've got the reference binder. Your partner's hands-on with the patient - talk them through what to do."}
      </p>
      <PixelButton
        disabled={started}
        onClick={() => {
          setStarted(true);
          onBegin();
        }}
      >
        {started ? "Starting..." : "Begin"}
      </PixelButton>
    </div>
  );
}

function RadioPanel({ lastRadioPhrase, onSend }: { lastRadioPhrase: CodeRedRedactedState["lastRadioPhrase"]; onSend: (id: string) => void }) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 13, opacity: 0.8, margin: "0 0 6px" }}>Radio (if voice drops)</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RADIO_PHRASES.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              SFX_RADIO_SEND();
              onSend(p.id);
            }}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${palette.deepViolet}`,
              background: "rgba(255,255,255,0.06)",
              color: palette.white,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {lastRadioPhrase && (
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.75, fontStyle: "italic" }}>📻 "{RADIO_PHRASE_LABEL[lastRadioPhrase.phraseId] ?? lastRadioPhrase.phraseId}"</p>
      )}
    </div>
  );
}

function BedsideScreen({ view, dispatch }: { view: CodeRedRedactedState; dispatch: (a: CodeRedAction) => void }) {
  const vitals = view.vitals;
  const findingsRevealed = view.findingsRevealed ?? [];
  const ordersApplied = view.ordersApplied ?? [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          padding: 16,
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${palette.deepViolet}`,
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        {vitals && (
          <>
            <Vital label="HR" value={`${Math.round(vitals.hr)} bpm`} />
            <Vital label="BP" value={`${Math.round(vitals.bpSystolic)}/${Math.round(vitals.bpDiastolic)}`} />
            <Vital label="SpO2" value={`${Math.round(vitals.spo2)}%`} />
            {vitals.bloodLossMl !== undefined && <Vital label="Blood loss" value={`${Math.round(vitals.bloodLossMl)} mL`} />}
          </>
        )}
      </div>

      <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Examine</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {view.scenario.examineFindings.map((f) =>
          findingsRevealed.includes(f.regionId) ? (
            <div
              key={f.regionId}
              style={{
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(143,227,176,0.12)",
                border: `1px solid ${palette.mint}`,
                maxWidth: 220,
              }}
            >
              {f.text}
            </div>
          ) : (
            <PixelButton key={f.regionId} style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => dispatch({ type: "examine", regionId: f.regionId })}>
              Examine: {f.regionId}
            </PixelButton>
          )
        )}
      </div>

      <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Orders</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {view.scenario.orderOptions.map((o) => {
          const applied = ordersApplied.includes(o.id);
          return (
            <PixelButton
              key={o.id}
              disabled={applied}
              style={{ fontSize: 12, padding: "6px 10px" }}
              onClick={() => dispatch({ type: "applyOrder", orderId: o.id })}
            >
              {o.label}
              {applied ? " ✓" : ""}
            </PixelButton>
          );
        })}
      </div>

      <RadioPanel lastRadioPhrase={view.lastRadioPhrase} onSend={(id) => dispatch({ type: "radioPhrase", phraseId: id })} />
    </div>
  );
}

function ProtocolScreen({ view, dispatch }: { view: CodeRedRedactedState; dispatch: (a: CodeRedAction) => void }) {
  const pinnedCards = view.pinnedCards ?? [];
  return (
    <div>
      <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{view.scenario.title ?? "Protocol Binder"}</h2>
      <p style={{ fontSize: 13, opacity: 0.8, margin: "0 0 16px" }}>{view.scenario.briefing}</p>

      <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Reference - tap to pin, then talk it through</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {view.scenario.orderOptions.map((o) => {
          const pinned = pinnedCards.includes(o.id);
          return (
            <button
              key={o.id}
              onClick={() => dispatch({ type: "pinCard", cardId: o.id })}
              style={{
                fontSize: 13,
                padding: "8px 12px",
                borderRadius: 8,
                border: `2px solid ${pinned ? palette.butter : palette.deepViolet}`,
                background: pinned ? "rgba(255,224,138,0.12)" : "rgba(255,255,255,0.04)",
                color: palette.white,
                cursor: "pointer",
              }}
            >
              {pinned ? "📌 " : ""}
              {o.label}
            </button>
          );
        })}
      </div>

      <RadioPanel lastRadioPhrase={view.lastRadioPhrase} onSend={(id) => dispatch({ type: "radioPhrase", phraseId: id })} />
    </div>
  );
}

function DebriefScreen({ view }: { view: CodeRedRedactedState }) {
  const debrief = view.debrief;
  if (!debrief) return null;
  const stars = debrief.stars ?? 0;

  return (
    <div style={{ marginTop: 16 }}>
      <h1 style={{ margin: "0 0 4px" }}>{OUTCOME_HEADLINE[debrief.outcome ?? ""] ?? "Scenario complete"}</h1>
      <p style={{ fontSize: 24, margin: "0 0 20px" }}>{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</p>

      <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>What happened</h2>
      <ol style={{ margin: "0 0 16px", paddingLeft: 20, fontSize: 13 }}>
        {debrief.correctSequence.map((orderId, i) => {
          const done = i < debrief.ordersApplied.length;
          return (
            <li key={orderId} style={{ color: done ? palette.mint : palette.coral, marginBottom: 4 }}>
              {orderLabel(view.scenario.orderOptions, orderId)} {done ? "✓" : "— missed"}
            </li>
          );
        })}
      </ol>

      {debrief.debriefNotes && (
        <div
          style={{
            padding: 14,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${palette.deepViolet}`,
            borderRadius: 8,
            fontSize: 13,
            opacity: 0.85,
          }}
        >
          {debrief.debriefNotes}
        </div>
      )}
    </div>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
