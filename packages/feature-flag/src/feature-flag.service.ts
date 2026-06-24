/**
 * `FeatureFlagService` — isEnabled / setFlag / getFlag + decorator wiring.
 *
 *   const flags = new FeatureFlagService({
 *     flags: {
 *       'new-ui':   { enabled: true,  rollout: 0.5 },
 *       'beta-api': { enabled: false },
 *     },
 *   });
 *
 *   await flags.isEnabled('new-ui', { userId: 'u1' }); // true or false by hash
 */
import { Inject, Injectable } from "@nexusts/core";
import type { FlagContext, FlagDefinition, FeatureFlagBackend, FeatureFlagConfig } from "./types.js";
import { MemoryFlagBackend } from "./backends/memory.js";
import { getFlagSpecs } from "./decorators/feature-flag.decorator.js";

@Injectable()
export class FeatureFlagService {
	/** DI token. */
	static readonly TOKEN = Symbol.for("nexus:FeatureFlagService");

	#backend: FeatureFlagBackend;

	constructor(@Inject("FEATURE_FLAG_CONFIG") config: FeatureFlagConfig = {}) {
		this.#backend = new MemoryFlagBackend(config.flags ?? {});
	}

	/** Returns `true` if the flag is enabled for the given context. */
	async isEnabled(flagName: string, context?: FlagContext): Promise<boolean> {
		return this.#backend.isEnabled(flagName, context);
	}

	/** Create or update a flag at runtime. */
	setFlag(flagName: string, definition: FlagDefinition | boolean): void {
		this.#backend.setFlag(flagName, definition);
	}

	/** Return the raw definition (or `undefined` if unknown). */
	getFlag(flagName: string): FlagDefinition | undefined {
		return this.#backend.getFlag(flagName);
	}

	/**
	 * Wire `@FeatureFlag` decorators onto a controller or service instance.
	 * Each decorated route handler is wrapped so it returns a 404 JSON
	 * response when the flag is disabled.
	 *
	 * The DI container calls this automatically when FeatureFlagModule is
	 * imported; you can also call it manually in tests.
	 */
	applyDecorators(target: any): void {
		const specs = getFlagSpecs(target.constructor);
		for (const spec of specs) {
			const original = spec.original;
			(target as any)[spec.propertyKey] = async (c: any, ...rest: any[]) => {
				const ctx = spec.contextFn ? spec.contextFn(c) : undefined;
				const enabled = await this.isEnabled(spec.flagName, ctx);
				if (!enabled) {
					if (spec.onDisabled) return spec.onDisabled(c);
					return c.json({ message: "Feature not available", code: "FEATURE_DISABLED" }, 404);
				}
				return original.apply(target, [c, ...rest]);
			};
		}
	}
}
