/**
 * Built-in session middleware.
 *
 * Reads the session cookie (`sid` by default) and populates
 * `c.var.nexus.user` so the `@Session()` decorator works in
 * controllers without manual middleware wiring.
 *
 * The middleware is auto-installed by `SessionModule.forRoot()`.
 * If you need custom behavior (e.g. a different cookie name),
 * import this function and mount it manually in `main.ts`.
 *
 * Usage (manual, when SessionModule.forRoot is not used):
 *
 *   import { sessionMiddleware } from 'nexusjs/session';
 *   const sessions = app.container.resolve(SessionService.TOKEN);
 *   app.server.app.use('*', sessionMiddleware(sessions, { cookieName: 'my_sid' }));
 */

import type { MiddlewareHandler } from "hono";
import type { SessionService } from "./session.service.js";

export interface SessionMiddlewareOptions {
	/** Cookie name to read the session ID from. Default: `sid`. */
	cookieName?: string;
}

/**
 * Build a Hono middleware that reads the session cookie and populates
 * `c.var.nexus.user` for the `@Session()` decorator.
 */
export function sessionMiddleware(
	sessions: SessionService,
	options: SessionMiddlewareOptions = {},
): MiddlewareHandler {
	const cookieName = options.cookieName ?? "sid";

	return async (c, next) => {
		const cookie = c.req.header("cookie") ?? "";
		const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const re = new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`);
		const match = cookie.match(re);

		if (match) {
			try {
				const record = sessions.decodeCookie(decodeURIComponent(match[1]));
				if (record) {
					c.set("nexus", { user: record });
				}
			} catch {
				// Malformed cookie — ignore.
			}
		}

		await next();
	};
}
