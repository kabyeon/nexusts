/**
 * `ScheduleService` — DI-friendly facade over a `ScheduleRegistry`.
 *
 * Mirrors the `@nestjs/schedule` API for familiarity. Controllers and
 * services can:
 *   - Inject this and call `addCron / addInterval / addTimeout` to
 *     schedule dynamically.
 *   - Inject this and call `list / get / pause / resume / delete` to
 *     introspect or mutate registered tasks.
 *
 * For static registration, use the `@Cron`, `@Interval`, `@Timeout`
 * decorators plus `ScheduleModule.scanForSchedulers(instance)`.
 */

import { Inject, Injectable } from '../core/decorators/index.js';
import type {
	ScheduleRegistry,
	ScheduleConfig,
	CronExpression,
	CronOptions,
	ScheduledTask,
	ScheduleHandler,
	ScheduleEvent,
	ScheduleEventListener,
} from './types.js';
import {
	MemorySchedulesBackend,
	CloudflareSchedulesBackend,
} from './backends/index.js';

@Injectable()
export class ScheduleService {
	/** DI token — use with `@Inject(ScheduleService.TOKEN)`. */
	static readonly TOKEN = Symbol.for('nexus:ScheduleService');

	readonly registry: ScheduleRegistry;
	#listeners = new Set<ScheduleEventListener>();
	#started = false;
	#memoryBackend: MemorySchedulesBackend | null = null;

	constructor(@Inject('SCHEDULE_CONFIG') private readonly config: ScheduleConfig = {}) {
		this.registry = this.#createBackend(config);
	}

	// ===========================================================================
	// Static-style API (used by @Cron / @Interval / @Timeout decorators)
	// ===========================================================================

	/**
	 * Schedule a cron task. Returns the assigned task id.
	 */
	addCron(
		expression: CronExpression,
		handler: ScheduleHandler,
		options: CronOptions & { name?: string } = {},
	): string {
		const name = options.name ?? `cron-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		return this.registry.addCron(name, expression, handler, options);
	}

	addInterval(milliseconds: number, handler: ScheduleHandler, name?: string): string {
		return this.registry.addInterval(name ?? `interval-${Date.now()}`, milliseconds, handler);
	}

	addTimeout(milliseconds: number, handler: ScheduleHandler, name?: string): string {
		return this.registry.addTimeout(name ?? `timeout-${Date.now()}`, milliseconds, handler);
	}

	// ===========================================================================
	// Introspection / mutation
	// ===========================================================================

	list(): ScheduledTask[] {
		return this.registry.list();
	}

	get(idOrName: string): ScheduledTask | undefined {
		return this.registry.get(idOrName);
	}

	pause(idOrName: string): boolean {
		return this.registry.pause(idOrName);
	}

	resume(idOrName: string): boolean {
		return this.registry.resume(idOrName);
	}

	delete(idOrName: string): boolean {
		return this.registry.delete(idOrName);
	}

	// ===========================================================================
	// Events
	// ===========================================================================

	on(listener: ScheduleEventListener): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	// ===========================================================================
	// Lifecycle
	// ===========================================================================

	/** Start the in-process scheduler tick. Idempotent. */
	start(): void {
		if (this.#started) return;
		this.#started = true;
		if (this.#memoryBackend) {
			this.#memoryBackend.start();
		}
		// Bridge backend events.
		this.registry.on((event) => this.#broadcast(event));
	}

	async stop(): Promise<void> {
		if (!this.#started) return;
		this.#started = false;
		await this.registry.stop();
	}

	/**
	 * Get the underlying in-process backend (for tests / `nx dev`).
	 * Returns null when the configured backend isn't memory.
	 */
	getMemoryBackend(): MemorySchedulesBackend | null {
		return this.#memoryBackend;
	}

	/**
	 * Get the underlying Cloudflare backend (for Workers). Returns
	 * null when the configured backend isn't Cloudflare.
	 */
	getCloudflareBackend(): CloudflareSchedulesBackend | null {
		return this.registry instanceof CloudflareSchedulesBackend ? this.registry : null;
	}

	// ===========================================================================
	// Internal
	// ===========================================================================

	#createBackend(config: ScheduleConfig): ScheduleRegistry {
		switch (config.backend ?? 'memory') {
			case 'memory': {
				const backend = new MemorySchedulesBackend({
					tickMs: config.memory?.tickMs ?? 1000,
					maxDriftMs: config.memory?.maxDriftMs,
					defaultTimezone: config.defaultTimezone,
				});
				this.#memoryBackend = backend;
				return backend;
			}
			case 'cloudflare':
				return new CloudflareSchedulesBackend();
		}
	}

	#broadcast(event: ScheduleEvent): void {
		for (const l of this.#listeners) {
			void Promise.resolve(l(event));
		}
	}
}