// The 20-sticker album. See masterdoc.md section 2.6.
// `unlock` is a human-readable description for now; TODO (M3, section 7.2)
// is to turn each one into a checkable predicate evaluated server-side
// against profile/scoreboard/streak state.

export type StickerCategory = "clinical" | "streaks" | "word-games" | "milestones";

export interface Sticker {
  id: number;
  name: string;
  icon: string;
  unlock: string;
  /** Grouping for the album's filter pills - a read of what each unlock
   * condition is actually about, not a separate invented taxonomy. */
  category: StickerCategory;
}

export const STICKERS: Sticker[] = [
  { id: 1, name: "First Delivery", icon: "stork", unlock: "Finish your first Code Red scenario", category: "clinical" },
  { id: 2, name: "Zero Flatlines", icon: "ecg-heart", unlock: "Win a Code Red scenario with 3 stars", category: "clinical" },
  {
    id: 3,
    name: "Overconfident",
    icon: "peacock",
    unlock: "Wrong final guess on your first turn in Guess the Diagnosis",
    category: "clinical",
  },
  { id: 4, name: "Phone a Friend", icon: "phone", unlock: "Use the Consult lifeline", category: "clinical" },
  { id: 5, name: "Detective", icon: "magnifier", unlock: "Solve a case with all tokens remaining", category: "clinical" },
  { id: 6, name: "On a Roll", icon: "flame", unlock: "3-day shared streak", category: "streaks" },
  { id: 7, name: "Minor Setback", icon: "bandage", unlock: "Lose any live game", category: "milestones" },
  {
    id: 8,
    name: "In Sync",
    icon: "stethoscope-heart",
    unlock: "3 bullseyes in one Triage Dial game",
    category: "clinical",
  },
  { id: 9, name: "Fuel", icon: "coffee-cup", unlock: "Play 3 days in a row", category: "streaks" },
  { id: 10, name: "Big Brain", icon: "brain", unlock: "Solve the daily Wordle in 2 guesses", category: "word-games" },
  {
    id: 11,
    name: "Pharma Pro",
    icon: "pill",
    unlock: "Win a Wordle in the Pharmacology pack",
    category: "word-games",
  },
  { id: 12, name: "Fever Streak", icon: "thermometer", unlock: "7-day shared streak", category: "streaks" },
  { id: 13, name: "Dog Whisperer", icon: "ward-dog", unlock: "Tap the Ward Dog 10 times", category: "milestones" },
  { id: 14, name: "Best Friend", icon: "mascot", unlock: "Reach bond rank 2", category: "milestones" },
  { id: 15, name: "Rising Star", icon: "star", unlock: "First rank-up", category: "milestones" },
  {
    id: 16,
    name: "Champion",
    icon: "trophy",
    unlock: "Win 5 versus games (either player)",
    category: "milestones",
  },
  {
    id: 17,
    name: "Master Key",
    icon: "key",
    unlock: "Play all five games at least once",
    category: "milestones",
  },
  { id: 18, name: "Night Owl", icon: "moon", unlock: "Play after midnight IST", category: "milestones" },
  {
    id: 19,
    name: "Green Thumb",
    icon: "plant",
    unlock: "First garden plant fully grown",
    category: "milestones",
  },
  {
    id: 20,
    name: "Memory Lane",
    icon: "polaroid",
    unlock: "Reveal the full memory photo",
    category: "milestones",
  },
];
