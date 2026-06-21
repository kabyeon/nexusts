/**
 * Config types — the contract for `nexus/config`.
 *
 * Configuration is loaded from environment variables (and optionally
 * `.env` files) and validated against a Zod schema at boot. Typed
 * access via `ConfigService.get('KEY')`.
 *
 * Mirrors `@nestjs/config` + `@adonisjs/config` but adds Zod-driven
 * validation and full type inference.
 */

import type { ZodTypeAny, z } from "zod";

/** A config schema. Use Zod's `z.object({...})`. */
export type ConfigSchema = ZodTypeAny;

/** Inferred TypeScript type from a schema. */
export type InferConfig<S extends ConfigSchema> = z.infer<S>;

/**
 * Optional `ConfigModule.forRoot` arguments.
 *
 * The schema is the source of truth: every env var the app reads
 * must be declared in the schema, or `config.get()` won't know about it.
 */
export interface ConfigOptions<S extends ConfigSchema = ConfigSchema> {
	/** Zod schema describing the expected config. */
	schema?: S;
	/**
	 * Additional config to merge in (e.g. from a static file). Values
	 * here are merged with env vars; env vars win on conflict.
	 */
	load?: Array<Record<string, unknown>>;
	/**
	 * Path(s) to dotenv files to load. Default: `['.env']`. Pass `[]` to
	 * disable file loading.
	 */
	envFilePaths?: string[];
	/**
	 * Whether to cache the parsed config. Default: `true`. Set `false`
	 * in tests so each `get()` re-reads the env.
	 */
	cache?: boolean;
	/**
	 * Whether to call `process.exit(1)` on schema validation failure.
	 * Default: `false` (throw instead). Production should set `true`
	 * so a misconfigured deploy fails fast.
	 */
	exitOnError?: boolean;
	/**
	 * Whether to expand missing keys to `undefined` (default) or throw.
	 * Default: `false` (return undefined for unknown keys).
	 */
	strict?: boolean;
}

/** Result of loading + validating config. */
export interface LoadedConfig<S extends ConfigSchema> {
	/** The parsed, fully-typed config object. */
	value: InferConfig<S>;
	/** Raw env object (for debugging). */
	raw: Record<string, string | undefined>;
	/** Validation errors (if any). Empty on success. */
	errors: string[];
}
