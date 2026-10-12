// The 20-sticker album. See masterdoc.md section 2.6.
// `unlock` is a human-readable description for now; TODO (M3, section 7.2)
// is to turn each one into a checkable predicate evaluated server-side
// against profile/scoreboard/streak state.

export interface Sticker {
  id: number;
  name: string;
  icon: string;
  unlock: string;
}

export const STICKERS: Sticker[] = [
  { id: 1, name: "First Delivery", icon: "stork", unlock: "Finish your first Code Red scenario" },
  { id: 2, name: "Zero Flatlines", icon: "ecg-heart", unlock: "Win a Code Red scenario with 3 stars" },
  { id: 3, name: "Overconfident", icon: "peacock", unlock: "Wrong final guess on your first turn in Guess the Diagnosis" },
  { id: 4, name: "Phone a Friend", icon: "phone", unlock: "Use the Consult lifeline" },
  { id: 5, name: "Detective", icon: "magnifier", unlock: "Solve a case with all tokens remaining" },
  { id: 6, name: "On a Roll", icon: "flame", unlock: "3-day shared streak" },
  { id: 7, name: "Minor Setback", icon: "bandage", unlock: "Lose any live game" },
  { id: 8, name: "In Sync", icon: "stethoscope-heart", unlock: "3 bullseyes in one Triage Dial game" },
  { id: 9, name: "Fuel", icon: "coffee-cup", unlock: "Play 3 days in a row" },
  { id: 10, name: "Big Brain", icon: "brain", unlock: "Solve the daily Wordle in 2 guesses" },
  { id: 11, name: "Pharma Pro", icon: "pill", unlock: "Win a Wordle in the Pharmacology pack" },
  { id: 12, name: "Fever Streak", icon: "thermometer", unlock: "7-day shared streak" },
  { id: 13, name: "Dog Whisperer", icon: "ward-dog", unlock: "Tap the Ward Dog 10 times" },
  { id: 14, name: "Best Friend", icon: "mascot", unlock: "Reach bond rank 2" },
  { id: 15, name: "Rising Star", icon: "star", unlock: "First rank-up" },
  { id: 16, name: "Champion", icon: "trophy", unlock: "Win 5 versus games (either player)" },
  { id: 17, name: "Master Key", icon: "key", unlock: "Play all five games at least once" },
  { id: 18, name: "Night Owl", icon: "moon", unlock: "Play after midnight IST" },
  { id: 19, name: "Green Thumb", icon: "plant", unlock: "First garden plant fully grown" },
  { id: 20, name: "Memory Lane", icon: "polaroid", unlock: "Reveal the full memory photo" },
];
