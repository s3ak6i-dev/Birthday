// Placeholder for scenes/tut_triage.ink (masterdoc.md section 2.5 scene
// trigger table) - the rules explanation itself doesn't need medical
// sourcing, so it's safe to write now, ahead of the real Ink pipeline
// (section 4.8, TODO.md M3). Swap this for compiled Ink output later;
// DialogueScene's `lines` prop shape won't need to change.
//
// Distinct from scenes/triage_intro.ink, which plays once on first login
// ever (the `intro` scene trigger) - this is the skippable per-game
// tutorial (`tut_triage`), shown the first time this game is opened.
//
// Each line's `card` is a small flashcard-style illustration beside Gyna,
// same pattern as guess-the-diagnosis-tutorial.ts/wordle-tutorial.ts -
// this one shipped without any at first (a real content gap, not a bug).
import type { DialogueLine } from "@ward-games/ui";

const CARD = "/triage-dial-tutorial-cards";

export const TRIAGE_DIAL_TUTORIAL: DialogueLine[] = [
  {
    speaker: "Gyna",
    expr: "happy",
    text: "Triage Dial! Rule one: the clue-giver talks, the dialer shuts up and drags. That's the whole vibe.",
    card: `${CARD}/clue-giver.png`,
  },
  {
    speaker: "Gyna",
    text: "Each round, one of you sees a hidden target on the spectrum and gives a one-line clue. No numbers, no cheating.",
    card: `${CARD}/hidden-target.png`,
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "The other player drags the needle to where they think the target is, then locks it in. You've got 45 seconds once the clue lands.",
    card: `${CARD}/drag-dial.png`,
  },
  {
    speaker: "Gyna",
    expr: "smug",
    text: "Lock in, then argue - that's the whole game. Closer to the target means more points: bullseye, close, edge, or miss.",
    card: `${CARD}/scoring.png`,
  },
  {
    speaker: "Gyna",
    text: "Co-op shares one score between you. Versus keeps score separately and compares at the end - ties replay the last round, so no easy outs.",
    card: `${CARD}/modes.png`,
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "8 rounds, roles swap every time. Go argue about blood pressure readings like it's a trivia night.",
    card: `${CARD}/rounds.png`,
  },
];
