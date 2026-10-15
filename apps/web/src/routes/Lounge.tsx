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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AvatarIcon,
  Hotspot,
  IconButton,
  MIN_TOUCH_TARGET_PX,
  MusicNoteIcon,
  MusicNoteOffIcon,
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
import { characterForEmail, type CharacterLogin } from "../lib/characters";
import { supabase } from "../lib/supabase";

// Real pixel-art icons (art/export/icons/), replacing the placeholder SVGs.
const navIcon = (src: string) => <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />;

export function Lounge() {
  const navigate = useNavigate();
  // The Avatar Setup nav button shows the signed-in player's own bust
  // portrait and name (same bust art AvatarSetup's own character picker
  // uses) instead of a generic person icon, once we know who that is -
  // resolved the same way WaitingRoom.tsx does (session email ->
  // characterForEmail). Falls back to the plain AvatarIcon while that
  // lookup is in flight or if nobody's signed in.
  const [profileCharacter, setProfileCharacter] = useState<CharacterLogin | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setProfileCharacter(characterForEmail(data.session?.user.email) ?? null);
    });
  }, []);

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
        <img
          src="/lounge_dusk.png"
          alt=""
          style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
        />

        {/* A gentle drift/shimmer layered over the baked-in light beams in
            lounge_dusk.png now that the art carries the main light shape
            itself - see masterdoc.md section 2.6 "small animated details".
            Pure CSS, pointer-events:none so it never blocks a hotspot. */}
        <WindowLight left={18} top={52} width={68} height={38} />

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

        {/* Nav, as corner icon clusters - Games/Album/Stats top-left,
            Avatar Setup/Settings top-right (grouped together as the two
            "about me" actions, rather than piling a fourth icon into the
            left content cluster). Avatar Setup existed on its own route
            since M2 but had no way in from anywhere in the UI until now -
            direct-URL only. */}
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
