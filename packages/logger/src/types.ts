/**
 * Logger types — the contract for `nexusjs/logger`.
 *
 * Mirrors `@adonisjs/logger` + NestJS's built-in Logger. One logger
 * class, two transports:
 *
 *   - **Pino** (production default) — JSON output, fast
 *   - **Pretty** (development) — colorized, human-readable
 *
 * Logs are request-scoped via AsyncLocalStorage: any `logger.info(...)`
 * inside a request automatically includes `requestId`, `userId`,
 * `tenantId` if those have been set.
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/** A single log record (Pino-compatible shape). */
export interface LogRecord {
	level: LogLevel;
	time: number;
	msg: string;
	[key: string]: unknown;
}

/** Transport: receives every record, writes it somewhere. */
export interface LogTransport {
	/** Display name. */
	readonly name: string;
	/** Whether this transport is the active default. */
	readonly isDefault?: boolean;
	/** Write a record. Must be sync; queue async work internally. */
	write(record: LogRecord): void;
}

/** Configuration for the LoggerModule. */
export interface LoggerOptions {
	/** Minimum level to emit. Default: `'info'` in production, `'debug'` in dev. */
	level?: LogLevel;
	/** Pretty-print (dev mode). Default: `NODE_ENV !== 'production'`. */
	pretty?: boolean;
	/**
	 * Custom transports. The first one with `isDefault: true` (or the
	 * first one if none is default) is used as the active transport.
	 */
	transports?: LogTransport[];
	/**
	 * Static fields attached to every record (e.g. service name).
	 */
	base?: Record<string, unknown>;
	/**
	 * Disable all logging. Useful in tests.
	 */
	silent?: boolean;
}

/** Per-request context (AsyncLocalStorage value). */
export interface LogContext {
	requestId?: string;
	userId?: string;
	tenantId?: string;
	[key: string]: unknown;
}
