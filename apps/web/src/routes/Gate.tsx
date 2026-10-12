// S01 Staff Entrance gate. See masterdoc.md FR-01..03 and section 4.4.
// No typed passcode field - pick a character, tap Enter. See
// lib/characters.ts for the privacy tradeoff that comes with that: the
// login credentials are baked into the client bundle rather than kept
// secret, relying on the URL itself being unlisted (FR-01) for privacy.
//
// Flow: entrance video -> Gyna's intro dialogue -> character picker -> in.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DialogueScene, Logotype, PixelButton, palette } from "@ward-games/ui";
import { CHARACTERS, type CharacterLogin } from "../lib/characters";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { GATE_INTRO } from "./gate-intro";
import { EntranceSequence, hasSeenEntrance } from "./EntranceSequence";
import { supabase } from "../lib/supabase";

// TEMP (while iterating on the Gate flow itself): replay the entrance
// animation and intro dialogue on every visit instead of gating them to
// once per browser. Flip back to the real `hasSeenX()` checks before this
// is something Lakshmi actually uses daily - a login screen revisited for
// months shouldn't force a multi-second animation and a dialogue scene
// every single time.
const ALWAYS_REPLAY_ENTRANCE_FOR_DEV = true;

const INTRO_SEEN_KEY = "waiting-room:gate-intro-seen";

function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false; // storage blocked - just show it, no harm
  }
}

function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // ignore, per browser-storage guidance - never let this break the page
  }
}

function initialShowEntrance(): boolean {
  return ALWAYS_REPLAY_ENTRANCE_FOR_DEV || !hasSeenEntrance();
}

export function Gate() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CharacterLogin | null>(null);
  const [showEntrance, setShowEntrance] = useState(initialShowEntrance);
  // Separate from `showEntrance`: that only flips false ~450ms after the
  // video ends (once EntranceSequence's fade-out finishes), but the intro
  // dialogue needs to be mounted and ready *before* that fade starts, or
  // the fade reveals the bare Gate screen instead of the dialogue. Starts
  // true when the entrance video is being skipped entirely (already seen).
  const [videoEnded, setVideoEnded] = useState(() => !initialShowEntrance());
  const [showIntro, setShowIntro] = useState(() => ALWAYS_REPLAY_ENTRANCE_FOR_DEV || !hasSeenIntro());
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnter() {
    if (!selected || signingIn) return;
    setSigningIn(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: selected.email,
      password: selected.password,
    });
    if (authError) {
      setError("This ward is closed for cleaning. Try again in a moment.");
      setSigningIn(false);
    } else {
      navigate("/");
    }
  }

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: 24,
        // Same room plate the intro dialogue uses - carries the scene
        // through to the character picker instead of cutting to flat
        // palette.ink once the dialogue finishes. Scrim darkens it so the
        // logotype/picker text stay legible over the busy art.
        backgroundImage:
          "linear-gradient(rgba(20, 16, 31, 0.6), rgba(20, 16, 31, 0.88)), url(/entrance/intro-background.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {showEntrance && (
        <EntranceSequence onComplete={() => setShowEntrance(false)} onPlaybackEnd={() => setVideoEnded(true)} />
      )}
      {videoEnded && showIntro && (
        <DialogueScene
          lines={GATE_INTRO}
          portraits={GYNA_PORTRAITS}
          background="url(/entrance/intro-background.webp) center / cover no-repeat"
          portraitPosition={{ left: "70%", top: "37%", width: "20%", height: "26%" }}
          onComplete={() => {
            markIntroSeen();
            setShowIntro(false);
          }}
          onSkip={() => {
            markIntroSeen();
            setShowIntro(false);
          }}
        />
      )}

      <Logotype width="min(90vw, 560px)" />

      <div style={{ display: "grid", gap: 16, marginTop: 24, justifyItems: "center" }}>
        <h1 style={{ textAlign: "center", fontSize: 18, opacity: 0.8, margin: 0 }}>Who is entering?</h1>

        <div style={{ display: "flex", gap: 16 }}>
          {CHARACTERS.map((character) => {
            const isSelected = selected?.id === character.id;
            return (
              <button
                key={character.id}
                type="button"
                onClick={() => setSelected(character)}
                style={{
                  display: "grid",
                  justifyItems: "center",
                  gap: 6,
                  padding: "12px 20px",
                  background: isSelected ? palette.violet : "transparent",
                  border: `2px solid ${isSelected ? palette.white : palette.deepViolet}`,
                  borderRadius: 8,
                  color: palette.white,
                  cursor: "pointer",
                }}
              >
                <img
                  src={character.bust}
                  alt=""
                  style={{ height: 96, width: "auto", objectFit: "contain" }}
                />
                {character.label}
              </button>
            );
          })}
        </div>

        <PixelButton onClick={handleEnter} disabled={!selected || signingIn}>
          {signingIn ? "Entering..." : "Enter"}
        </PixelButton>
        {error && <p style={{ color: palette.coral, fontSize: 13, margin: 0 }}>{error}</p>}
      </div>
    </main>
  );
}
