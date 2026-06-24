/**
 * Built-in transports.
 *
 * - **PinoTransport** — JSON output via `pino` (production).
 * - **PrettyTransport** — colorized via `pino-pretty` (development).
 *
 * Both wrap the pino API and feed records into the same write loop,
 * so switching is one config flag.
 */

import type { LogLevel, LogRecord, LogTransport } from "../types.js";

interface PinoLike {
	level: string;
	info: (obj: object, msg?: string) => void;
	warn: (obj: object, msg?: string) => void;
	error: (obj: object, msg?: string) => void;
	debug: (obj: object, msg?: string) => void;
	trace: (obj: object, msg?: string) => void;
	fatal: (obj: object, msg?: string) => void;
	flush?: () => void;
}

let pinoSingleton: PinoLike | null = null;
let prettySingleton: PinoLike | null = null;

async function loadPino(
	pretty: boolean,
	level: LogLevel,
	base?: Record<string, unknown>,
): Promise<PinoLike> {
	const pinoMod = await import("pino");
	const pino = pinoMod.default ?? pinoMod;
	if (pretty) {
		if (prettySingleton) return prettySingleton;
		// Try to use pino-pretty for colorized output (optional peer dep).
		const opts: Record<string, unknown> = {
			level,
			base,
			errorKey: "error",
			timestamp: () => `,"time":"${new Date().toISOString()}"`,
		};
		try {
			const prettyMod = (await import("pino-pretty")) as {
				default?: (opts: unknown) => unknown;
			};
			const transport = prettyMod.default ?? prettyMod;
			if (typeof transport === "function") {
				opts.transport = transport({
					translateTime: "HH:MM:ss.l",
					ignore: "pid,hostname",
					colorize: true,
				});
			}
		} catch {
			// pino-pretty not installed — use pino's built-in pretty mode
		}
		prettySingleton = (pino as unknown as (opts: unknown) => PinoLike)(opts);
		return prettySingleton;
	}
	if (pinoSingleton) return pinoSingleton;
	pinoSingleton = (pino as unknown as (opts: unknown) => PinoLike)({
		level,
		base,
		timestamp: () => `,"time":"${new Date().toISOString()}"`,
	});
	return pinoSingleton;
}

/** JSON transport via pino. */
export class PinoTransport implements LogTransport {
	readonly name = "pino";
	readonly isDefault = true;
	#pino: PinoLike | null = null;
	#ready: Promise<void>;

	constructor(level: LogLevel, base?: Record<string, unknown>) {
		this.#ready = loadPino(false, level, base).then((p) => {
			this.#pino = p;
		});
	}

	async ready(): Promise<void> {
		await this.#ready;
	}

	write(record: LogRecord): void {
		if (!this.#pino) return;
		const { level, time, msg, ...rest } = record;
		const obj = { time, ...rest };
		switch (level) {
			case "trace":
				this.#pino.trace(obj, msg);
				break;
			case "debug":
				this.#pino.debug(obj, msg);
				break;
			case "info":
				this.#pino.info(obj, msg);
				break;
			case "warn":
				this.#pino.warn(obj, msg);
				break;
			case "error":
				this.#pino.error(obj, msg);
				break;
			case "fatal":
				this.#pino.fatal(obj, msg);
				break;
		}
	}
}

/** Pretty-print transport via pino-pretty (development). */
export class PrettyTransport implements LogTransport {
	readonly name = "pretty";
	readonly isDefault = true;
	#pino: PinoLike | null = null;
	#ready: Promise<void>;

	constructor(level: LogLevel, base?: Record<string, unknown>) {
		this.#ready = loadPino(true, level, base).then((p) => {
			this.#pino = p;
		});
	}

	async ready(): Promise<void> {
		await this.#ready;
	}

	write(record: LogRecord): void {
		if (!this.#pino) return;
		const { level, time, msg, ...rest } = record;
		const obj = { time, ...rest };
		switch (level) {
			case "trace":
				this.#pino.trace(obj, msg);
				break;
			case "debug":
				this.#pino.debug(obj, msg);
				break;
			case "info":
				this.#pino.info(obj, msg);
				break;
			case "warn":
				this.#pino.warn(obj, msg);
				break;
			case "error":
				this.#pino.error(obj, msg);
				break;
			case "fatal":
				this.#pino.fatal(obj, msg);
				break;
		}
	}
}

/** Null transport — drops everything. For tests. */
export class NullTransport implements LogTransport {
	readonly name = "null";
	readonly isDefault = false;
	write(_record: LogRecord): void {
		// discard
	}
}
