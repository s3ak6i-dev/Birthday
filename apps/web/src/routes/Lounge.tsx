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
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedCritter, Hotspot, IconButton, WindowLight } from "@ward-games/ui";
import { LOUNGE_HOTSPOTS } from "./lounge-hotspots";
import { unlockSticker } from "../lib/progress";
import { supabase } from "../lib/supabase";

// "Dog Whisperer" (sticker 13, packages/shared/src/stickers.ts) - tap the
// Ward Dog 10 times. Lifetime count, not per-visit, so it survives a
// refresh; not tied to any one game or room, just a browser-local tally
// until it fires once.
const DOG_TAP_COUNT_KEY = "ward-games:dog-tap-count";
const DOG_TAP_STICKER_ID = 13;

// Real pixel-art icons (art/export/icons/), replacing the placeholder SVGs.
const navIcon = (src: string) => <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />;

export function Lounge() {
  const navigate = useNavigate();
  const alreadyUnlockedRef = useRef(false);

  function handleDogTap() {
    if (alreadyUnlockedRef.current) return;
    let count = 0;
    try {
      count = Number(localStorage.getItem(DOG_TAP_COUNT_KEY) ?? "0") + 1;
      localStorage.setItem(DOG_TAP_COUNT_KEY, String(count));
    } catch {
      return; // storage blocked - skip counting rather than unlock on every tap
    }
    if (count < 10) return;
    alreadyUnlockedRef.current = true; // don't re-fire the lookup every tap past 10
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (userId) unlockSticker(userId, DOG_TAP_STICKER_ID).catch(() => {});
    });
  }

  return (
    <main style={{ position: "relative", width: "100%", aspectRatio: "1672 / 941" }}>
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

      {/* Ward Dog - full pose-and-cycle sheet, sliced into frames (see
          art/export/ward-dog/). Home position matches where the cat used
          to sit on the sofa; widthPct scales with the art instead of
          staying a fixed pixel size at every viewport width.

          Every coordinate below was measured directly against
          lounge_dusk.png (1672x941) with a percent grid overlaid, not
          eyeballed - see TODO.md for the measurements and for a second
          correction made after the first pass: `left`/`top` position the
          sprite box's TOP-LEFT corner, not its feet, and at widthPct=7 /
          boxAspect=0.8 that box is ~10% of the stage tall - so every
          target below is the *measured contact surface's y minus ~10*,
          not the surface's y directly (verified by screenshotting the
          actual render, not just trusting the arithmetic - the first
          pass put the dog standing in front of the ottoman instead of on
          it). wanderBox stays below every piece of furniture's floor
          contact line (deepest one measured, the office chair's wheel
          base, bottoms out around 64%); perch targets the ottoman's own
          top surface (measured ~52-53%) in front of the sofa. */}
      <AnimatedCritter
        homeLeft={40}
        homeTop={47}
        landingLeft={40}
        landingTop={53}
        wanderBox={{ left: 14, top: 57, width: 70, height: 25 }}
        perch={{ left: 50, top: 43 }}
        widthPct={7}
        onTap={handleDogTap}
        frames={{
          asleep: "/ward-dog/asleep.png",
          stretch: "/ward-dog/stretch.png",
          // Crouch -> launch -> peak airborne -> land - position animates from
          // the sofa down to the floor in sync with this sequence (AnimatedCritter's jumpDown()).
          jump: ["/ward-dog/jump-5.png", "/ward-dog/jump-6.png", "/ward-dog/jump-7.png", "/ward-dog/jump-8.png"],
          back: "/ward-dog/back.png",
          restPoses: ["/ward-dog/sit-relaxed.png", "/ward-dog/sit-alert.png", "/ward-dog/sit-pant.png"],
          walkRight: [
            "/ward-dog/walk-right-1.png",
            "/ward-dog/walk-right-2.png",
            "/ward-dog/walk-right-3.png",
            "/ward-dog/walk-right-4.png",
            "/ward-dog/walk-right-5.png",
            "/ward-dog/walk-right-6.png",
          ],
          walkLeft: [
            "/ward-dog/walk-left-1.png",
            "/ward-dog/walk-left-2.png",
            "/ward-dog/walk-left-3.png",
            "/ward-dog/walk-left-4.png",
            "/ward-dog/walk-left-5.png",
            "/ward-dog/walk-left-6.png",
          ],
        }}
      />

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

      {/* Nav, as corner icon clusters - Games/Album/Stats top-left, Settings top-right. */}
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
      <div style={{ position: "absolute", right: "2%", top: "2.5%" }}>
        <IconButton label="Settings" onClick={() => navigate("/settings")}>
          {navIcon("/icons/settings.png")}
        </IconButton>
      </div>
    </main>
  );
}
