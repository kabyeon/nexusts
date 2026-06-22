/**
 * Cloudflare Workers runtime adapter.
 *
 * Returns a fetch handler suitable for `export default { fetch }` in a
 * Workers entry point. The Hono app is the actual fetch handler, so this
 * is mostly a thin wrapper.
 *
 * Usage:
 *   // src/worker.ts
 *   import { bootstrap } from './app.js';
 *   const { fetch } = bootstrap();
 *   export default { fetch };
 */
import type { Hono } from "hono";

export function cloudflareAdapter(app: Hono) {
	return {
		fetch: (req: Request, env?: any, ctx?: any) => app.fetch(req, env, ctx),
	};
}
