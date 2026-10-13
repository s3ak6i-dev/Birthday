// Looks up both known accounts' display names by Supabase user id, for any
// screen that reads a table keyed by user_id (scoreboard, stickers_unlocked)
// and needs to show "Surya" / "Lakshmi" rather than a raw uuid. RLS lets any
// authenticated user read every profiles row (supabase/migrations/0001_init.sql
// - "both players are trusted equally with each other's progress").
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface ProfileRow {
  user_id: string;
  display_name: string;
}

export function useProfiles(): { profiles: ProfileRow[]; byId: Record<string, string>; loading: boolean } {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("profiles")
      .select("user_id, display_name")
      .then(({ data }) => {
        if (cancelled) return;
        setProfiles(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = Object.fromEntries(profiles.map((p) => [p.user_id, p.display_name]));
  return { profiles, byId, loading };
}
