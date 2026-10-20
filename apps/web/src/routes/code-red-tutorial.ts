// Placeholder for scenes/tut_code_red.ink (masterdoc.md section 2.5 scene
// trigger table) - same approach as the other three tutorials: safe to
// write now, ahead of the real Ink pipeline (section 4.8, TODO.md M3).
//
// Each line's `card` is a small flashcard-style illustration beside Gyna,
// same pattern as the other three tutorials.
import type { DialogueLine } from "@ward-games/ui";

const CARD = "/code-red-tutorial-cards";

export const CODE_RED_TUTORIAL: DialogueLine[] = [
  {
    speaker: "Gyna",
    expr: "happy",
    text: "Code Red! One of you's Bedside, one's Protocol - randomly assigned, and it swaps if you play again.",
    card: `${CARD}/roles.png`,
  },
  {
    speaker: "Gyna",
    text: "Bedside: you'll see live vitals drifting and can examine the patient. Tap a finding, then order treatment from the tray.",
    card: `${CARD}/bedside.png`,
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "Protocol: you've got the binder. Talk your partner through what to do - you're the one with the reference, not the hands.",
    card: `${CARD}/protocol.png`,
  },
  {
    speaker: "Gyna",
    expr: "smug",
    text: "Here's the catch: neither of you can see the other's screen. Everything happens by voice. No peeking.",
    card: `${CARD}/no-peeking.png`,
  },
  {
    speaker: "Gyna",
    text: "Wrong order? Costs you time, not an instant fail - but three serious slip-ups and it's a code called.",
    card: `${CARD}/errors.png`,
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "Nail the sequence, beat the clock. 1 to 3 stars waiting on the other side. Go save someone.",
    card: `${CARD}/scoring.png`,
  },
];
