/**
 * Session middleware — AdonisJS-style session API on `ctx.var.session`.
 *
 *   app.server.app.use('*', sessionMiddleware(sessions));
 *
 * Then in controllers (standard decorator mode):
 *   @Get('/cart')
 *   cart(ctx: Context) {
 *     const s = ctx.var.session;
 *     return s.get('cart', []);
 *   }
 */

import type { MiddlewareHandler } from "hono";
import type { SessionService } from "./session.service.js";
import type { SessionRecord } from "./types.js";

export interface SessionMiddlewareOptions {
	cookieName?: string;
}

export class SessionContext {
	#service: SessionService;
	#record: SessionRecord | null;
	#dirty = false;
	#flashedKeys = new Set<string>();

	constructor(service: SessionService, record: SessionRecord | null) {
		this.#service = service;
		this.#record = record;
	}

	get<T = any>(key: string, defaultValue?: T): T | undefined {
		if (!this.#record?.data) return defaultValue as T | undefined;
		return (this.#record.data as any)[key] ?? defaultValue;
	}

	set(key: string, value: any): void {
		if (!this.#record) return;
		if (!this.#record.data) this.#record.data = {} as any;
		(this.#record.data as any)[key] = value;
		this.#dirty = true;
	}

	forget(key: string): void {
		if (!this.#record?.data) return;
		delete (this.#record.data as any)[key];
		this.#dirty = true;
	}

	flash(key: string, value: any): void {
		this.set(key, value);
		this.#flashedKeys.add(key);
	}

	all(): Record<string, unknown> {
		return { ...(this.#record?.data ?? {}) };
	}

	get id(): string | null { return this.#record?.id ?? null; }
	get userId(): string | null { return this.#record?.userId ?? null; }

	async save(c: any): Promise<void> {
		if (!this.#record) return;
		for (const k of this.#flashedKeys) {
			delete (this.#record.data as any)[k];
		}
		if (this.#dirty || this.#flashedKeys.size > 0) {
			await this.#service.update(this.#record.id, { dataPatch: this.#record.data });
		}
		const setCookie = this.#service.buildSetCookie(this.#record);
		if (setCookie) {
			c.res.headers.set("Set-Cookie", setCookie);
		}
	}
}

export function sessionMiddleware(
	sessions: SessionService,
	options: SessionMiddlewareOptions = {},
): MiddlewareHandler {
	const cookieName = options.cookieName ?? "sid";

	return async (c, next) => {
		let record: SessionRecord | null = null;
		const cookie = c.req.header("cookie") ?? "";
		const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const re = new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`);
		const match = cookie.match(re);

		if (match) {
			try {
				record = sessions.decodeCookie(decodeURIComponent(match[1]));
			} catch {
				// ignore
			}
		}

		if (!record) {
			record = await sessions.create({});
		}

		const sessionCtx = new SessionContext(sessions, record);
		c.set("nexus", { user: record });
		c.set("session", sessionCtx);

		await next();

		await sessionCtx.save(c);
	};
}

export { SessionContext as SessionContextImpl };

/**
 * Retrieve the AdonisJS-style session context from a Hono context.
 *
 * Usage:
 *   @Get('/cart')
 *   cart(ctx: Context) {
 *     const cart = session(ctx).get('cart', []);
 *     return cart;
 *   }
 */
export function session(c: any): SessionContext {
	return c.get("session") as SessionContext;
}
