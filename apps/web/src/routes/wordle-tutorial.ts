// Placeholder for scenes/tut_wordle.ink (masterdoc.md section 2.5 scene
// trigger table) - the rules explanation itself doesn't need medical
// sourcing, so it's safe to write now, ahead of the real Ink pipeline
// (section 4.8, TODO.md M3). Swap this for compiled Ink output later;
// DialogueScene's `lines` prop shape won't need to change.
import type { DialogueLine } from "@ward-games/ui";

export const WORDLE_TUTORIAL: DialogueLine[] = [
  {
    speaker: "Gyna",
    expr: "happy",
    text: "Medical Wordle! Same rules you already know - 6 guesses, 5 letters, green means right spot, yellow means wrong spot.",
  },
  {
    speaker: "Gyna",
    text: "Daily: one shared word a day, you each solve it on your own, then compare boards once you're both done.",
  },
  {
    speaker: "Gyna",
    expr: "excited",
    text: "Race: same word, live, at the same time. First to solve it wins - or whoever's closest after 6 rows.",
  },
  {
    speaker: "Gyna",
    expr: "smug",
    text: "Duel: you each secretly pick a word for the OTHER person to solve. Add a hint if you're feeling generous. Or don't.",
  },
  {
    speaker: "Gyna",
    text: "Stuck after guess 4? There's a hint button - it'll cost you a little on Daily and Race, but it's there.",
  },
];
