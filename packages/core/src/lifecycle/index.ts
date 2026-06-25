/**
 * Lifecycle hooks interfaces for services and controllers.
 *
 * Implement these interfaces to hook into the application lifecycle.
 * The framework calls these hooks at the appropriate times during
 * application bootstrap and shutdown.
 *
 * @example
 * ```ts
 * import { Injectable, OnModuleInit, OnModuleDestroy } from "@nexusts/core";
 *
 * @Injectable()
 * class DatabaseService implements OnModuleInit, OnModuleDestroy {
 *   async onModuleInit() {
 *     await this.pool.connect();
 *     console.log("Database connected");
 *   }
 *
 *   async onModuleDestroy() {
 *     await this.pool.end();
 *     console.log("Database disconnected");
 *   }
 * }
 * ```
 */

/**
 * Hook called after the service/controller is instantiated and all
 * dependencies are injected (but BEFORE the HTTP server starts).
 *
 * Use for: connecting to databases, loading config, warming caches,
 * subscribing to message queues.
 */
export interface OnModuleInit {
	onModuleInit(): Promise<void> | void;
}

/**
 * Hook called AFTER all modules have been initialized and the HTTP
 * server is about to start.
 *
 * Use for: final validation, health-check registration, logging
 * startup banner.
 */
export interface OnApplicationInit {
	onApplicationInit(): Promise<void> | void;
}

/**
 * Hook called when the module/application is being shut down
 * (after the HTTP server stops).
 *
 * Use for: closing database connections, flushing logs, cleanup.
 */
export interface OnModuleDestroy {
	onModuleDestroy(): Promise<void> | void;
}

/**
 * Hook called at the very START of the shutdown process, before
 * the HTTP server is closed.
 *
 * Use for: draining connections, sending "going away" notifications,
 * saving in-memory state.
 */
export interface BeforeApplicationDestroy {
	beforeApplicationDestroy(signal?: string): Promise<void> | void;
}

/**
 * Hook called at the very END of the shutdown process, after
 * the HTTP server is closed and all modules are destroyed.
 *
 * Use for: final logging, metrics flush.
 */
export interface OnApplicationDestroy {
	onApplicationDestroy(signal?: string): Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function hasOnModuleInit(obj: unknown): obj is OnModuleInit {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"onModuleInit" in obj &&
		typeof (obj as OnModuleInit).onModuleInit === "function"
	);
}

export function hasOnApplicationInit(obj: unknown): obj is OnApplicationInit {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"onApplicationInit" in obj &&
		typeof (obj as OnApplicationInit).onApplicationInit === "function"
	);
}

export function hasOnModuleDestroy(obj: unknown): obj is OnModuleDestroy {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"onModuleDestroy" in obj &&
		typeof (obj as OnModuleDestroy).onModuleDestroy === "function"
	);
}

export function hasBeforeApplicationDestroy(
	obj: unknown,
): obj is BeforeApplicationDestroy {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"beforeApplicationDestroy" in obj &&
		typeof (obj as BeforeApplicationDestroy).beforeApplicationDestroy ===
			"function"
	);
}

export function hasOnApplicationDestroy(
	obj: unknown,
): obj is OnApplicationDestroy {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"onApplicationDestroy" in obj &&
		typeof (obj as OnApplicationDestroy).onApplicationDestroy === "function"
	);
}

// ---------------------------------------------------------------------------
// Safe callers
// ---------------------------------------------------------------------------

export async function callOnModuleInit(obj: unknown): Promise<void> {
	if (hasOnModuleInit(obj)) await obj.onModuleInit();
}

export async function callOnApplicationInit(obj: unknown): Promise<void> {
	if (hasOnApplicationInit(obj)) await obj.onApplicationInit();
}

export async function callOnModuleDestroy(obj: unknown): Promise<void> {
	if (hasOnModuleDestroy(obj)) await obj.onModuleDestroy();
}

export async function callBeforeApplicationDestroy(
	obj: unknown,
	signal?: string,
): Promise<void> {
	if (hasBeforeApplicationDestroy(obj))
		await obj.beforeApplicationDestroy(signal);
}

export async function callOnApplicationDestroy(
	obj: unknown,
	signal?: string,
): Promise<void> {
	if (hasOnApplicationDestroy(obj)) await obj.onApplicationDestroy(signal);
}
