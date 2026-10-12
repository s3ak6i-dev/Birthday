// The two accounts (D8: public signups disabled, exactly two fixed
// Supabase accounts - masterdoc.md section 4.4). The Gate screen no longer
// has a typed passcode field (per request) - picking a character and
// tapping Enter signs in directly, using the credentials below.
//
// The password is still deliberately baked into the built client bundle,
// not kept secret from someone with dev tools open - the site's actual
// privacy comes from the URL being unlisted/noindex (FR-01), not from the
// bundle being undiscoverable. What it must NOT be is in the git history,
// since this repo is public: it's read from VITE_SURYA_PASSWORD /
// VITE_LAKSHMI_PASSWORD (apps/web/.env.local, gitignored - see
// .env.example) and inlined by Vite at build time, same mechanism as
// VITE_SUPABASE_ANON_KEY. The placeholder below just means "nobody can
// sign in" until a real .env.local exists locally. Must match
// scripts/seed-accounts.ts's real values exactly - that's what actually
// created these two accounts in Supabase.
const PLACEHOLDER_PASSWORD = "CHANGE_ME";

export interface CharacterLogin {
  id: "surya" | "lakshmi";
  label: string;
  email: string;
  password: string;
  /** Full-body sprite - not used at the Gate (see `bust` below), but kept
   * around for Avatar Setup / anywhere else a full figure is useful later. */
  portrait: string;
  /** Head-and-shoulders close-up, generated separately from `portrait` so
   * the face actually has real resolution at the Gate's small card size,
   * rather than being a tiny crop out of a full-body standing shot. */
  bust: string;
}

export const CHARACTERS: CharacterLogin[] = [
  {
    id: "surya",
    label: "Surya",
    email: "slntmtrx@gmail.com",
    password: import.meta.env.VITE_SURYA_PASSWORD || PLACEHOLDER_PASSWORD,
    portrait: "/characters/surya.png",
    bust: "/characters/surya-bust.png",
  },
  {
    id: "lakshmi",
    label: "Lakshmi",
    email: "chandraleksha04@gmail.com",
    password: import.meta.env.VITE_LAKSHMI_PASSWORD || PLACEHOLDER_PASSWORD,
    portrait: "/characters/lakshmi.png",
    bust: "/characters/lakshmi-bust.png",
  },
];

/** Rooms (apps/rooms) key players by their Supabase auth user id, which
 * carries no name - the room protocol never learns display names at all.
 * Since exactly two accounts exist (D8), the client can recover "who is
 * this" by matching the signed-in session's email against the fixed list
 * above, rather than adding a server-side profiles lookup for two rows. */
export function characterForEmail(email: string | null | undefined): CharacterLogin | undefined {
  return CHARACTERS.find((c) => c.email === email);
}
