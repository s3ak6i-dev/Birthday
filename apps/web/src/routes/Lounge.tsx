// S04 Staff Lounge hub. See masterdoc.md section 2.2/2.3 and FR-10..12.
// Background: art/export/lounge_dusk.png. Hotspot rects: lounge-hotspots.ts.
//
// Nav is corner icon buttons, not a bottom bar - keeps the scene
// full-bleed, closer to the Forest Blast/WHIZZ-style layouts discussed
// than a conventional app tab strip. Still satisfies FR-11's "always
// provides a plain, non-pixel-hunt way to navigate" - these are always
// visible, just not labeled text at the bottom.
//
// TODO (M1 onward, section 7.2 "Lounge shell"):
//  - top status-chip bar (online presence, both players' daily status,
//    shared streak - FR-12) once the rooms/profile data exists to back it
//  - day/night window variants swapped by real IST time (FR-HUB-5)
//  - garden, sticker shelf, trophy shelf as their own hotspots once those
//    systems exist (M3/M6)
//  - player sprites standing in the room (needs avatar art, M2/M3)
//  - Gyna (the owl mascot) perched on the pendant lamp - named, art not
//    generated yet, see TODO.md
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AmbientRoomLoop,
  AvatarIcon,
  DialogueScene,
  Hotspot,
  IconButton,
  Logotype,
  MIN_TOUCH_TARGET_PX,
  MusicNoteIcon,
  MusicNoteOffIcon,
  PixelButton,
  PlayableCharacter,
  SoundOffIcon,
  SoundOnIcon,
  WindowLight,
  isMusicMuted,
  isSfxMuted,
  palette,
  playClick,
  toggleMusicMuted,
  toggleSfxMuted,
} from "@ward-games/ui";
import { LOUNGE_HOTSPOTS } from "./lounge-hotspots";
import { CHARACTERS, characterForEmail, type CharacterLogin } from "../lib/characters";
import { supabase } from "../lib/supabase";
import { ChatPanel } from "../components/ChatPanel";
import { SCRUB_COLORS, loadAvatarConfig } from "../lib/avatar-options";
import { GYNA_PORTRAITS } from "../lib/gyna-portraits";
import { GATE_INTRO } from "./gate-intro";
import { GYNA_SQUAWK_KEY, GYNA_TYPE_KEY } from "../lib/sfx";
import { useLoungePresence } from "../lib/use-lounge-presence";

// The Gate screen (character picker + sign-in) and its entrance video are
// gone (explicit request: "remove the gate and the animation, but keep
// the owl instructions in place") - signing in now happens right here,
// inline, the first time anyone lands on "/" without a session, instead
// of a separate /gate route with its own video and themed background.
// Same credentials-in-the-client-bundle tradeoff Gate.tsx documented
// (see lib/characters.ts) - unchanged, just relocated. Gyna's intro
// dialogue (GATE_INTRO) survives the removal, per the second half of
// that request - still gated to once per browser via the exact same
// localStorage key Gate.tsx used, so anyone who already saw it under the
// old flow won't see it a second time.
const GYNA_INTRO_SEEN_KEY = "waiting-room:gate-intro-seen";

function hasSeenGynaIntro(): boolean {
  try {
    return localStorage.getItem(GYNA_INTRO_SEEN_KEY) === "1";
  } catch {
    return false; // storage blocked - just show it, no harm
  }
}

function markGynaIntroSeen() {
  try {
    localStorage.setItem(GYNA_INTRO_SEEN_KEY, "1");
  } catch {
    // ignore, per browser-storage guidance - never let this break the page
  }
}

// Real pixel-art icons (art/export/icons/), replacing the placeholder SVGs.
const navIcon = (src: string) => <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />;

// Lighting keyframes of the same locked composition (see TODO.md) - the
// generated set's own frames 1/9/12 are exactly /lounge_dusk.png itself
// (plain, unlit baseline), deliberately left OUT of this loop: looping
// through them read as the room visibly dimming/flattening twice per
// cycle, which isn't how real ambient light behaves (it drifts, it
// doesn't pulse back to "off"). Cycling only the warm frames keeps
// illumination "essentially stable" the whole time - the smallest step in
// the loop is the ~0.5%-to-~0.5% seam at the wrap (08 -> 02), never a
// return to the flat original.
const LOUNGE_LIGHTING_FRAMES = [
  "/lounge-animation/frame-02.png",
  "/lounge-animation/frame-03.png",
  "/lounge-animation/frame-04.png",
  "/lounge-animation/frame-05.png",
  "/lounge-animation/frame-06.png",
  "/lounge-animation/frame-07.png",
  "/lounge-animation/frame-08.png",
  "/lounge-animation/frame-10.png",
  "/lounge-animation/frame-11.png",
];

// Tap-to-move player character (see TODO.md). Frame filenames/counts match
// the sprite sheets sliced in apps/web/public/characters-walk/<id>/ -
// 4 idle, 8 walk-right (mirrored in code for leftward movement, see
// PlayableCharacter's header comment on why that's safe for this art),
// 4 wave, 3 sit. `boxAspect` is each character's own sprite canvas
// height/width - they differ (Lakshmi's hair makes her canvas noticeably
// wider), measured directly from the processed art, not guessed.
const CHARACTER_BOX_ASPECT: Record<CharacterLogin["id"], number> = {
  surya: 287 / 171,
  lakshmi: 285 / 222,
};

// How far up from the sit sprite's own bottom edge (as a fraction of the box
// height) each character's sit pose actually contacts the seat - see
// PlayableCharacter's `sitContactOffsetPct`. Surya's sofa-sit pose has the
// lower legs/feet dangling below the hips (measured directly off the
// sprite: hip/crotch row 170 of 287px canvas, (287-170)/287 ≈ 0.41 up from
// the bottom) - without this, PlayableCharacter anchors the box by those
// dangling feet instead of the hips and the character renders perched up
// on the backrest instead of seated in the cushion (caught live). Re-measure
// whenever this sprite's own scale changes (it moved once already, when the
// pose was upsized to read closer to idle's apparent size - the hip row
// shifts whenever the whole pose is rescaled, this isn't a fixed constant
// of the pose itself). Lakshmi's sit pose (regenerated along with her
// whole sheet - see characterWalkFrames below) is a cross-legged
// floor-sit, not a sofa-seated one, but still needs a nonzero offset for
// the same underlying reason as Surya's: it's not a crouch with feet
// planted directly under the hips, the crossed legs/feet extend well out
// in front, past the bottom of the sprite (hip/seat-crease row 210 of
// 285px canvas, (285-210)/285 ≈ 0.26 up from the bottom) - without this
// she rendered with her feet at cushion height and her torso floating
// above the cushion instead of seated in it (caught live, "she's not
// exactly sitting on the couch, she's elevated up").
const CHARACTER_SIT_CONTACT_OFFSET: Record<CharacterLogin["id"], number> = {
  surya: (287 - 170) / 287,
  lakshmi: (285 - 210) / 285,
};

// Where the top of each character's head sits while idle/standing vs while
// sitting, as a fraction of the box height down from the box's own top edge
// - see PlayableCharacter's `headOffsetPct`/`sitHeadOffsetPct`, used to
// float the sit button just above the head. Measured directly off each
// sprite (idle-1.png / sit-1.png's own top non-transparent row ÷ canvas
// height) rather than guessed - sitting puts the head much further down
// the same canvas than standing does, and the two characters' canvases
// aren't even the same size, so neither value carries over from one
// character or pose to the other.
const CHARACTER_HEAD_OFFSET: Record<CharacterLogin["id"], { idle: number; sit: number }> = {
  surya: { idle: 4 / 287, sit: 24 / 287 },
  lakshmi: { idle: 4 / 285, sit: 65 / 285 },
};

// Walk-forward/walk-backward and idle-front/idle-back are tracked
// separately, not as one "has front/back" flag - Lakshmi has a
// regenerated walk-forward/walk-backward sheet now (4+4 frames) but no
// dedicated standing idle-front/idle-back art, only Surya has both.
// PlayableCharacter falls back to walkRight/idle for whichever piece is
// missing, so this is safe to split per-character rather than all-or-
// nothing - Lakshmi now walks correctly toward/away from the camera, she
// just still flashes to the regular front idle if she stops while facing
// that way, same fallback as before this sheet existed.
const CHARACTERS_WITH_WALK_FRONT_BACK: ReadonlySet<CharacterLogin["id"]> = new Set(["surya", "lakshmi"]);
const CHARACTERS_WITH_IDLE_FRONT_BACK: ReadonlySet<CharacterLogin["id"]> = new Set(["surya"]);

// Frame counts per animation aren't actually identical between the two
// characters - Lakshmi's regenerated sheet genuinely has 9 walk-right
// poses where the sheet's own label said 8 (confirmed by counting the
// real art, not trusting the label text; PlayableCharacter doesn't care
// what the count is, it just cycles through whatever array it's given).
const WALK_RIGHT_FRAME_COUNT: Record<CharacterLogin["id"], number> = { surya: 8, lakshmi: 9 };

function computeCharacterWalkFrames(id: CharacterLogin["id"]) {
  const base = `/characters-walk/${id}`;
  const hasIdleFrontBack = CHARACTERS_WITH_IDLE_FRONT_BACK.has(id);
  const hasWalkFrontBack = CHARACTERS_WITH_WALK_FRONT_BACK.has(id);
  const walkRightCount = WALK_RIGHT_FRAME_COUNT[id];
  return {
    idle: [1, 2, 3, 4].map((i) => `${base}/idle-${i}.png`),
    walkRight: Array.from({ length: walkRightCount }, (_, i) => `${base}/walk-right-${i + 1}.png`),
    wave: [1, 2, 3, 4].map((i) => `${base}/wave-${i}.png`),
    sit: [1, 2, 3].map((i) => `${base}/sit-${i}.png`),
    idleFront: hasIdleFrontBack ? `${base}/idle-front.png` : undefined,
    idleBack: hasIdleFrontBack ? `${base}/idle-back.png` : undefined,
    walkForward: hasWalkFrontBack ? [1, 2, 3, 4].map((i) => `${base}/walk-forward-${i}.png`) : undefined,
    walkBackward: hasWalkFrontBack ? [1, 2, 3, 4].map((i) => `${base}/walk-backward-${i}.png`) : undefined,
  };
}

// Memoized by id (only ever "surya"/"lakshmi", so a plain Map is plenty) -
// this used to rebuild a fresh object with fresh arrays on every call,
// and sharedCharacterProps() below calls it inline in JSX on every Lounge
// render. PlayableCharacter's "play the wave once" effect depends on
// `frames.wave`'s *identity*, and the Lounge re-renders roughly every
// 600ms from the presence poll (use-lounge-presence.ts) - each of those
// renders handed it a new array reference, which restarted the wave
// animation from frame 0 before it ever reached the end. Confirmed live:
// reported as a "looping Hi animation" that never actually finishes
// waving. Caching per id keeps the reference stable across renders so the
// effect's dependency only ever actually changes when the character
// (never mid-session) does.
const walkFramesCache = new Map<CharacterLogin["id"], ReturnType<typeof computeCharacterWalkFrames>>();
function characterWalkFrames(id: CharacterLogin["id"]) {
  let frames = walkFramesCache.get(id);
  if (!frames) {
    frames = computeCharacterWalkFrames(id);
    walkFramesCache.set(id, frames);
  }
  return frames;
}

// Measured directly against lounge_dusk.png (1672x941) with a percent grid
// overlaid, not eyeballed - same discipline as the Ward Dog's own
// measurements (see that comment elsewhere in this file's history). These
// are FEET coordinates (see PlayableCharacter's header on why that
// matters): the shallow/top edge (64%) clears every piece of furniture's
// floor-contact line, including the office chair's wheel base - the
// deepest one measured, bottoming out around 64% - and the deep/bottom
// edge (92%) stays just short of the stage's own bottom edge.
const CHARACTER_WANDER_BOX = { left: 16, top: 64, width: 68, height: 28 };

// The sofa's actual seat-cushion surface (not the floor) - measured with a
// finer-grained grid specifically over the cushion after the first attempt
// at sitting (anchored to the floor, same as everywhere else the character
// stands) visibly read as sitting on the floor in front of the sofa, not
// on it. One spot per character, not a single shared one - this only
// matters once both players can ever be seen in the same Lounge at once
// (the cross-device sync work, not built yet), but there's no reason to
// ship two characters sharing one seat and have to revisit this later:
// Surya on the left cushion, Lakshmi on the right, both comfortably
// inside their own cushion (the couch's seam lines sit at roughly 38%
// and 46%) and far enough apart that their ~9%-wide sprite boxes can't
// visually overlap even standing exactly on top of these spots.
const CHARACTER_SIT_SPOT: Record<CharacterLogin["id"], { left: number; top: number }> = {
  surya: { left: 34, top: 53 },
  lakshmi: { left: 50, top: 53 },
};

// The Avatar Setup scrub color choice (localStorage, see avatar-options.ts)
// applied live to the Lounge sprite via PlayableCharacter's runtime
// recolor (packages/ui/src/recolor.ts) - previously that choice only ever
// affected Avatar Setup's own preview image, the actual walking/sitting
// character in the Lounge was always the plain gray regardless of what
// was picked. "classic-gray" means "the source art's own color," passed
// as undefined so PlayableCharacter skips recoloring entirely rather than
// doing a no-op canvas pass. Read fresh (not cached in state) each time
// sharedCharacterProps runs - cheap, and correct for the common path
// (pick a color in Avatar Setup, navigate to the Lounge, fresh mount);
// doesn't live-update if changed in another tab while already on this
// page, same already-accepted limitation as localStorage elsewhere here.
function scrubColorHexFor(id: CharacterLogin["id"]): string | undefined {
  const { scrubColorId } = loadAvatarConfig(id);
  if (scrubColorId === "classic-gray") return undefined;
  return SCRUB_COLORS.find((c) => c.id === scrubColorId)?.swatch;
}

// Every per-character prop PlayableCharacter needs, bundled once instead
// of repeated at each call site - there are two now (the normal
// signed-in-player render below, and the `?dual=1` dev/test render that
// shows both characters at once, see DualTestToggle's comment).
function sharedCharacterProps(id: CharacterLogin["id"]) {
  return {
    frames: characterWalkFrames(id),
    bounds: CHARACTER_WANDER_BOX,
    sitSpot: CHARACTER_SIT_SPOT[id],
    widthPct: 9,
    boxAspect: CHARACTER_BOX_ASPECT[id],
    sitContactOffsetPct: CHARACTER_SIT_CONTACT_OFFSET[id],
    headOffsetPct: CHARACTER_HEAD_OFFSET[id].idle,
    sitHeadOffsetPct: CHARACTER_HEAD_OFFSET[id].sit,
    scrubColorHex: scrubColorHexFor(id),
  };
}

export function Lounge() {
  const navigate = useNavigate();
  // Dev/testing only (asked for directly: "see both of them on the same
  // screen and control one with arrow keys and one with wasd"), not a
  // real feature - visiting /?dual=1 shows BOTH characters at once,
  // Surya on arrow keys and Lakshmi on WASD, regardless of who's actually
  // signed in. Exists so cross-device sync (seeing your partner's
  // character move live - not built yet) can be developed/tested against
  // two real controllable characters without needing two devices or two
  // browser profiles signed in at once. No UI entry point - URL only.
  const [searchParams] = useSearchParams();
  const dualTestMode = searchParams.get("dual") === "1";
  // Lets each dual-mode character block the other instead of walking
  // straight through them ("I want them to block each other if they're
  // in each other's way") - plain refs, not state: PlayableCharacter's
  // own movement loop reports into these every frame something moves
  // (onPositionChange) and reads the OTHER one back out every frame
  // before taking a step (getBlockingPosition), and neither side should
  // cause a Lounge re-render just because a character walked. Only
  // meaningful in dual mode - the normal single-character render has no
  // second character to block against.
  const suryaPosRef = useRef<{ left: number; top: number } | null>(null);
  const lakshmiPosRef = useRef<{ left: number; top: number } | null>(null);
  // The Avatar Setup nav button shows the signed-in player's own bust
  // portrait and name (same bust art AvatarSetup's own character picker
  // uses) instead of a generic person icon, once we know who that is -
  // resolved the same way WaitingRoom.tsx does (session email ->
  // characterForEmail). Falls back to the plain AvatarIcon while that
  // lookup is in flight or if nobody's signed in.
  const [profileCharacter, setProfileCharacter] = useState<CharacterLogin | null>(null);
  // Cross-device sync: "I don't see Surya on the screen and the movements
  // syncing" - PlayableCharacter only ever drove one, purely local
  // character before this; see use-lounge-presence.ts for the actual
  // polling wiring. Needs the REAL Supabase auth user id, not
  // `profileCharacter.id` ("surya"/"lakshmi") - the lounge_presence
  // table's user_id column is a real `uuid references auth.users`, and
  // its RLS policies compare against `auth.uid()` (the JWT's real id), so
  // the character slug doesn't satisfy either one (caught live: every
  // write/poll failed with "invalid input syntax for type uuid: 'surya'").
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const { partnerState, broadcastSelf } = useLoungePresence(selfUserId);
  const partnerCharacter = profileCharacter ? CHARACTERS.find((c) => c.id !== profileCharacter.id) : undefined;
  // Sign-in now lives here instead of a separate /gate screen (see the
  // header comment above) - "needs-signin" drives the inline picker
  // overlay below, same way Gate.tsx's own render used to gate on
  // `selected`/`signingIn`/`error`.
  const [authStatus, setAuthStatus] = useState<"checking" | "needs-signin" | "signed-in">("checking");
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  // Gyna's one-time intro dialogue, relocated from the Gate screen. Shown
  // first (ahead of the sign-in picker, when both are pending) since its
  // own closing line ("tell me who's here") leads straight into picking a
  // character - same order Gate.tsx played them in, minus the video.
  const [showGynaIntro, setShowGynaIntro] = useState(false);
  // A plain title splash, shown ahead of everything else below whenever
  // nobody's signed in yet - requested so the dialogue doesn't just start
  // playing the instant the page loads. Not gated to "once ever" like the
  // Gyna intro (no localStorage key) - it reappears on every fresh sign-in
  // pass, which also means it doubles as the one guaranteed user tap/click
  // before anything tries to play audio (autoplay policies need a real
  // gesture first). Plain component state, not derived from authStatus -
  // once dismissed it should stay dismissed for the rest of this page
  // load even though authStatus itself doesn't change.
  const [splashDismissed, setSplashDismissed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const character = characterForEmail(data.session?.user.email) ?? null;
      setProfileCharacter(character);
      setSelfUserId(data.session?.user.id ?? null);
      setAuthStatus(character ? "signed-in" : "needs-signin");
    });
    if (!hasSeenGynaIntro()) setShowGynaIntro(true);
  }, []);

  async function handleSignIn(character: CharacterLogin) {
    if (signingIn) return;
    setSigningIn(true);
    setSignInError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: character.email,
      password: character.password,
    });
    setSigningIn(false);
    if (authError) {
      setSignInError("This ward is closed for cleaning. Try again in a moment.");
      return;
    }
    setProfileCharacter(character);
    setSelfUserId(data.user.id);
    setAuthStatus("signed-in");
  }

  function handleGynaIntroDone() {
    markGynaIntroSeen();
    setShowGynaIntro(false);
  }

  // No Settings screen (S25) exists yet to put real sound toggles in, so
  // these are stand-ins here, same pattern as Avatar Setup not having a
  // nav link until it got one above - the engines' own mute states
  // (packages/ui/src/sfx.ts and music.ts) already persist to localStorage,
  // this just needs visible switches for them. Two separate toggles, not
  // one: masterdoc.md 2.7 treats SFX and music as independently
  // toggleable, and the music loop is the one sound here that starts on
  // its own without a click - worth a one-tap kill switch more than any
  // one-shot SFX would be. Move both into Settings once that screen exists.
  const [muted, setMuted] = useState(isSfxMuted);
  const [musicMuted, setMusicMuted] = useState(isMusicMuted);

  function handleToggleMute() {
    setMuted(toggleSfxMuted());
  }

  function handleToggleMusicMute() {
    setMusicMuted(toggleMusicMuted());
  }

  return (
    // .ward-lounge-viewport/.ward-lounge-stage (index.css) handle portrait
    // phones - see that comment for why (a plain crop would hide two of
    // the three live game hotspots). Landscape/desktop is unaffected,
    // same width-driven aspect box as before.
    <div className="ward-lounge-viewport">
      <main className="ward-lounge-stage">
        <AmbientRoomLoop frames={LOUNGE_LIGHTING_FRAMES} staticFrame="/lounge_dusk.png" />

        {/* Plain title splash, shown first whenever nobody's signed in yet -
            a beat before Gyna's dialogue starts talking, and the one
            guaranteed tap/click that happens before anything tries to play
            audio (see the state comment above on why it's not
            localStorage-gated like the dialogue below it). */}
        {authStatus === "needs-signin" && !splashDismissed ? (
          <div
            // Clicking the backdrop is a bonus convenience, not the real
            // control - the PixelButton below is the one focusable/
            // keyboard-reachable element, so this stays a plain div
            // (nesting role="button" around a real <button> is invalid
            // ARIA and double-fires on both Enter presses and clicks).
            onClick={() => setSplashDismissed(true)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              display: "grid",
              placeItems: "center",
              padding: 24,
              cursor: "pointer",
              backgroundImage:
                "linear-gradient(rgba(20, 16, 31, 0.6), rgba(20, 16, 31, 0.88)), url(/entrance/intro-background.webp)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div style={{ display: "grid", gap: 28, justifyItems: "center" }}>
              <Logotype width="min(90vw, 560px)" />
              <PixelButton onClick={() => setSplashDismissed(true)}>Enter</PixelButton>
            </div>
          </div>
        ) : /* Gyna's one-time intro dialogue, relocated from the old Gate
            screen - shown ahead of the sign-in picker below when both are
            pending (first-ever visit, nobody signed in yet), since its
            last line hands off straight into "who's here?". */
        showGynaIntro ? (
          <DialogueScene
            lines={GATE_INTRO}
            portraits={GYNA_PORTRAITS}
            squawkKey={GYNA_SQUAWK_KEY}
            typeKey={GYNA_TYPE_KEY}
            background="url(/entrance/intro-background.webp) center / cover no-repeat"
            portraitPosition={{ left: "70%", top: "37%", width: "20%", height: "26%" }}
            onComplete={handleGynaIntroDone}
            onSkip={handleGynaIntroDone}
          />
        ) : (
          authStatus === "needs-signin" && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 60,
                display: "grid",
                placeItems: "center",
                padding: 24,
                backgroundImage:
                  "linear-gradient(rgba(20, 16, 31, 0.6), rgba(20, 16, 31, 0.88)), url(/entrance/intro-background.webp)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <Logotype width="min(90vw, 560px)" />
              <div style={{ display: "grid", gap: 16, marginTop: 24, justifyItems: "center" }}>
                <h1 style={{ textAlign: "center", fontSize: 18, opacity: 0.8, margin: 0, color: palette.white }}>
                  Who&rsquo;s here?
                </h1>
                <div style={{ display: "flex", gap: 16 }}>
                  {CHARACTERS.map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => handleSignIn(character)}
                      disabled={signingIn}
                      style={{
                        display: "grid",
                        justifyItems: "center",
                        gap: 6,
                        padding: "12px 20px",
                        background: "transparent",
                        border: `2px solid ${palette.deepViolet}`,
                        borderRadius: 8,
                        color: palette.white,
                        cursor: signingIn ? "default" : "pointer",
                        opacity: signingIn ? 0.6 : 1,
                      }}
                    >
                      <img src={character.bust} alt="" style={{ height: 96, width: "auto", objectFit: "contain" }} />
                      {character.label}
                    </button>
                  ))}
                </div>
                {signInError && <p style={{ color: palette.coral, fontSize: 13, margin: 0 }}>{signInError}</p>}
              </div>
            </div>
          )
        )}

        {/* A gentle drift/shimmer layered over the baked-in light beams in
            lounge_dusk.png now that the art carries the main light shape
            itself - see masterdoc.md section 2.6 "small animated details".
            Pure CSS, pointer-events:none so it never blocks a hotspot. */}
        <WindowLight left={18} top={52} width={68} height={38} />

        {/* Tap-to-move player character - local only for now (see
            PlayableCharacter's header comment); cross-device sync is a
            separate follow-up. Rendered before the hotspots below so they
            still paint on top and keep first claim on their own click
            area - the character's invisible floor click-catcher only ever
            catches taps that land outside every hotspot. */}
        {dualTestMode ? (
          <>
            <PlayableCharacter
              {...sharedCharacterProps("surya")}
              homeLeft={40}
              homeTop={76}
              keys="arrows"
              label="Surya"
              onStateChange={(p) => {
                suryaPosRef.current = p;
              }}
              getBlockingPosition={() => lakshmiPosRef.current}
            />
            <PlayableCharacter
              {...sharedCharacterProps("lakshmi")}
              homeLeft={60}
              homeTop={76}
              keys="wasd"
              label="Lakshmi"
              onStateChange={(p) => {
                lakshmiPosRef.current = p;
              }}
              getBlockingPosition={() => suryaPosRef.current}
            />
          </>
        ) : (
          profileCharacter && (
            <>
              <PlayableCharacter
                {...sharedCharacterProps(profileCharacter.id)}
                homeLeft={50}
                homeTop={76}
                startSitting
                label={profileCharacter.label}
                onStateChange={(pos, facing, state) => broadcastSelf(pos, facing, state, scrubColorHexFor(profileCharacter.id))}
                getBlockingPosition={() => partnerState?.pos ?? null}
              />
              {/* Only rendered once the partner's actually broadcasting
                  from the Lounge right now (partnerState null otherwise -
                  including the first ~100ms before their first broadcast
                  lands, or if they're simply not here) - a stale last-known
                  position never lingers on screen after they leave.
                  scrubColorHex explicitly overrides what sharedCharacterProps
                  set (that reads scrubColorHexFor(partnerCharacter.id), i.e.
                  THIS device's own localStorage for the partner's account -
                  almost always unset, since Avatar Setup for their account
                  normally only ever runs on their own device) with the
                  color they're actually broadcasting, so their real choice
                  renders here instead of the plain gray default (caught
                  live: "the pink of lakshmi is not rendering on Surya's
                  screen"). */}
              {partnerCharacter && partnerState && (
                <PlayableCharacter
                  key={partnerCharacter.id}
                  {...sharedCharacterProps(partnerCharacter.id)}
                  homeLeft={partnerState.pos.left}
                  homeTop={partnerState.pos.top}
                  startSitting
                  label={partnerCharacter.label}
                  remote={partnerState}
                  scrubColorHex={partnerState.scrubColorHex}
                />
              )}
            </>
          )
        )}

        {LOUNGE_HOTSPOTS.map((hotspot) => (
          <Hotspot
            key={hotspot.id}
            left={hotspot.left}
            top={hotspot.top}
            width={hotspot.width}
            height={hotspot.height}
            label={hotspot.label}
            locked={hotspot.locked}
            outline={hotspot.outline}
            onActivate={() => {
              if (!hotspot.game) return;
              // Wordle is the one game with its own top-level route per
              // masterdoc.md S16/S17 (`/wordle`, not `/g/wordle`) - see the
              // same note in App.tsx.
              navigate(hotspot.game === "wordle" ? "/wordle" : `/g/${hotspot.game}`);
            }}
          />
        ))}

        {/* Nav, as corner icon clusters - Games/Album/Stats/Chat top-left,
            Avatar Setup/Settings top-right (grouped together as the two
            "about me" actions, rather than piling a fourth icon into the
            left content cluster). Avatar Setup existed on its own route
            since M2 but had no way in from anywhere in the UI until now -
            direct-URL only. Chat (ChatPanel, components/ChatPanel.tsx) is
            the one item here that isn't a route - it opens an in-place
            dropdown panel instead of navigating away, so it manages its
            own position:relative wrapper for that panel + the unread
            badge rather than being a plain IconButton like its neighbors. */}
        <div style={{ position: "absolute", left: "2%", top: "2.5%", display: "flex", gap: 8 }}>
          <IconButton label="Games" onClick={() => navigate("/games")}>
            {navIcon("/icons/games.png")}
          </IconButton>
          <IconButton label="Sticker Album" onClick={() => navigate("/album")}>
            {navIcon("/icons/album.png")}
          </IconButton>
          <IconButton label="Stats" onClick={() => navigate("/stats")}>
            {navIcon("/icons/stats.png")}
          </IconButton>
          <ChatPanel />
        </div>
        <div style={{ position: "absolute", right: "2%", top: "2.5%", display: "flex", alignItems: "center", gap: 8 }}>
          {/* Shows the player's own bust portrait and name (profileCharacter,
              resolved above) once known - a real "who am I" rather than a
              generic icon, same bust art + circular crop as AvatarSetup's
              own character picker. Not a plain IconButton since it needs
              room for the name label below the circle; AvatarIcon (plain
              inline SVG, packages/ui/src/components/icons.tsx) is only the
              fallback for the brief moment before the session lookup
              resolves, or if nobody's signed in. */}
          <button
            type="button"
            aria-label="Avatar Setup"
            title="Avatar Setup"
            onClick={() => {
              playClick();
              navigate("/avatar");
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: palette.white,
            }}
          >
            <span
              style={{
                width: MIN_TOUCH_TARGET_PX,
                height: MIN_TOUCH_TARGET_PX,
                borderRadius: "50%",
                background: "rgba(20,16,31,0.68)",
                border: `2px solid ${palette.ink}`,
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
              }}
            >
              {profileCharacter ? (
                <img
                  src={profileCharacter.bust}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 15%" }}
                />
              ) : (
                <AvatarIcon />
              )}
            </span>
            {profileCharacter && (
              <span style={{ fontSize: 10, lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.85)" }}>
                {profileCharacter.label}
              </span>
            )}
          </button>
          <IconButton label={muted ? "Unmute sound" : "Mute sound"} onClick={handleToggleMute}>
            {muted ? <SoundOffIcon /> : <SoundOnIcon />}
          </IconButton>
          <IconButton label={musicMuted ? "Unmute music" : "Mute music"} onClick={handleToggleMusicMute}>
            {musicMuted ? <MusicNoteOffIcon /> : <MusicNoteIcon />}
          </IconButton>
          <IconButton label="Settings" onClick={() => navigate("/settings")}>
            {navIcon("/icons/settings.png")}
          </IconButton>
        </div>
      </main>
    </div>
  );
}
