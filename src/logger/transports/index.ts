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

async function loadPino(pretty: boolean, level: LogLevel, base?: Record<string, unknown>): Promise<PinoLike> {
	const pinoMod = await import("pino");
	const pino = pinoMod.default ?? pinoMod;
	if (pretty) {
		if (prettySingleton) return prettySingleton;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const opts: any = {
			level,
			base,
			errorKey: "error",
			translateTime: "HH:MM:ss.l",
			ignore: "pid,hostname",
			colorize: true,
		};
		// Try to use pino-pretty if installed.
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const prettyMod = (globalThis as { require?: (id: string) => unknown }).require?.("pino-pretty") as
				| ((opts: unknown) => unknown)
				| undefined;
			if (prettyMod) {
				prettySingleton = (pino as unknown as (opts: unknown) => PinoLike)(opts);
				return prettySingleton;
			}
		} catch {
			// fall through
		}
		prettySingleton = (pino as unknown as (opts: unknown) => PinoLike)({
			level,
			base,
			timestamp: () => `,"time":"${new Date().toISOString()}"`,
		});
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
		if (!this.#pino) {
			// Fall back to stdout until pino is loaded.
			console.log(JSON.stringify(record));
			return;
		}
		const { level, time, msg, ...rest } = record;
		const obj = { time, ...rest };
		switch (level) {
			case "trace": this.#pino.trace(obj, msg); break;
			case "debug": this.#pino.debug(obj, msg); break;
			case "info": this.#pino.info(obj, msg); break;
			case "warn": this.#pino.warn(obj, msg); break;
			case "error": this.#pino.error(obj, msg); break;
			case "fatal": this.#pino.fatal(obj, msg); break;
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
		if (!this.#pino) {
			// eslint-disable-next-line no-console
			console.log(`[${record.level}] ${record.msg}`, record);
			return;
		}
		const { level, time, msg, ...rest } = record;
		const obj = { time, ...rest };
		switch (level) {
			case "trace": this.#pino.trace(obj, msg); break;
			case "debug": this.#pino.debug(obj, msg); break;
			case "info": this.#pino.info(obj, msg); break;
			case "warn": this.#pino.warn(obj, msg); break;
			case "error": this.#pino.error(obj, msg); break;
			case "fatal": this.#pino.fatal(obj, msg); break;
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