// One-off script to create the exactly-two Supabase accounts (D8, section
// 4.4). Run manually, once, against a fresh project - all five values come
// from the environment so nothing real ever has to touch this (public,
// committed) file:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SURYA_PASSWORD=... LAKSHMI_PASSWORD=... npx tsx scripts/seed-accounts.ts
//
// Must match apps/web/src/lib/characters.ts's VITE_SURYA_PASSWORD /
// VITE_LAKSHMI_PASSWORD exactly - that's what the Gate screen actually
// signs in with.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const suryaPassword = process.env.SURYA_PASSWORD;
const lakshmiPassword = process.env.LAKSHMI_PASSWORD;

if (!url || !serviceRoleKey || !suryaPassword || !lakshmiPassword) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SURYA_PASSWORD, and LAKSHMI_PASSWORD before running this script."
  );
}

const admin = createClient(url, serviceRoleKey);

const PLAYERS = [
  { email: "slntmtrx@gmail.com", password: suryaPassword, displayName: "Surya" },
  { email: "chandraleksha04@gmail.com", password: lakshmiPassword, displayName: "Lakshmi" },
];

// Wrapped in an async IIFE rather than using top-level await directly -
// the repo root has no "type": "module" in package.json, so tsx transforms
// standalone scripts like this one as CJS by default, and CJS doesn't
// support top-level await.
async function main() {
  for (const player of PLAYERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: player.email,
      password: player.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`Failed to create ${player.displayName}:`, error.message);
      continue;
    }

    const userId = data.user.id;
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({ user_id: userId, display_name: player.displayName });

    if (profileError) {
      console.error(`Failed to seed profile for ${player.displayName}:`, profileError.message);
    } else {
      console.log(`Created ${player.displayName} (${userId})`);
    }
  }
}

main();
