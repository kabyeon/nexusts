/**
 * Runtime detection & helper for `nexusjs/ws`.
 */

export type WsRuntime = "bun" | "node" | "cloudflare" | "unknown";

/**
 * Detect the current JavaScript runtime.
 *
 *  - `bun`        — Bun (native `Bun.serve` WebSocket)
 *  - `node`       — Node.js (uses the `ws` package)
 *  - `cloudflare` — Cloudflare Workers / Pages (Durable Objects only)
 *  - `unknown`    — fall-through; no adapter auto-installed
 */
export function detectRuntime(): WsRuntime {
	if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined") return "bun";
	if (typeof process !== "undefined" && process.versions?.node) return "node";
	// Cloudflare: `caches` global + absence of `process.versions.node` is a strong signal.
	if (
		typeof (globalThis as { caches?: unknown }).caches !== "undefined" &&
		typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== "undefined"
	) {
		return "cloudflare";
	}
	return "unknown";
}
