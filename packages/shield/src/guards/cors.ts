/**
 * CORS guard — handles preflight and sets Access-Control-* headers
 * on every response according to the configured policy.
 */
import type { CorsConfig } from "../types.js";

export class CorsGuard {
	constructor(private config: CorsConfig) {}

	/**
	 * Resolve the `Access-Control-Allow-Origin` value for a given
	 * request origin. Returns `null` when the origin is not allowed.
	 */
	resolveOrigin(requestOrigin: string): string | null {
		const { origin = "*" } = this.config;
		if (origin === "*") return "*";
		if (typeof origin === "string")
			return requestOrigin === origin ? origin : null;
		if (Array.isArray(origin))
			return origin.includes(requestOrigin) ? requestOrigin : null;
		if (typeof origin === "function") {
			const result = origin(requestOrigin);
			if (result === true) return requestOrigin;
			if (typeof result === "string") return result;
			return null;
		}
		return null;
	}

	/** Apply CORS response headers (non-preflight). */
	applyHeaders(headers: Headers, requestOrigin: string): void {
		const resolved = this.resolveOrigin(requestOrigin);
		if (!resolved) return;
		headers.set("Access-Control-Allow-Origin", resolved);
		if (this.config.credentials) {
			headers.set("Access-Control-Allow-Credentials", "true");
		}
		if (this.config.exposedHeaders?.length) {
			headers.set(
				"Access-Control-Expose-Headers",
				this.config.exposedHeaders.join(", "),
			);
		}
		if (resolved !== "*") {
			// Vary so caches don't conflate responses for different origins.
			headers.append("Vary", "Origin");
		}
	}

	/** Apply preflight response headers. Returns false if origin is not allowed. */
	applyPreflightHeaders(headers: Headers, requestOrigin: string): boolean {
		const resolved = this.resolveOrigin(requestOrigin);
		if (!resolved) return false;
		headers.set("Access-Control-Allow-Origin", resolved);
		const methods = (
			this.config.methods ?? ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
		).join(", ");
		headers.set("Access-Control-Allow-Methods", methods);
		if (this.config.allowedHeaders?.length) {
			headers.set(
				"Access-Control-Allow-Headers",
				this.config.allowedHeaders.join(", "),
			);
		}
		if (this.config.credentials) {
			headers.set("Access-Control-Allow-Credentials", "true");
		}
		if (this.config.maxAge !== undefined) {
			headers.set("Access-Control-Max-Age", String(this.config.maxAge));
		}
		if (resolved !== "*") {
			headers.append("Vary", "Origin");
		}
		return true;
	}

	/** Hono middleware — handles preflight (OPTIONS) and annotates responses. */
	middleware() {
		return async (c: any, next: () => Promise<any>) => {
			const requestOrigin = (c.req.header("origin") as string) ?? "";
			const method = (c.req.method as string).toUpperCase();

			// Preflight: OPTIONS + Access-Control-Request-Method
			if (method === "OPTIONS" && c.req.header("access-control-request-method")) {
				const headers = new Headers();
				const allowed = this.applyPreflightHeaders(headers, requestOrigin);
				return new Response(null, { status: allowed ? 204 : 403, headers });
			}

			// Regular request: apply CORS headers before the handler.
			this.applyHeaders(c.res.headers as Headers, requestOrigin);
			return next();
		};
	}
}
