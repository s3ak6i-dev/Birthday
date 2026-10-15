// Shared by every game's intro screen's "Create room" button. Pulled out
// once a third game needed the exact same generator GuessTheDiagnosisIntro
// originally had inline.
import { ROOM } from "@ward-games/shared";

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O - easy to mishear/misread aloud

export function randomRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM.codeLength; i++) {
    code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  }
  return code;
}
