// A player character for a scene (currently: the Lounge), controllable
// three ways that all drive the same movement/state loop so they never
// fight each other: tap/click a point on the floor to walk there, hold
// arrow keys / WASD to walk directly, or sit/stand via Space OR a small
// always-visible, fixed-position button (bottom-center of the stage, not
// tracking the character - an earlier version floated above the
// character's own head and looked right standing but badly wrong
// sitting, since the sit pose only fills the bottom ~65% of the same
// tall canvas idle/walk use). The button isn't a redundant extra - it's
// the only sit/stand control that reliably works at all: Space depends
// on the page/window actually having keyboard focus (easy to lose with
// other browser tabs or UI open), and doesn't exist as a concept on a
// touch device, which this app explicitly needs to support. Tap the
// character itself for a one-off wave reaction (or to stand back up, if sitting).
//
// Sitting walks the character to `sitSpot` first if one's given (e.g. the
// sofa's actual seat cushion, well above the floor `bounds` covers) rather
// than sitting wherever they're currently standing - without it, the
// floor-height "sit" pose read as sitting on the floor in front of the
// sofa rather than on it, confirmed live before this existed.
//
// Every position in this component's public API - `homeLeft`/`homeTop`,
// `bounds`, click targets - is the character's FEET, not the sprite box's
// top-left corner. The sprite box is tall (roughly a quarter of the
// stage's height), so tracking the box corner directly meant a click
// landed the *box* there while the feet ended up visibly far below/south
// of where you actually clicked - `boxHeightPct` below converts the
// known box width (`widthPct`, a % of stage width) into its on-screen
// height as a % of stage height (the stage itself isn't square, see
// STAGE_ASPECT), and every render subtracts it back off so the feet - not
// the hairline - land on the position this component is tracking.
//
// Movement is a real per-frame position integration (requestAnimationFrame),
// not a CSS transition to a fixed destination - continuous keyboard input
// needs that (you can change direction mid-step), and unifying both input
// methods under one loop means pressing a key while mid-walk-to-a-tap just
// takes over immediately instead of the two fighting for control of the position.
//
// Deliberately local-only for now: this component has no idea about the
// other player. Cross-device sync (seeing your partner's character move
// in real time) is a separate layer on top of this - see TODO.md - built
// by broadcasting the same position this loop already computes and feeding
// it into another instance of this same component instead of live input.
import { useEffect, useReducer, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { WanderBox } from "./AnimatedCritter";
import { palette } from "../tokens";
import { getCachedRecolor, recolorSprite } from "../recolor";

export interface PlayableCharacterFrames {
  /** Looping idle/breathing pose. */
  idle: string[];
  /** Walk cycle facing right - mirrored via CSS for leftward movement (see this file's header on why that's safe for this art). */
  walkRight: string[];
  /** Short reaction played once on a self-tap while idle. Omit to disable the wave reaction. */
  wave?: string[];
  /** Sit-down transition, played forward to sit and in reverse to stand - the last frame holds as the seated idle pose. Omit to disable sitting. */
  sit?: string[];
  /** Single standing pose facing the camera (moving/idle toward the bottom of the stage). Omit to fall back to `idle` for that facing too - what every character had before these existed. */
  idleFront?: string;
  /** Single standing pose facing away from the camera (moving/idle toward the top of the stage). Omit to fall back to `idle`. */
  idleBack?: string;
  /** Walk cycle moving toward the camera (downward on screen). Omit to fall back to `walkRight` (unmirrored) for vertical movement, same as before these existed. */
  walkForward?: string[];
  /** Walk cycle moving away from the camera (upward on screen). Omit to fall back to `walkRight` (unmirrored). */
  walkBackward?: string[];
}

export interface PlayableCharacterProps {
  frames: PlayableCharacterFrames;
  /** Starting position, as feet-on-the-floor coordinates (see this file's header). */
  homeLeft: number;
  homeTop: number;
  /** Where the character's feet are allowed to go, by tap or by keyboard - keep this inside real open floor, same caveat as AnimatedCritter's wanderBox. Also feet-anchored. */
  bounds: WanderBox;
  /** Where "sit" actually sits them, e.g. the sofa seat cushion - NOT the floor region `bounds` covers, since a cushion sits well above the floor. The sit button walks them here first, then plays the sit-down transition. Omit to fall back to sitting wherever they're currently standing (floor height) instead - and, since there's no one specific spot to be "near" in that case, the button is always available regardless of position. */
  sitSpot?: { left: number; top: number };
  /** How close (in the same % units as `pos`/`sitSpot`) the character has to be to `sitSpot` before the sit button appears at all - ignored when `sitSpot` is omitted. Defaults to 20, loose enough to cover standing anywhere in front of the sofa without requiring a pixel-exact spot, tight enough that the button isn't just permanently on screen from across the room. */
  sitProximityPct?: number;
  widthPct?: number;
  /** height / width of this character's own sprite canvas - differs per character (see Lounge.tsx), object-fit:contain so it never distorts either way. */
  boxAspect?: number;
  /** Where the sit pose's actual seat-contact point (the hips) sits, as a fraction of the box height up from the sprite's bottom edge - 0 (the default) means the contact point IS the bottom edge, true for every other pose here and for a floor-anchored crouch sit (feet planted on the ground, which is also the contact point). A sofa-seated pose with the lower legs/feet dangling below the hips needs a nonzero value here, or the whole box gets anchored by the dangling feet instead of the hips and the character renders perched too high above the seat - measured directly off the sprite (the row where the pose's own hip crease sits), not guessed. */
  sitContactOffsetPct?: number;
  /** Where the top of the character's head sits while idle/standing, as a fraction of the box height down from the box's own top edge - used to float the sit button just above the head instead of at a fixed screen position. Defaults to 0.03, close to measured for every standing/idle/walk/wave frame tried so far (the idle breathing loop alone moves it a few px, not worth exposing per-frame). */
  headOffsetPct?: number;
  /** Same idea as `headOffsetPct` but for the sit pose specifically, which sits much further down in the same canvas than a standing pose does. Defaults to `headOffsetPct` (no special case) - needs to be set explicitly for any sit pose whose head isn't near the top of its canvas, same reasoning as `sitContactOffsetPct`. */
  sitHeadOffsetPct?: number;
  /** Which keys drive this instance - omit for the normal case (one character, one player, listens to both arrow keys and WASD). Set to "arrows" or "wasd" only when two PlayableCharacters are on screen at once and need to be driven independently (dev/testing only, see Lounge.tsx's `?dual=1`) - also disables this instance's Space sit/stand shortcut in that case, since Space has no "which character" to disambiguate between two instances; the always-visible button still works. */
  keys?: "arrows" | "wasd";
  /** Recolors the sprite's scrub-fabric pixels to this hex color at runtime (see ../recolor.ts) - the chosen Avatar Setup scrub color, or omit to render the plain gray frames as-shipped. Skip passing this for "classic gray" specifically: it's already the source art's own color, recoloring it to itself would just waste a canvas pass for no visible change. */
  scrubColorHex?: string;
  /** Called every time this character's own tracked position (feet, same coordinates as everywhere else in this file) changes - lets a parent rendering more than one PlayableCharacter at once (today: Lounge.tsx's `?dual=1` dev view) track where each one currently is, to feed into the OTHER instance's `getBlockingPosition`. Omit if nothing needs to know - the normal single-character case doesn't. A plain callback, not state: this fires from inside the per-frame movement loop, so wrapping it in `useState` upstream would mean a React re-render every single frame something moves. */
  onPositionChange?: (pos: { left: number; top: number }) => void;
  /** Called once per movement-loop tick to ask "is anything else currently occupying the floor near where I'm about to step" - return the other character's current position to block against it, or null/undefined for "nothing to block against" (the normal single-character case, or if the other character hasn't reported a position yet). A getter function rather than a plain position value for the same reason as `onPositionChange`: read fresh every tick via a ref, not a prop that would need to flow through React state and risk being a frame stale. */
  getBlockingPosition?: () => { left: number; top: number } | null | undefined;
  label?: string;
}

type CharState = "idle" | "walking" | "waving" | "sitting-down" | "sitting" | "standing-up";
type Dir = "up" | "down" | "left" | "right";

// The Lounge stage is a fixed 1672x941 aspect-ratio box (see .ward-lounge-stage
// in index.css) - needed to convert a box's %-of-width into %-of-height.
const STAGE_ASPECT = 1672 / 941;

const IDLE_FRAME_MS = 420;
const WALK_FRAME_MS = 120;
const WAVE_FRAME_MS = 170;
const SIT_FRAME_MS = 160;
const MOVE_PCT_PER_MS = 1 / 60; // walk speed - % of stage per ms, matches the previous tap-to-move pace
const ARRIVE_EPSILON_PCT = 0.3; // close enough to a tap target to call it "arrived"

const ARROW_KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
const WASD_KEY_TO_DIR: Record<string, Dir> = {
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};
// Every real usage today is one signed-in player controlling their own
// single on-screen character, so listening to both key sets at once (the
// default, undefined) has always been fine - there's only ever one
// character to drive. `keys` exists purely for having two
// PlayableCharacters on screen at once for local dev/testing (see
// Lounge.tsx's `?dual=1`) - without it, both would move together on
// every keypress, since by default each instance listens for both sets.
const KEY_TO_DIR: Record<string, Dir> = { ...ARROW_KEY_TO_DIR, ...WASD_KEY_TO_DIR };

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isTypingTarget(el: EventTarget | null): boolean {
  const tag = (el as HTMLElement | null)?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const SITTING_STATES: ReadonlySet<CharState> = new Set(["sitting-down", "sitting", "standing-up"]);

export function PlayableCharacter({
  frames,
  homeLeft,
  homeTop,
  bounds,
  sitSpot,
  sitProximityPct = 20,
  widthPct = 9,
  boxAspect = 1.5,
  sitContactOffsetPct = 0,
  headOffsetPct = 0.03,
  sitHeadOffsetPct,
  keys,
  scrubColorHex,
  onPositionChange,
  getBlockingPosition,
  label = "You",
}: PlayableCharacterProps) {
  const reduced = useRef(prefersReducedMotion());
  const boxHeightPct = widthPct * boxAspect * STAGE_ASPECT;

  const [state, setState] = useState<CharState>("idle");
  const [pos, setPos] = useState({ left: homeLeft, top: homeTop });
  // All four compass directions now, not just left/right - "up"/"down" pick
  // the new front/back-facing frame sets (see PlayableCharacterFrames) when
  // a character has them, falling back to the original walkRight/idle for
  // whichever character doesn't yet (Lakshmi, as of this writing).
  const [facing, setFacing] = useState<Dir>("right");
  const [idleFrame, setIdleFrame] = useState(0);
  const [walkFrame, setWalkFrame] = useState(0);
  const [waveFrame, setWaveFrame] = useState(0);
  const [sitFrame, setSitFrame] = useState(0);

  const posRef = useRef(pos);
  posRef.current = pos;
  const facingRef = useRef(facing);
  facingRef.current = facing;
  const stateRef = useRef(state);
  stateRef.current = state;
  // The movement loop below is a long-lived effect (deps: [bounds] only, by
  // design - see its own comment) so it can't just read `sitSpot` from the
  // render closure without risking a stale value; mirrored into a ref like
  // every other piece of state that loop needs, same reason as posRef etc.
  const sitSpotRef = useRef(sitSpot);
  sitSpotRef.current = sitSpot;
  const heldDirsRef = useRef<Set<Dir>>(new Set());
  const tapTargetRef = useRef<{ left: number; top: number } | null>(null);
  const pendingSitRef = useRef(false); // set while walking toward sitSpot - the movement loop checks this on arrival instead of always going idle
  // True while the current tapTarget is the floor point directly in front
  // of sitSpot, not sitSpot itself (see sitApproachPoint below) - on
  // arrival there, the movement loop steps straight up onto the seat
  // instead of continuing to walk.
  const sitApproachRef = useRef(false);
  // Both callback props mirrored into refs for the same reason as
  // everything else the long-lived movement loop effect reads - it only
  // restarts on `bounds` changing, so reading these straight from the
  // render closure would risk calling a stale (or, on the very first
  // render before a parent's own state settles, possibly different)
  // function instead of whatever the latest render actually passed.
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const getBlockingPositionRef = useRef(getBlockingPosition);
  getBlockingPositionRef.current = getBlockingPosition;

  // sitSpot is well above the floor `bounds` (a cushion, not the ground),
  // so walking straight there in one diagonal line - the direct distance
  // formula every other walk uses - visibly cuts across the sofa's own
  // front face partway up, reading as climbing/walking on top of the sofa
  // (caught live, with a screenshot of exactly that). Splitting the walk
  // into two legs fixes it: walk at floor height to the point directly
  // below the seat first, then step straight up only once already
  // standing right in front of it.
  const sitApproachPoint = sitSpot
    ? { left: clamp(sitSpot.left, bounds.left, bounds.left + bounds.width), top: bounds.top }
    : null;

  function standUp() {
    if (stateRef.current !== "sitting") return;
    stateRef.current = "standing-up";
    setState("standing-up");
  }

  function sitDown() {
    if (stateRef.current !== "idle" || !frames.sit || frames.sit.length === 0) return;
    heldDirsRef.current.clear();
    if (sitSpot && sitApproachPoint) {
      // Walk to the approach point first - the movement loop steps up onto
      // the seat and plays "sitting-down" once it actually arrives there
      // (see sitApproachRef/pendingSitRef below), same as any other walk.
      pendingSitRef.current = true;
      sitApproachRef.current = true;
      tapTargetRef.current = sitApproachPoint;
      stateRef.current = "walking";
      setState("walking");
    } else {
      tapTargetRef.current = null;
      stateRef.current = "sitting-down";
      setState("sitting-down");
    }
  }

  function toggleSit(e: MouseEvent) {
    e.stopPropagation();
    if (stateRef.current === "sitting") standUp();
    else sitDown();
  }

  // Reports the starting position once on mount, so another character
  // rendered alongside this one (see getBlockingPosition/onPositionChange
  // above) has something real to block against from the very first
  // frame, instead of only learning where this one is after it first
  // moves.
  useEffect(() => {
    onPositionChangeRef.current?.(posRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only, by design
  }, []);

  // Idle breathing loop.
  useEffect(() => {
    if (reduced.current || state !== "idle" || frames.idle.length <= 1) return;
    const id = setInterval(() => setIdleFrame((i) => (i + 1) % frames.idle.length), IDLE_FRAME_MS);
    return () => clearInterval(id);
  }, [state, frames.idle.length]);

  // Walk-cycle frame advance while actually walking.
  useEffect(() => {
    if (reduced.current || state !== "walking") return;
    const id = setInterval(() => setWalkFrame((i) => (i + 1) % frames.walkRight.length), WALK_FRAME_MS);
    return () => clearInterval(id);
  }, [state, frames.walkRight.length]);

  // Wave plays once, then falls back to idle on its own.
  useEffect(() => {
    if (state !== "waving" || !frames.wave || frames.wave.length === 0) return;
    setWaveFrame(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= frames.wave!.length) {
        clearInterval(id);
        setState("idle");
      } else {
        setWaveFrame(i);
      }
    }, WAVE_FRAME_MS);
    return () => clearInterval(id);
  }, [state, frames.wave]);

  // Sit-down plays the sit frames forward, holding the last as the seated
  // pose; standing-up plays the same frames in reverse. Same sheet, two directions.
  useEffect(() => {
    if (!frames.sit || frames.sit.length === 0) return;
    const sitFrames = frames.sit;
    if (state === "sitting-down") {
      let i = 0;
      setSitFrame(0);
      const id = setInterval(() => {
        i += 1;
        if (i >= sitFrames.length) {
          clearInterval(id);
          stateRef.current = "sitting";
          setState("sitting");
        } else {
          setSitFrame(i);
        }
      }, SIT_FRAME_MS);
      return () => clearInterval(id);
    }
    if (state === "standing-up") {
      let i = sitFrames.length - 1;
      setSitFrame(i);
      const id = setInterval(() => {
        i -= 1;
        if (i < 0) {
          clearInterval(id);
          // Step back down to the floor point right in front of the seat -
          // the same reason sitting down steps *up* there rather than
          // walking a direct diagonal line to sitSpot (see sitApproachPoint
          // above): rendering standing-but-still-at-cushion-height, even
          // for an instant, cuts across the sofa's own front face. They
          // end standing right there, facing the room, free to walk off
          // under normal control from that point - not auto-walked
          // anywhere further (if a floor tap already landed mid-reversal,
          // tapTargetRef is already set and the usual movement loop picks
          // it up on the very next tick, same as any other queued tap).
          const seat = sitSpotRef.current;
          if (seat) {
            const approach = { left: clamp(seat.left, bounds.left, bounds.left + bounds.width), top: bounds.top };
            posRef.current = approach;
            setPos(approach);
          }
          facingRef.current = "down";
          setFacing("down");
          stateRef.current = "idle";
          setState("idle");
        } else {
          setSitFrame(i);
        }
      }, SIT_FRAME_MS);
      return () => clearInterval(id);
    }
    return undefined;
  }, [state, frames.sit]);

  // Keyboard input - held movement keys only move the character while the
  // main movement loop below is running; this effect just tracks which
  // direction keys are currently down, plus Space as a sit/stand toggle.
  // preventDefault on recognized keys so arrow keys/space don't also
  // scroll the page (the Lounge's portrait-phone layout is horizontally
  // pannable, see index.css) or move focus.
  useEffect(() => {
    if (reduced.current) return;
    // Only when two instances are sharing the page for dev/testing (see
    // `keys` above) does this need to be restricted to one key set -
    // the normal single-character case still listens to both.
    const activeKeyMap = keys === "arrows" ? ARROW_KEY_TO_DIR : keys === "wasd" ? WASD_KEY_TO_DIR : KEY_TO_DIR;
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      if (e.key === " " || e.key === "Spacebar") {
        if (keys) return; // two characters on screen, Space can't tell them apart - use the button instead
        e.preventDefault();
        if (stateRef.current === "sitting") standUp();
        else sitDown();
        return;
      }

      const dir = activeKeyMap[e.key];
      if (!dir) return;
      e.preventDefault();
      if (stateRef.current === "sitting") standUp();
      pendingSitRef.current = false; // keyboard input always takes over from an in-progress walk-to-sit
      sitApproachRef.current = false;
      tapTargetRef.current = null; // ...and from any other in-progress tap-walk
      heldDirsRef.current.add(dir);
    }
    function onKeyUp(e: KeyboardEvent) {
      const dir = activeKeyMap[e.key];
      if (!dir) return;
      heldDirsRef.current.delete(dir);
    }
    function onBlur() {
      heldDirsRef.current.clear(); // alt-tabbing away shouldn't leave a key "stuck" held
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frames.sit and keys are both stable per mount (set once by the caller), reading them fresh here would re-attach listeners on every render for no reason
  }, []);

  // The one real movement loop - both held-key input and an in-flight tap
  // target are resolved here, every frame, so there's exactly one thing
  // ever setting `pos`.
  useEffect(() => {
    if (reduced.current) return;
    let raf = 0;
    let lastT: number | null = null;

    // Treats the other character as a solid circle, not a hard wall - a
    // proposed step that would land too close first tries sliding along
    // just one axis (keeping the other axis at the CURRENT position, not
    // the blocked proposal) before giving up and not moving at all, so
    // walking diagonally into them reads as brushing past/bumping to a
    // stop next to them rather than snapping dead the instant any part
    // of a diagonal path gets close.
    //
    // `COLLISION_DISTANCE_PCT` is this character's own widthPct scaled
    // down, not up - a first version used `widthPct * 1.1` on the
    // assumption the visible sprite roughly fills its own box, which
    // left a visibly oversized gap once actually tested (caught live,
    // with a screenshot showing the two standing a good half-character
    // apart). It doesn't: both characters' actual silhouettes measured
    // at only ~64-68% of their own box width (padding either side of
    // the art within the shared canvas, same reason `boxAspect` differs
    // per character - see Lounge.tsx). 0.75 approximates "sum of both
    // characters' silhouette radii" plus a small intentional gap, close
    // enough without needing to know the other one's exact size.
    const COLLISION_DISTANCE_PCT = widthPct * 0.75;
    function resolveCollision(current: { left: number; top: number }, proposed: { left: number; top: number }) {
      const blocker = getBlockingPositionRef.current?.();
      if (!blocker) return proposed;
      const clear = (p: { left: number; top: number }) => Math.hypot(p.left - blocker.left, p.top - blocker.top) >= COLLISION_DISTANCE_PCT;
      if (clear(proposed)) return proposed;
      const xOnly = {
        left: clamp(proposed.left, bounds.left, bounds.left + bounds.width),
        top: current.top,
      };
      if (clear(xOnly)) return xOnly;
      const yOnly = {
        left: current.left,
        top: clamp(proposed.top, bounds.top, bounds.top + bounds.height),
      };
      if (clear(yOnly)) return yOnly;
      return current; // boxed in on both axes - stay put rather than clip through
    }

    function tick(now: number) {
      const dt = lastT === null ? 0 : now - lastT;
      lastT = now;
      raf = requestAnimationFrame(tick);

      if (stateRef.current === "waving" || SITTING_STATES.has(stateRef.current)) return; // don't move mid-reaction/mid-sit

      const held = heldDirsRef.current;
      let dx = 0;
      let dy = 0;
      if (held.has("left")) dx -= 1;
      if (held.has("right")) dx += 1;
      if (held.has("up")) dy -= 1;
      if (held.has("down")) dy += 1;

      if (dx !== 0 || dy !== 0) {
        // Normalize so diagonal movement isn't faster than cardinal movement.
        const len = Math.hypot(dx, dy) || 1;
        const step = MOVE_PCT_PER_MS * dt;
        const proposed = {
          left: clamp(posRef.current.left + (dx / len) * step, bounds.left, bounds.left + bounds.width),
          top: clamp(posRef.current.top + (dy / len) * step, bounds.top, bounds.top + bounds.height),
        };
        const next = resolveCollision(posRef.current, proposed);
        // Facing follows whichever axis currently dominates the held input
        // (not just horizontal) - lets diagonal holds still pick a sensible
        // single-direction sprite, and flips cleanly if the dominant axis
        // changes mid-hold (e.g. releasing Up while still holding Right).
        const nextFacing: Dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        if (facingRef.current !== nextFacing) {
          facingRef.current = nextFacing;
          setFacing(nextFacing);
        }
        posRef.current = next;
        setPos(next);
        onPositionChangeRef.current?.(next);
        if (stateRef.current !== "walking") {
          stateRef.current = "walking";
          setState("walking");
        }
        return;
      }

      const target = tapTargetRef.current;
      if (target) {
        const tdx = target.left - posRef.current.left;
        const tdy = target.top - posRef.current.top;
        const distance = Math.hypot(tdx, tdy);
        if (distance <= ARRIVE_EPSILON_PCT) {
          // The final snap to the exact target is still routed through
          // the same collision check - without it, a tap target that
          // happens to land inside the other character's blocked zone
          // (e.g. tapping right where they're standing) would walk the
          // last fraction of a percent straight into them instead of
          // stopping just outside like every other step already does.
          const arrived = resolveCollision(posRef.current, target);
          tapTargetRef.current = null;
          posRef.current = arrived;
          setPos(arrived);
          onPositionChangeRef.current?.(arrived);
          if (sitApproachRef.current && sitSpotRef.current) {
            // Arrived at the floor point right in front of the seat - step
            // straight up onto the cushion (no walk-cycle for this, it'd
            // visibly cross the sofa's own front face) and play the
            // sit-down transition there instead of continuing to walk.
            sitApproachRef.current = false;
            const seat = sitSpotRef.current;
            posRef.current = seat;
            setPos(seat);
            onPositionChangeRef.current?.(seat);
            pendingSitRef.current = false;
            stateRef.current = "sitting-down";
            setState("sitting-down");
          } else if (pendingSitRef.current) {
            pendingSitRef.current = false;
            stateRef.current = "sitting-down";
            setState("sitting-down");
          } else {
            stateRef.current = "idle";
            setState("idle");
          }
          return;
        }
        const step = Math.min(distance, MOVE_PCT_PER_MS * dt);
        const proposed = { left: posRef.current.left + (tdx / distance) * step, top: posRef.current.top + (tdy / distance) * step };
        const next = resolveCollision(posRef.current, proposed);
        // Same dominant-axis facing rule as held-key movement, so a
        // diagonal tap target picks a sensible single-direction sprite too.
        const nextTapFacing: Dir = Math.abs(tdx) >= Math.abs(tdy) ? (tdx > 0 ? "right" : "left") : tdy > 0 ? "down" : "up";
        if (facingRef.current !== nextTapFacing) {
          facingRef.current = nextTapFacing;
          setFacing(nextTapFacing);
        }
        posRef.current = next;
        setPos(next);
        onPositionChangeRef.current?.(next);
        if (stateRef.current !== "walking") {
          stateRef.current = "walking";
          setState("walking");
        }
        return;
      }

      if (stateRef.current === "walking") {
        stateRef.current = "idle";
        setState("idle");
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bounds identity is the only real dependency; pos/facing/state are read via refs so the loop doesn't need to restart on every move
  }, [bounds]);

  function handleFloorClick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pctX = ((e.clientX - rect.left) / rect.width) * 100;
    const pctY = ((e.clientY - rect.top) / rect.height) * 100;
    const target = {
      left: bounds.left + (pctX / 100) * bounds.width,
      top: bounds.top + (pctY / 100) * bounds.height,
    };
    if (reduced.current) {
      setPos(target);
      return;
    }
    if (stateRef.current === "sitting") standUp();
    pendingSitRef.current = false; // a plain floor tap always overrides an in-progress walk-to-sit
    sitApproachRef.current = false;
    tapTargetRef.current = target; // queued regardless - the movement loop only consumes it once standing-up (if any) finishes
  }

  function handleSelfClick(e: MouseEvent) {
    e.stopPropagation(); // don't also let this bubble to the floor click-catcher and set a destination under its own feet
    if (stateRef.current === "sitting") {
      standUp();
      return;
    }
    if (state !== "idle" || !frames.wave || frames.wave.length === 0) return;
    heldDirsRef.current.clear();
    tapTargetRef.current = null;
    setState("waving");
  }

  // Vertical facing picks the front/back-facing sheets when a character
  // has them, falling back to the original walkRight/idle (what every
  // character used before these existed, and what Lakshmi still uses,
  // not having a front/back sheet generated yet). Left/right facing is
  // unaffected - always walkRight/idle, mirrored for left as before.
  const activeWalkFrames =
    facing === "down" && frames.walkForward?.length
      ? frames.walkForward
      : facing === "up" && frames.walkBackward?.length
        ? frames.walkBackward
        : frames.walkRight;
  const activeIdleFrames =
    facing === "down" && frames.idleFront
      ? [frames.idleFront]
      : facing === "up" && frames.idleBack
        ? [frames.idleBack]
        : frames.idle;

  const frameSrc =
    state === "walking"
      ? activeWalkFrames[walkFrame % activeWalkFrames.length]
      : state === "waving"
        ? frames.wave?.[waveFrame]
        : SITTING_STATES.has(state)
          ? frames.sit?.[sitFrame]
          : activeIdleFrames[idleFrame % activeIdleFrames.length];

  // Recolors the scrub fabric to scrubColorHex if given (see
  // ../recolor.ts) - every walk/idle/wave/sit frame is recolored
  // independently and cached there, so switching poses just picks up
  // whatever's already warm. Reads the cache synchronously first so an
  // already-recolored frame renders immediately with no flash of the
  // plain gray original; `rerenderTick` exists purely to re-render once
  // a genuinely new (frame, color) pair finishes its one-time async
  // canvas pass and lands in that cache (a plain module-level Map, so
  // React has no other way to know it changed).
  const [rerenderTick, forceRerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!frameSrc || !scrubColorHex) return;
    if (getCachedRecolor(frameSrc, scrubColorHex)) return;
    let cancelled = false;
    recolorSprite(frameSrc, scrubColorHex).then(() => {
      if (!cancelled) forceRerender();
    });
    return () => {
      cancelled = true;
    };
  }, [frameSrc, scrubColorHex]);
  // Pre-warms every frame this character has, not just whichever one is
  // currently on screen - without this, the first time someone actually
  // walks after picking a new color, each of the 8-9 walk frames only
  // starts its (synchronous, non-trivial) canvas pass the moment it
  // becomes the active frame, and the walk cycle advances faster than
  // that work can keep up with - confirmed live: ~2-3 real seconds of
  // still-gray walking before the cache catches up and it looks right
  // for the rest of the session. Firing every frame's recolor job here
  // instead, right when the color is known (mount, or a color change),
  // means that work happens up front while the character's just
  // standing there, not mid-walk where it's actually visible.
  useEffect(() => {
    if (!scrubColorHex) return;
    const allFrameSrcs = new Set<string>([
      ...frames.idle,
      ...frames.walkRight,
      ...(frames.wave ?? []),
      ...(frames.sit ?? []),
      ...(frames.walkForward ?? []),
      ...(frames.walkBackward ?? []),
      ...(frames.idleFront ? [frames.idleFront] : []),
      ...(frames.idleBack ? [frames.idleBack] : []),
    ]);
    let cancelled = false;
    for (const src of allFrameSrcs) {
      if (getCachedRecolor(src, scrubColorHex)) continue;
      recolorSprite(src, scrubColorHex).then(() => {
        if (!cancelled) forceRerender();
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frames' identity is stable per mount (built once in Lounge.tsx), only scrubColorHex actually needs to retrigger this
  }, [scrubColorHex]);
  void rerenderTick;
  const displaySrc = frameSrc && scrubColorHex ? (getCachedRecolor(frameSrc, scrubColorHex) ?? frameSrc) : frameSrc;

  // Every pose anchors by its own bottom edge touching `pos` (feet on the
  // floor, or - while sitting - the seat) EXCEPT a sit pose whose feet dangle
  // below the actual seat contact point (see sitContactOffsetPct above);
  // only SITTING_STATES ever apply that offset, so walking to the sofa still
  // anchors by the feet like every other walk, and only flips to the hip
  // anchor once the sit-down transition actually starts.
  const anchorOffsetPct = SITTING_STATES.has(state) ? boxHeightPct * (1 - sitContactOffsetPct) : boxHeightPct;
  const renderLeft = (reduced.current ? homeLeft : pos.left) - widthPct / 2;
  const renderTop = (reduced.current ? homeTop : pos.top) - anchorOffsetPct;
  // Where the character's own head actually is, in stage %, for the sit
  // button below - a straightforward `renderTop + fraction*boxHeightPct`,
  // using whichever fraction matches the pose actually on screen right now
  // (sitting's head sits much further down the same canvas than standing's
  // does - see sitHeadOffsetPct above). This is the fix for the exact bug
  // this file used to dodge by using a fixed screen position instead: once
  // the anchor math is right for *each* pose instead of assuming one
  // shared full-height offset, tracking the head is no harder than
  // tracking the feet already was.
  const headTopPct = renderTop + (SITTING_STATES.has(state) ? (sitHeadOffsetPct ?? headOffsetPct) : headOffsetPct) * boxHeightPct;

  // Y-sorted depth, not a fixed stacking value - whoever's feet are
  // further down the stage (closer to camera in this diorama) paints on
  // top, the standard trick 2D scenes with any depth to them use so two
  // characters stack correctly regardless of which one happens to mount
  // later in the DOM (only matters once more than one is ever on screen
  // at once - today that's just the `?dual=1` dev view, but it's exactly
  // the kind of thing worth getting right before cross-device sync makes
  // it a real, constant occurrence rather than a dev-only curiosity).
  // *10 for enough resolution that two close-but-different feet
  // positions don't round to the same tie; each instance only ever reads
  // its own position, no coordination with the other character needed.
  const depthZIndex = Math.round((reduced.current ? homeTop : pos.top) * 10);

  const charStyle: CSSProperties = {
    position: "absolute",
    left: `${renderLeft}%`,
    top: `${renderTop}%`,
    width: `${widthPct}%`,
    aspectRatio: `1 / ${boxAspect}`,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    zIndex: depthZIndex,
  };

  const imgStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    imageRendering: "pixelated",
    transform: facing === "left" ? "scaleX(-1)" : undefined,
  };

  return (
    <>
      <div
        onClick={handleFloorClick}
        aria-hidden
        style={{
          position: "absolute",
          left: `${bounds.left}%`,
          top: `${bounds.top}%`,
          width: `${bounds.width}%`,
          height: `${bounds.height}%`,
          cursor: "pointer",
        }}
      />
      <button type="button" aria-label={label} onClick={handleSelfClick} style={charStyle}>
        {displaySrc && <img src={displaySrc} alt="" style={imgStyle} />}
      </button>
      {/* Floats just above the character's own head (headTopPct above),
          tracking position same as the character itself - an earlier
          version used a fixed screen position instead, specifically
          because head-tracking looked right standing but badly wrong
          sitting: that version assumed one shared "near the top of the
          box" offset for every pose, which was correct for standing but
          put the button way above the actual head once sitting (the old
          sit pose only filled the bottom ~65% of the same tall canvas
          idle/walk use). Now that the anchor math accounts for each pose's
          own head position (headOffsetPct/sitHeadOffsetPct) instead of
          assuming they're all the same, tracking the head is safe again.

          Only shown once idle AND actually near sitSpot (or already
          sitting, or there's no specific sitSpot to be near) - otherwise
          it was on screen the entire time regardless of where in the room
          the character stood, reading as "sit" being available anywhere
          rather than something tied to the sofa specifically. */}
      {frames.sit &&
        frames.sit.length > 0 &&
        (state === "sitting" ||
          (state === "idle" &&
            (!sitSpot || Math.hypot(pos.left - sitSpot.left, pos.top - sitSpot.top) <= sitProximityPct))) && (
        <button
          type="button"
          aria-label={state === "sitting" ? `${label}: stand up` : `${label}: sit down`}
          onClick={toggleSit}
          style={{
            position: "absolute",
            left: `${reduced.current ? homeLeft : pos.left}%`,
            top: `${headTopPct}%`,
            transform: "translate(-50%, calc(-100% - 8px))",
            padding: "6px 16px",
            borderRadius: 999,
            background: "rgba(20,16,31,0.78)",
            border: `2px solid ${palette.ink}`,
            color: palette.white,
            fontSize: 13,
            cursor: "pointer",
            // Always above any character's own depth-sorted zIndex (see
            // depthZIndex above - 1000 comfortably exceeds the highest
            // realistic value, pos.top*10 near the stage's own bottom
            // edge), not depth-sorted itself: this button belongs to its
            // own character specifically and should never be hidden
            // behind the OTHER character just because they happen to be
            // standing further down the stage at that moment.
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <span aria-hidden>🪑</span>
          {state === "sitting" ? "Stand up" : "Sit down"}
        </button>
      )}
    </>
  );
}
