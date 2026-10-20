// Shared per-game display metadata for every screen that lists the five
// games (Lounge hotspots have their own copy for hover labels - this is
// for the Games list, Waiting Room, and the generic GameIntro fallback,
// which were each hand-rolling a slightly different name map before this).
// Tiers match masterdoc.md section 1.8: Guess the Diagnosis/Triage Dial/
// Wordle are v1 (Must-tier, live); Code Red is v1.5; Case Files is v2 -
// neither has a real board yet (TODO.md).
import type { GameId } from "@ward-games/shared";

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  /** Where "Play" goes - Wordle is the one game with its own top-level
   * route (S16/S17: `/wordle`, not `/g/wordle`) per masterdoc.md. */
  introRoute: string;
  live: boolean;
  /** How many people actually play a round - Wordle's daily mode is
   * solo-per-device (both solve independently), race/duel are head to
   * head, so it's the one game genuinely spanning 1-2 rather than a flat 2. */
  players: string;
  /** One short skill/genre label for the Games list and Stats table row -
   * not a game mechanic name, just what kind of thinking it exercises. */
  category: string;
}

export const GAME_META: GameMeta[] = [
  {
    id: "guess-the-diagnosis",
    name: "Guess the Diagnosis",
    tagline: "Guess Who, clinical edition - find your partner's secret patient first.",
    introRoute: "/g/guess-the-diagnosis",
    live: true,
    players: "2 players",
    category: "Clinical reasoning",
  },
  {
    id: "triage-dial",
    name: "Triage Dial",
    tagline: "Call it before the needle settles - vitals, vibes, and a shared spectrum.",
    introRoute: "/g/triage-dial",
    live: true,
    players: "2 players",
    category: "Prioritisation",
  },
  {
    id: "wordle",
    name: "Medical Wordle",
    tagline: "The daily word, with a medical vocabulary and a race/duel mode.",
    introRoute: "/wordle",
    live: true,
    players: "1-2 players",
    category: "Medical vocabulary",
  },
  {
    id: "code-red",
    name: "Code Red",
    tagline: "Bedside emergencies, roles, and a protocol binder under the clock.",
    introRoute: "/g/code-red",
    live: true,
    players: "2 players",
    category: "Rapid decision-making",
  },
  {
    id: "case-files",
    name: "Case Files",
    tagline: "Evidence board, co-op diagnosis, a slower mystery to solve together.",
    introRoute: "/g/case-files",
    live: false,
    players: "2 players",
    category: "Clinical reasoning",
  },
];

export const GAME_META_BY_ID: Record<GameId, GameMeta> = Object.fromEntries(
  GAME_META.map((g) => [g.id, g])
) as Record<GameId, GameMeta>;
