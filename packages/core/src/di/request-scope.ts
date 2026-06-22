/**
 * `RequestScope` — per-request DI lifetime via `AsyncLocalStorage`.
 *
 * Usage from a controller:
 *
 *   @Get('/')
 *   index(@Inject(REQUEST) req: any, @Inject(RequestContext) ctx: MyCtx) {
 *     return { requestId: ctx.requestId };
 *   }
 *
 * Usage from anywhere (e.g. a service deeper in the call tree):
 *
 *   import { getRequest, getRequestScope } from 'nexusjs/core';
 *
 *   function audit() {
 *     const req = getRequest();
 *     const scope = getRequestScope();
 *     // ... read user, request id, etc.
 *   }
 *
 * Implementation: a single `AsyncLocalStorage` slot per request. The
 * HTTP server middleware enters a new context at request start, and
 * the DI container checks for an active context when resolving
 * `scope: 'request'` providers.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { DIContainer } from "./container.js";

/** The Hono context type. Kept loose to avoid a circular import. */
export type HonoContext = any;

/**
 * Per-request state. Created by the HTTP middleware, lives for the
 * duration of a single request, and is propagated through the entire
 * async call tree via `AsyncLocalStorage`.
 */
export interface RequestScope {
	/** Unique id for this request. Useful for log correlation. */
	readonly id: string;
	/** The Hono context (c). */
	context: HonoContext;
	/** A per-request DI container (singleton container + this scope). */
	container: DIContainer;
	/** User-extensible state bag. Modules can stash request-scoped data here. */
	state: Map<string | symbol, unknown>;
}

/** Symbol token: inject the active Hono context. */
export const REQUEST = Symbol.for("nexus:REQUEST");

/** Symbol token: inject the entire RequestScope. */
export const REQUEST_SCOPE = Symbol.for("nexus:REQUEST_SCOPE");

/** Generate a short, log-friendly id. */
function newRequestId(): string {
	return randomUUID().slice(0, 8);
}

const storage = new AsyncLocalStorage<RequestScope>();

/** Internal: read/write access to the AsyncLocalStorage slot. */
export const RequestScopeStorage = {
	/** Get the current scope, or `undefined` if not inside a request. */
	get(): RequestScope | undefined {
		return storage.getStore();
	},
	/**
	 * Run `fn` inside a new request scope. The scope is propagated
	 * through the async call tree.
	 */
	run<T>(scope: RequestScope, fn: () => T | Promise<T>): T | Promise<T> {
		return storage.run(scope, fn);
	},
	/**
	 * Create a new scope. Used by the HTTP middleware.
	 */
	create(context: HonoContext, container: DIContainer): RequestScope {
		return {
			id: newRequestId(),
			context,
			container,
			state: new Map(),
		};
	},
};

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Get the active Hono context, or `undefined` if not in a request. */
export function getRequest<T = HonoContext>(): T | undefined {
	return storage.getStore()?.context as T | undefined;
}

/** Get the active RequestScope, or `undefined`. */
export function getRequestScope(): RequestScope | undefined {
	return storage.getStore();
}

/** Get a piece of request-scoped state by key. */
export function getRequestState<T = unknown>(key: string | symbol): T | undefined {
	return storage.getStore()?.state.get(key) as T | undefined;
}

/** Set a piece of request-scoped state. */
export function setRequestState(key: string | symbol, value: unknown): void {
	const s = storage.getStore();
	if (s) s.state.set(key, value);
}
