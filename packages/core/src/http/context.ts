/**
 * Framework context types.
 *
 * The HTTP layer is built on Hono, so the request handler receives a
 * Hono context (`c`) which exposes `c.req`, `c.res`, `c.json`, etc.
 *
 * The framework adds:
 * - `c.var.nexus` for framework-injected properties (current user,
 *   container snapshot for the request, etc.)
 * - `NexusResponse` helpers for streaming views and returning view
 *   objects in a uniform way.
 */
import type { Context as HonoContext, Next } from "hono";
import type { ApplicationContainer } from "../di/container.js";

export type NexusContext = HonoContext;
export type NexusNext = Next;

/** Framework-specific data attached to Hono's `c.var`. */
export interface NexusContextVar {
	/** Root container available during the request lifetime. */
	container: ApplicationContainer;
	/** Resolved authenticated user (filled by @Auth middleware). */
	user?: any;
	/** Per-request state bag. */
	state: Record<string, any>;
	/** Cached parsed body, validation result, etc. */
	cache: Map<string, any>;
}

/** Helper: typed access to `c.var.nexus`. */
export function getNexusVar(c: NexusContext): NexusContextVar {
	// Hono's `var` is open-ended; we cast to keep call sites clean.
	return (c as any).var.nexus as NexusContextVar;
}
