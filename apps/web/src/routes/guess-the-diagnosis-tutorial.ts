// Placeholder for scenes/tut_guess.ink (masterdoc.md section 2.5 scene
// trigger table) - the rules explanation itself doesn't need medical
// sourcing, so it's safe to write now, ahead of the real Ink pipeline
// (section 4.8, TODO.md M3). Swap this for compiled Ink output later;
// DialogueScene's `lines` prop shape won't need to change.
//
// Each line's `card` is a small flashcard-style illustration swapped in
// beside Gyna as she explains that beat (art/export/guess-the-diagnosis-
// tutorial-cards/) - one generated sheet, one card per line, in order.
import type { DialogueLine } from "@ward-games/ui";

const CARD = "/guess-the-diagnosis-tutorial-cards";

export const GUESS_THE_DIAGNOSIS_TUTORIAL: DialogueLine[] = [
  {
    speaker: "Gyna",
    expr: "happy",
    text: "Alright, time for Guess the Diagnosis! Think Guess Who, but instead of funny hats, it's medical conditions.",
    card: `${CARD}/board.png`,
  },
  {
    speaker: "Gyna",
    text: "You'll each get a secret card. Ask yes-or-no questions to narrow down theirs before they narrow down yours.",
    card: `${CARD}/secret-question.png`,
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "Three wrong final guesses and you're out of the running - but the game keeps going until somebody wins, or you're both toast.",
    card: `${CARD}/three-lives.png`,
  },
  {
    speaker: "Gyna",
    expr: "smug",
    text: 'Two lifelines if you get stuck: Consult gives a free hint, 2nd Opinion undoes one bad guess. Use them wisely.',
    card: `${CARD}/lifelines.png`,
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "Go on then. Diagnose each other!",
    card: `${CARD}/lets-begin.png`,
  },
];
