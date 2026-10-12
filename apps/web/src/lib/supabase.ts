// See masterdoc.md section 4.4 (auth & identity). Public signups are
// disabled on the Supabase project (D8); exactly two accounts exist.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set - copy .env.example to .env.local (section 12.2). " +
      "Falling back to a placeholder client so the rest of the app can still render; auth calls will fail until this is set."
  );
}

// createClient throws synchronously on an empty/invalid URL, which would
// otherwise crash the whole app at import time (any screen that imports
// this file, not just the gate) before .env.local exists. Fall back to a
// syntactically valid placeholder so module load never fails.
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key");
