// Verifies a Supabase-issued JWT. See masterdoc.md section 4.6 - WebSocket
// connect requires a valid token.
//
// Uses JWKS (asymmetric ES256), not a shared HS256 secret: Supabase
// migrated to per-project signing keys, and empirically (tested directly
// against the real project with `wrangler dev` + a real sign-in token)
// session tokens from `signInWithPassword` come back ES256-signed against
// the *new* key - the project's "Legacy JWT secret" only covers the static
// `anon`/`service_role` API keys, not actual user session tokens. No
// shared secret needs to live in this Worker at all this way - just the
// project URL, which isn't sensitive (it's already shipped in the client
// bundle as VITE_SUPABASE_URL).
//
// Doesn't also check the user id against a hardcoded allowlist of the two
// known accounts: public signups are disabled on the Supabase project
// itself (D8), so a token that verifies against *this* project's JWKS can
// only have been issued to one of the two accounts that will ever exist.
import { createRemoteJWKSet, jwtVerify } from "jose";

// createRemoteJWKSet caches the fetched key set internally and is safe to
// construct once per Worker isolate rather than per request.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksForUrl: string | null = null;

function getJwks(supabaseUrl: string) {
  if (!jwks || jwksForUrl !== supabaseUrl) {
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    jwksForUrl = supabaseUrl;
  }
  return jwks;
}

/** Returns the authenticated user's id (the JWT's `sub` claim), or null if
 * the token is missing, malformed, expired, or doesn't verify. */
export async function verifySupabaseJwt(token: string | null, supabaseUrl: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwks(supabaseUrl), { algorithms: ["ES256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null; // expired, malformed, or signature mismatch - all just "not authorized"
  }
}
