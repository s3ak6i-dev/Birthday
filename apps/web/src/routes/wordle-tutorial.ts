// Placeholder for scenes/tut_wordle.ink (masterdoc.md section 2.5 scene
// trigger table) - the rules explanation itself doesn't need medical
// sourcing, so it's safe to write now, ahead of the real Ink pipeline
// (section 4.8, TODO.md M3). Swap this for compiled Ink output later;
// DialogueScene's `lines` prop shape won't need to change.
//
// Each line's `card` is a small flashcard-style illustration beside Gyna,
// same pattern as guess-the-diagnosis-tutorial.ts - these two games
// originally shipped without any (a real content gap, not a bug; see
// TODO.md).
import type { DialogueLine } from "@ward-games/ui";

const CARD = "/wordle-tutorial-cards";

export const WORDLE_TUTORIAL: DialogueLine[] = [
  {
    speaker: "Gyna",
    expr: "happy",
    text: "Medical Wordle! Same rules you already know - 6 guesses, 5 letters, green means right spot, yellow means wrong spot.",
    card: `${CARD}/rules.png`,
  },
  {
    speaker: "Gyna",
    text: "Daily: one shared word a day, you each solve it on your own, then compare boards once you're both done.",
    card: `${CARD}/daily.png`,
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "Race: same word, live, at the same time. First to solve it wins - or whoever's closest after 6 rows.",
    card: `${CARD}/race.png`,
  },
  {
    speaker: "Gyna",
    expr: "smug",
    text: "Duel: you each secretly pick a word for the OTHER person to solve. Add a hint if you're feeling generous. Or don't.",
    card: `${CARD}/duel.png`,
  },
  {
    speaker: "Gyna",
    text: "Stuck after guess 4? There's a hint button - it'll cost you a little on Daily and Race, but it's there.",
    card: `${CARD}/hint.png`,
  },
];
