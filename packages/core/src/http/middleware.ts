/**
 * HTTP middleware primitives.
 *
 * Middleware in Nexus is just a Hono-compatible function: `(c, next) => ...`.
 * The framework exposes a few ready-made middlewares (logger, CORS, error)
 * and lets users write their own.
 */
import type { Context, Next } from "hono";

/** A Nexus/Hono middleware signature. */
export type Middleware = (c: Context, next: Next) => any | Promise<any>;

/** Simple request logger. Logs method, URL, status, duration. */
export function logger(): Middleware {
	return async (c, next) => {
		const start = performance.now();
		await next();
		const ms = (performance.now() - start).toFixed(2);
		const status = c.res.status;
		console.log(`[${c.req.method}] ${c.req.path} -> ${status} (${ms}ms)`);
		return;
	};
}

/**
 * CORS middleware.
 *
 * An explicit origin (string or string[]) is required. The function does
 * not default to '*' because that is unsafe with credentials. Pass '*'
 * explicitly via `origin: '*'` only if you know your API has no cookies.
 */
export function cors(options: {
	origin: string | string[];
	methods?: string[];
	headers?: string[];
	credentials?: boolean;
}): Middleware {
	const origin = options.origin;
	const methods = options.methods ?? [
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"PATCH",
		"OPTIONS",
		"HEAD",
	];
	const headerList = options.headers ?? ["Content-Type", "Authorization"];
	const headersValue = Array.isArray(headerList)
		? headerList.join(",")
		: headerList;

	return async (c, next) => {
		const set = (key: string, value: string) => {
			c.res.headers.set(key, value);
		};
		set(
			"Access-Control-Allow-Origin",
			Array.isArray(origin) ? origin.join(",") : origin,
		);
		set("Access-Control-Allow-Methods", methods.join(","));
		set("Access-Control-Allow-Headers", headersValue);
		if (options.credentials) set("Access-Control-Allow-Credentials", "true");

		if (c.req.method === "OPTIONS") {
			return c.body(null, 204);
		}
		await next();
		return;
	};
}

/**
 * Catch-all error handler. Translates errors with `status` and `body`
 * properties into JSON responses.
 */
export function errorHandler(): Middleware {
	return async (c, next) => {
		try {
			await next();
		} catch (err: any) {
			const status = err?.status ?? 500;
			const body = err?.body ?? {
				error: err?.message ?? "Internal Server Error",
			};
			return c.json(body, status as any);
		}
		return;
	};
}
