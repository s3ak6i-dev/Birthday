// Placeholder for scenes/tut_code_red.ink (masterdoc.md section 2.5 scene
// trigger table) - same approach as the other three tutorials: safe to
// write now, ahead of the real Ink pipeline (section 4.8, TODO.md M3).
//
// No `card` images yet - the prompts for these were given in this
// project's own conversation (roles/bedside/protocol/no-peeking/errors/
// scoring) but not generated/sent back yet. Add `card: \`${CARD}/x.png\``
// to each line the same way wordle-tutorial.ts/triage-dial-tutorial.ts do
// once those files exist under /code-red-tutorial-cards/ - don't wire a
// path to an image that isn't there yet (see those two files' own
// history for why: a broken-image icon is worse than no icon).
import type { DialogueLine } from "@ward-games/ui";

export const CODE_RED_TUTORIAL: DialogueLine[] = [
  {
    speaker: "Gyna",
    expr: "happy",
    text: "Code Red! One of you's Bedside, one's Protocol - randomly assigned, and it swaps if you play again.",
  },
  {
    speaker: "Gyna",
    text: "Bedside: you'll see live vitals drifting and can examine the patient. Tap a finding, then order treatment from the tray.",
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "Protocol: you've got the binder. Talk your partner through what to do - you're the one with the reference, not the hands.",
  },
  {
    speaker: "Gyna",
    expr: "smug",
    text: "Here's the catch: neither of you can see the other's screen. Everything happens by voice. No peeking.",
  },
  {
    speaker: "Gyna",
    text: "Wrong order? Costs you time, not an instant fail - but three serious slip-ups and it's a code called.",
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "Nail the sequence, beat the clock. 1 to 3 stars waiting on the other side. Go save someone.",
  },
];
