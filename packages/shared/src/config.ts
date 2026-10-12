// Tunable meta-system constants. See masterdoc.md section 2.6 (meta systems).
// Numbers here are the first draft from the spec (open item #11, section 11) -
// safe to retune after a few real sessions.

export const XP_EVENTS = {
  finishLiveGame: 20,
  winVersusGame: 10,
  firstTimePlayingGame: 30,
  completeDailyPuzzle: 15,
  bothCompleteDailySameDay: 10,
  streakBonusPerDay: 5,
  streakBonusCap: 50,
  codeRedPerStar: 15,
  caseSolvedBase: 40,
  caseSolvedPerStar: 10,
} as const;

export const RANKS = [
  { name: "Intern", xpNeeded: 0 },
  { name: "Resident", xpNeeded: 200 },
  { name: "Registrar", xpNeeded: 600 },
  { name: "Consultant", xpNeeded: 1400 },
  { name: "Professor", xpNeeded: 3000 },
] as const;

export const BOND_RANK_THRESHOLDS = [50, 150, 300, 500, 800] as const;

export const BOND_XP = {
  coopGameCompleted: 10,
  sharedDailyDay: 5,
  caseFilesCaseSolved: 20,
} as const;

export const GARDEN_MAX_PLANTS = 12;
export const GARDEN_GROWTH_POINTS_PER_MATURE_PLANT = 5;

/** Room/session constants shared by every live game (masterdoc 1.9 FR-20..24, 4.6). */
export const ROOM = {
  codeLength: 4,
  reconnectHoldSeconds: 120,
  countdownSeconds: 3,
  reactionEmojis: ["clap", "heart", "skull", "brain", "laugh", "stethoscope"] as const,
  needleUpdatesPerSecond: 15,
} as const;
