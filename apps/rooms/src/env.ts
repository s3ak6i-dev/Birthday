// See masterdoc.md section 12.2 (environment variables).
export interface Env {
  WARD_ROOM: DurableObjectNamespace;
  // Comma-separated list, checked against the WebSocket upgrade request's
  // `Origin` header in index.ts's `onBeforeConnect` - the origin-allowlist
  // half of masterdoc's "JWT verified + origin allowlist" security bar.
  ALLOWED_ORIGIN: string;
  // Not secret - used only to build the JWKS URL for verifying session
  // tokens (jwt.ts). Same value already ships client-side as
  // VITE_SUPABASE_URL, so it lives in wrangler.toml's plain [vars], not a
  // `wrangler secret`.
  SUPABASE_URL: string;
}
