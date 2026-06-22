/**
 * Health check types — the contract for `nexusjs/health`.
 *
 * Mirrors `@nestjs/terminus` and `@adonisjs/health`. Three check
 * kinds:
 *
 *   - **Liveness** — am I alive? Used by Kubernetes to decide when
 *     to restart the pod. Should be a fast, in-process check.
 *
 *   - **Readiness** — am I ready to serve traffic? Used by load
 *     balancers and K8s to decide when to send requests. May include
 *     DB / cache pings.
 *
 *   - **Startup** — has my initialization finished? Used by K8s to
 *     gate deployment rollouts.
 *
 * Each check returns a `HealthIndicatorResult`. `status: 'up'` means
 * the check passed; `down` means it failed (the indicator's data
 * carries the error message).
 */

export type HealthStatus = "up" | "down";

export interface HealthIndicatorResult<T = unknown> {
	/** Whether the check passed. */
	status: HealthStatus;
	/** Optional data attached to the check (e.g. ping latency). */
	data?: T;
	/** Error message when status is 'down'. */
	message?: string;
}

/**
 * A single health indicator. Indicators are usually singletons that
 * wrap a connection (DB, cache, HTTP API). The `check()` method
 * performs a fast liveness probe.
 *
 *   class DbHealthIndicator extends HealthIndicator {
 *     name = 'database';
 *     async check() {
 *       await this.db.ping();
 *       return { status: 'up' };
 *     }
 *   }
 */
export abstract class HealthIndicator {
	abstract readonly name: string;
	abstract check(): Promise<HealthIndicatorResult>;
}

/** Result of one check plus its indicator name. */
export interface HealthCheckEntry {
	name: string;
	result: HealthIndicatorResult;
}

/** Result of `HealthCheckService.check([...])`. */
export interface HealthCheckResult {
	/** Aggregate status. `'up'` iff every indicator returned `'up'`. */
	status: HealthStatus;
	/** Per-indicator results. */
	results: HealthCheckEntry[];
	/** Total wall-clock time (ms). */
	durationMs: number;
	/** ISO timestamp. */
	timestamp: string;
}

/** Which kind of check we're running. */
export type HealthCheckKind = "liveness" | "readiness" | "startup";

/** Configuration for the HealthModule. */
export interface HealthConfig {
	/**
	 * Path for the liveness probe. Default: `/health/live`.
	 * Set to null to disable.
	 */
	livenessPath?: string | null;
	/**
	 * Path for the readiness probe. Default: `/health/ready`.
	 */
	readinessPath?: string | null;
	/**
	 * Path for the startup probe. Default: `/health/startup`.
	 */
	startupPath?: string | null;
	/**
	 * Optional token to gate the health endpoints. When set, requests
	 * must include `Authorization: Bearer <token>`. Useful for
	 * protecting internal health endpoints from public exposure.
	 */
	authToken?: string;
	/**
	 * Built-in indicators to register automatically. Currently
	 * supports 'memory' (heap pressure). 'disk' and 'http' require
	 * additional config (see config docs).
	 */
	builtIn?: {
		memory?: boolean | { threshold?: number /* heap pressure 0-1 */ };
		disk?: { threshold?: number /* fraction free, e.g. 0.1 */; path?: string };
		http?: { url: string; timeoutMs?: number };
	};
}
