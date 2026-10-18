// Cloudflare Worker entry point. Routes WebSocket connections to the right
// room's Durable Object by room code. See masterdoc.md section 4.6.
import { routePartykitRequest } from "partyserver";
import type { Env } from "./env";
import { verifySupabaseJwt } from "./jwt";

export { WardRoom } from "./ward-room";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const routed = await routePartykitRequest(request, env as unknown as Record<string, unknown>, {
      // Reject unauthorized connections *before* the WebSocket upgrade
      // completes - `WardRoom#onConnect` tried calling `connection.close()`
      // on an already-upgraded hibernatable WebSocket instead, and that
      // doesn't reliably terminate the connection (verified against a real
      // `wrangler dev` smoke test: the client-side socket stayed open and
      // never received a close event). Returning a Response here short-
      // circuits `routePartykitRequest` before it ever calls the Durable
      // Object's `fetch`, so the upgrade never happens at all.
      onBeforeConnect: async (req) => {
        // Origin allowlist (masterdoc.md's quality bar table, section 2 -
        // "Security: ... origin allowlist"). `ALLOWED_ORIGIN` was declared
        // on `Env` from the start but never actually checked anywhere -
        // JWT verification alone gated *who*, not *from where*. Comma-
        // separated so both the local dev origin and the real deployed
        // site can be allowed at once (see wrangler.toml). The WebSocket
        // upgrade request's `Origin` header is browser-set and can't be
        // forged from JS the way an arbitrary fetch header could be.
        const origin = req.headers.get("Origin");
        const allowed = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim());
        if (!origin || !allowed.includes(origin)) {
          return new Response("Forbidden origin", { status: 403 });
        }
        const url = new URL(req.url);
        const token = url.searchParams.get("token");
        const userId = await verifySupabaseJwt(token, env.SUPABASE_URL);
        if (!userId) {
          return new Response("Unauthorized", { status: 401 });
        }
        // Forward the verified identity to the Durable Object via a
        // server-set header. Always overwrite rather than appending - a
        // client could otherwise just set this header itself and skip
        // verification entirely.
        const headers = new Headers(req.headers);
        headers.set("X-Ward-User-Id", userId);
        return new Request(req, { headers });
      },
    });
    return routed ?? new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
