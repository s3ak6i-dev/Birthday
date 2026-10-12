// Gyna's intro scene - masterdoc.md section 2.5 scene trigger table's
// `intro` ("First login on each device"). Plays once per browser, right
// after the entrance video lands her on the desk, before the character
// picker appears. A first draft - personal/in-joke content, meant to be
// edited, not treated as final.
import type { DialogueLine } from "@ward-games/ui";

export const GATE_INTRO: DialogueLine[] = [
  { speaker: "Gyna", expr: "happy", text: "Oh! Someone's here. Hi — I'm Gyna. I run the front desk at Dr. Chandra's Waiting Room, such as it is." },
  { speaker: "Gyna", expr: "smug", text: "Technically I was hired. Nobody asked, exactly, but here I am, stethoscope and all." },
  { speaker: "Gyna", expr: "happy", text: "This whole place got built for one reason: so the two of you have somewhere to hang out together, even from far away." },
  { speaker: "Gyna", expr: "excited", text: "Games, a daily puzzle, a few terrible bedside manners to practice on each other — the usual." },
  { speaker: "Gyna", expr: "smug", text: "Fair warning: I will absolutely heckle you if you guess wrong. It's in my contract." },
  { speaker: "Gyna", expr: "happy", text: "Anyway — go on and tell me who's here, and let's get started." },
];
