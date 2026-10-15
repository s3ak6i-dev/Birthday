// A critter (currently: the Ward Dog) that lives in a scene: sleeps,
// jumps down off its spot - an actual animated leap from home down to the
// floor, frame-cycled and position-animated together, not a frame swapped
// in place - then walks to a random point on the floor (facing the
// direction it's actually moving, using a real multi-frame walk cycle),
// rests there - sometimes sitting alert, sometimes panting, sometimes just
// lying down, sometimes turned away - and eventually heads home to sleep
// again. See masterdoc.md section 2.6 "small animated details".
//
// If `perch` is given (an elevated spot like an ottoman), it'll also
// sometimes hop up onto it to rest instead of just sitting on the floor,
// then hop back down later - the same leap animation as the sofa jump,
// just a shorter trip, and mirrored via CSS when the hop travels leftward
// since the jump art itself only faces right.
//
// Clicking it while idle (asleep, resting, or resting on the perch) plays
// a short bark reaction in place (`frames.bark`) before falling into
// whatever that click would have triggered anyway - wake up, wander off,
// hop down. Omit `frames.bark` and clicking just does that move directly,
// same as before this existed.
//
// Frame set (see TODO.md Art / art/export/ward-dog/) was sliced from full
// pose-and-cycle sheets, not independently generated frame-by-frame - see
// scripts/trace-hotspots.py's doc comment for why that matters (art
// consistency risk R3). `frames` can be partially omitted; any missing
// pose falls back to a placeholder silhouette, so this still renders
// something reasonable before all the art exists.
//
// Reduced motion (section 2.8): if the OS/browser prefers reduced motion,
// the critter just sits at its home position in its calmest pose and never
// moves - checked once on mount, matching how WindowLight handles it in CSS
// (this one needs JS since it drives position, not just an animation).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { palette } from "../tokens";

export interface CritterFrames {
  asleep: string;
  /** Brief stretch/wake-up pose, shown right before the jump-down. */
  stretch: string;
  /** The leap itself, in order - e.g. crouch, launch, peak-airborne, land. Position animates in sync with these (see landingLeft/Top). */
  jump: string[];
  /** Random rest poses used once it arrives somewhere and pauses - pick any subset. */
  restPoses: string[];
  /** Shown occasionally while resting, turned away from the camera, for variety. */
  back?: string;
  /** A full walk cycle facing right - as many frames as you have, in gait order. */
  walkRight: string[];
  /** A full walk cycle facing left - mirrors walkRight's gait order, drawn (not CSS-flipped) facing the other way. */
  walkLeft: string[];
  /** A short bark reaction, in order - e.g. perk up, mouth open, mouth
   * open again (a second bark), settle. Plays once on click, in place,
   * then falls back into whatever the critter would have done next. */
  bark?: string[];
}

export interface WanderBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AnimatedCritterProps {
  /** Any pose can be omitted - falls back to a placeholder silhouette. */
  frames?: Partial<CritterFrames>;
  /** Where it starts, and returns to sleep, in % of the stage - e.g. the sofa cushion. */
  homeLeft: number;
  homeTop: number;
  /** Where the jump-down lands - "the base of the sofa." Defaults to straight down from home, at the wander box's top edge, if not given. */
  landingLeft?: number;
  landingTop?: number;
  /** The % area it's allowed to wander within once it's landed and awake. Must be genuinely open floor - this isn't checked against any art, it's on whoever places it (see Lounge.tsx for how this one was actually measured against the background). */
  wanderBox: WanderBox;
  /** An elevated spot it can hop up onto to rest - e.g. an ottoman - and later hop back down from. Optional: omit it and the critter just rests on the floor like before. */
  perch?: { left: number; top: number };
  /** Width as a % of the stage, so it scales with the art instead of staying a fixed pixel size at every viewport width. */
  widthPct?: number;
  boxAspect?: number;
  onTap?: () => void;
  label?: string;
}

type CritterState = "asleep" | "stretching" | "jumping" | "walking" | "resting" | "restingOnPerch" | "barking";

const JUMP_FRAME_MS = 150;
const WALK_FRAME_MS = 140;
const BARK_FRAME_MS = 190;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function PlaceholderSilhouette({ pose }: { pose: "lying" | "upright" }) {
  const squashed = pose === "lying";
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 44" aria-hidden="true">
      <ellipse
        cx={32}
        cy={squashed ? 32 : 26}
        rx={26}
        ry={squashed ? 11 : 16}
        fill={palette.amethyst}
        stroke={palette.ink}
        strokeWidth={3}
      />
      {!squashed && (
        <>
          <path d="M14 14 L20 2 L24 16 Z" fill={palette.amethyst} stroke={palette.ink} strokeWidth={3} />
          <path d="M50 14 L44 2 L40 16 Z" fill={palette.amethyst} stroke={palette.ink} strokeWidth={3} />
        </>
      )}
      <circle cx={squashed ? 50 : 46} cy={squashed ? 30 : 24} r={3} fill={palette.ink} />
    </svg>
  );
}

export function AnimatedCritter({
  frames,
  homeLeft,
  homeTop,
  landingLeft,
  landingTop,
  wanderBox,
  perch,
  widthPct = 7,
  boxAspect = 0.8,
  onTap,
  label = "Ward Dog",
}: AnimatedCritterProps) {
  const reduced = useRef(prefersReducedMotion());
  const [state, setState] = useState<CritterState>("asleep");
  const [restPoseSrc, setRestPoseSrc] = useState<string | undefined>(undefined);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [pos, setPos] = useState({ left: homeLeft, top: homeTop });
  const [moveMs, setMoveMs] = useState(1000); // must match how long the current position transition actually takes - see walkTo()/jumpDown()
  const [walkFrameIndex, setWalkFrameIndex] = useState(0);
  const [jumpFrameIndex, setJumpFrameIndex] = useState(0);
  const [barkFrameIndex, setBarkFrameIndex] = useState(0);
  // The jump art (jump-5..8) only faces right - CSS-mirrored when a hop's
  // net horizontal travel is leftward, the same trick walk-left/walk-right
  // would otherwise need real separate art for (see the jumping branch of
  // the style/transform below).
  const [jumpFacing, setJumpFacing] = useState<"left" | "right">("right");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks the latest position for the distance/direction calc without
  // forcing the scheduling effect to re-run on every move (it intentionally
  // only depends on home/wanderBox identity - see the eslint-disable below).
  const posRef = useRef(pos);
  posRef.current = pos;
  // Lets the click handler below jump straight into the same wake-up/
  // wander/hop-down sequence the idle timer would eventually trigger on
  // its own, without duplicating that sequence - filled in by the effect
  // each time it (re)runs, read by handleClick via the ref so it's never stale.
  const triggerRef = useRef<{ wakeUp: () => void; startWandering: () => void; hopDownFromPerch: () => void }>({
    wakeUp: () => {},
    startWandering: () => {},
    hopDownFromPerch: () => {},
  });

  useEffect(() => {
    if (reduced.current) return; // stays asleep at home forever, per reduced-motion rule above

    function schedule(next: () => void, ms: number) {
      timerRef.current = setTimeout(next, ms);
    }

    function walkTo(target: { left: number; top: number }, onArrive: () => void) {
      const dx = target.left - posRef.current.left;
      const distance = Math.hypot(dx, target.top - posRef.current.top);
      const ms = Math.max(1800, Math.min(7000, distance * 500));
      setFacing(dx >= 0 ? "right" : "left");
      setState("walking");
      setMoveMs(ms);
      setPos(target); // the CSS transition (driven by moveMs below) takes `ms` to actually get there
      schedule(onArrive, ms);
    }

    function goToSleep() {
      setState("asleep");
      setMoveMs(0);
      setPos({ left: homeLeft, top: homeTop });
      schedule(wakeUp, randomBetween(15000, 30000));
    }

    function wakeUp() {
      setState("stretching");
      schedule(jumpDown, 900);
    }

    // Shared by every vertical hop (the initial sofa leap, and hopping up
    // onto / down off the perch) - same 4-frame jump cycle either way,
    // only the start/end position differ. Faces the hop the way it's
    // actually traveling (mirrored in the render below when leftward),
    // since the art itself only has a rightward leap.
    function hopTo(target: { left: number; top: number }, onArrive: () => void) {
      const dx = target.left - posRef.current.left;
      const frameCount = frames?.jump?.length || 1;
      const ms = frameCount * JUMP_FRAME_MS;
      setJumpFacing(dx < 0 ? "left" : "right");
      setState("jumping");
      setJumpFrameIndex(0);
      setMoveMs(ms);
      setPos(target); // the leap's position animation and its frame-cycle run for the same duration, together
      schedule(onArrive, ms);
    }

    function jumpDown() {
      const land = { left: landingLeft ?? homeLeft, top: landingTop ?? wanderBox.top };
      hopTo(land, startWandering);
    }

    function randomSpot() {
      return {
        left: randomBetween(wanderBox.left, wanderBox.left + wanderBox.width),
        top: randomBetween(wanderBox.top, wanderBox.top + wanderBox.height),
      };
    }

    function startWandering() {
      walkTo(randomSpot(), pauseAWhile);
    }

    function pauseAWhile() {
      setRestPoseSrc(undefined); // re-rolled in the effect below from frames.restPoses/back/asleep
      setState("resting");
      const roll = Math.random();
      if (roll < 0.3) {
        schedule(walkHome, randomBetween(3500, 9000));
      } else if (perch && roll < 0.55) {
        // ~25% of pauses: hop up onto the perch instead of just sitting on
        // the floor - real elevated rest spot, not another floor pose.
        schedule(hopUpToPerch, randomBetween(2000, 5000));
      } else {
        schedule(startWandering, randomBetween(3500, 9000));
      }
    }

    function hopUpToPerch() {
      if (!perch) return; // can't happen (only scheduled when perch is set), but keeps TS happy
      hopTo(perch, restOnPerch);
    }

    function restOnPerch() {
      setRestPoseSrc(undefined);
      setState("restingOnPerch");
      schedule(hopDownFromPerch, randomBetween(3000, 6000));
    }

    function hopDownFromPerch() {
      // Land just beside the perch, not anywhere in wanderBox - hopping
      // down should read as "off the ottoman onto the floor next to it,"
      // not a teleport-looking leap clear across the room.
      const left = Math.min(
        wanderBox.left + wanderBox.width,
        Math.max(wanderBox.left, perch!.left + randomBetween(-4, 4))
      );
      hopTo({ left, top: wanderBox.top }, startWandering);
    }

    function walkHome() {
      walkTo({ left: homeLeft, top: homeTop }, goToSleep);
    }

    triggerRef.current = { wakeUp, startWandering, hopDownFromPerch };

    schedule(wakeUp, randomBetween(6000, 15000)); // first wake-up after mount

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs on home/landing/wander-box/perch identity, not every pos/state change
  }, [homeLeft, homeTop, landingLeft, landingTop, wanderBox, perch]);

  // Advance through the walk cycle while walking, or the leap sequence
  // while jumping - direction-matched for walking, in authored order for jumping.
  useEffect(() => {
    if (reduced.current) return;
    if (state === "walking") {
      const cycleLength = (facing === "right" ? frames?.walkRight : frames?.walkLeft)?.length || 2;
      tickRef.current = setInterval(() => setWalkFrameIndex((i) => (i + 1) % cycleLength), WALK_FRAME_MS);
    } else if (state === "jumping") {
      const cycleLength = frames?.jump?.length || 1;
      tickRef.current = setInterval(
        () => setJumpFrameIndex((i) => Math.min(i + 1, cycleLength - 1)),
        JUMP_FRAME_MS
      );
    } else if (state === "barking") {
      const cycleLength = frames?.bark?.length || 1;
      tickRef.current = setInterval(
        () => setBarkFrameIndex((i) => Math.min(i + 1, cycleLength - 1)),
        BARK_FRAME_MS
      );
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cycle lengths only need to be read when state/facing change, not watched themselves
  }, [state, facing]);

  // Pick a random rest pose once per arrival (resting is "sticky" for the
  // whole pause, not reshuffled every render) - same pose pool whether
  // it's resting on the floor or up on the perch, a sit/lie-down pose
  // reads fine either way without needing perch-specific art.
  useEffect(() => {
    if (state !== "resting" && state !== "restingOnPerch") return;
    const roll = Math.random();
    if (roll < 0.3 && frames?.asleep) {
      setRestPoseSrc(frames.asleep); // "maybe lying down again" even away from home
    } else if (roll < 0.45 && frames?.back) {
      setRestPoseSrc(frames.back); // turned away, for variety
    } else {
      setRestPoseSrc(pick(frames?.restPoses ?? []) ?? frames?.restPoses?.[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately only re-rolls when entering "resting", not on every frames-prop identity change
  }, [state]);

  // Clicking the dog plays a quick bark reaction in place - if it's
  // currently idle (asleep, resting on the floor, or resting on the
  // perch), not if it's already mid-animation (stretching, jumping,
  // walking) where swapping to a stationary bark pose mid-leap or mid-
  // stride would read as broken rather than reactive; the caller's own
  // onTap sound still plays regardless of state, this is just the visual
  // half. Once the bark cycle finishes, it falls straight into whatever
  // move a plain click used to trigger immediately (wake + leap down from
  // asleep, wander off from resting, hop down from the perch) - the bark
  // is a reaction layered in front of that, not a replacement for it. No
  // bark art registered for this critter just skips straight to that move,
  // same as before this existed. Respects reduced-motion like every other
  // movement here (sound-only feedback for those users, no pose change).
  function handleClick() {
    onTap?.();
    if (reduced.current) return;
    if (state !== "asleep" && state !== "resting" && state !== "restingOnPerch") return;

    const resume =
      state === "asleep"
        ? triggerRef.current.wakeUp
        : state === "resting"
          ? triggerRef.current.startWandering
          : triggerRef.current.hopDownFromPerch;

    if (timerRef.current) clearTimeout(timerRef.current);

    const barkFrameCount = frames?.bark?.length ?? 0;
    if (barkFrameCount === 0) {
      resume();
      return;
    }
    setBarkFrameIndex(0);
    setState("barking");
    timerRef.current = setTimeout(resume, barkFrameCount * BARK_FRAME_MS);
  }

  const effectiveState = reduced.current ? "asleep" : state;
  const resting = effectiveState === "resting" || effectiveState === "restingOnPerch";
  const lying = effectiveState === "asleep" || (resting && restPoseSrc === frames?.asleep);
  const isMoving = effectiveState === "walking" || effectiveState === "jumping";

  const frameSrc: string | undefined =
    effectiveState === "asleep"
      ? frames?.asleep
      : effectiveState === "stretching"
        ? frames?.stretch
        : effectiveState === "jumping"
          ? frames?.jump?.[jumpFrameIndex]
          : effectiveState === "barking"
            ? frames?.bark?.[barkFrameIndex]
            : resting
              ? restPoseSrc
              : (facing === "right" ? frames?.walkRight : frames?.walkLeft)?.[walkFrameIndex];

  const style: CSSProperties = {
    position: "absolute",
    left: `${reduced.current ? homeLeft : pos.left}%`,
    top: `${reduced.current ? homeTop : pos.top}%`,
    width: `${widthPct}%`,
    aspectRatio: `1 / ${boxAspect}`,
    transition: isMoving
      ? `left ${moveMs}ms linear, top ${moveMs}ms ${effectiveState === "jumping" ? "ease-out" : "linear"}`
      : "left 0.6s ease",
    // Always clickable now (wakes/sends it wandering even with no onTap
    // passed in), so the cursor should say so regardless of that prop.
    cursor: "pointer",
  };

  // The jump art only has a rightward leap - mirror it for a leftward hop
  // instead of needing a second set of jump frames, same visual effect a
  // real left-facing jump sprite would give.
  const imgStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    // The frame art is small, nearest-neighbour-scaled pixel art (see
    // art/export/ward-dog/) - let the browser upscale it the same way
    // instead of smoothing/blurring it when the stage is wider than the
    // source frame.
    imageRendering: "pixelated",
    transform: effectiveState === "jumping" && jumpFacing === "left" ? "scaleX(-1)" : undefined,
  };

  return (
    <button
      type="button"
      aria-label={label}
      onClick={handleClick}
      style={{ ...style, background: "none", border: "none", padding: 0 }}
    >
      {frameSrc ? (
        <img src={frameSrc} alt="" style={imgStyle} />
      ) : (
        <PlaceholderSilhouette pose={lying ? "lying" : "upright"} />
      )}
    </button>
  );
}
