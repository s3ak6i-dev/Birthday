// Reads/writes for scoreboard + stickers_unlocked (supabase/migrations/0001_init.sql,
// masterdoc.md section 4.5/2.6). First real Postgres writes in the app -
// everything before this only ever wrote to the room's Durable Object.
//
// RLS lets a user write only their own scoreboard row and their own
// stickers_unlocked rows (`auth.uid() = user_id`), so every write here is
// scoped to the signed-in client's own progress - each connected player
// records their own outcome independently, never the other player's.
import type { GameId } from "@ward-games/shared";
import { supabase } from "./supabase";

export interface ScoreboardRow {
  user_id: string;
  game: GameId;
  wins: number;
  losses: number;
  current_streak: number;
}

export async function fetchScoreboard(): Promise<ScoreboardRow[]> {
  const { data } = await supabase.from("scoreboard").select("user_id, game, wins, losses, current_streak");
  return (data as ScoreboardRow[] | null) ?? [];
}

/** Called once per finished game by each connected client for its own
 * outcome - "win"/"loss" only; draws don't move the scoreboard (nobody's
 * record should get worse for a draw). Read-then-write rather than an
 * atomic increment: fine at this scale (one signed-in user, one game
 * ending at a time), not worth a Postgres function for two accounts. */
export async function recordGameResult(userId: string, game: GameId, outcome: "win" | "loss"): Promise<void> {
  const { data: existing } = await supabase
    .from("scoreboard")
    .select("wins, losses, current_streak")
    .eq("user_id", userId)
    .eq("game", game)
    .maybeSingle();

  const wins = (existing?.wins ?? 0) + (outcome === "win" ? 1 : 0);
  const losses = (existing?.losses ?? 0) + (outcome === "loss" ? 1 : 0);
  const current_streak = outcome === "win" ? (existing?.current_streak ?? 0) + 1 : 0;

  await supabase.from("scoreboard").upsert({ user_id: userId, game, wins, losses, current_streak });
}

export async function fetchUnlockedStickerIds(): Promise<Set<number>> {
  const { data } = await supabase.from("stickers_unlocked").select("sticker_id");
  return new Set((data ?? []).map((r) => r.sticker_id as number));
}

/** Unlocks are shared, not per-player (masterdoc.md 2.6's album reads as
 * one shared collection, not "my stickers" vs "their stickers") - so this
 * only writes a row if nobody has unlocked it yet, same sticker_id from
 * either account thereafter is a harmless duplicate the PK silently
 * ignores via `ignoreDuplicates`. */
export async function unlockSticker(userId: string, stickerId: number): Promise<void> {
  await supabase
    .from("stickers_unlocked")
    .upsert({ user_id: userId, sticker_id: stickerId }, { onConflict: "user_id,sticker_id", ignoreDuplicates: true });
}
