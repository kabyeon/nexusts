import "reflect-metadata";
import type { FlagContext } from "../types.js";

const FLAG_META = Symbol.for("nexus:FeatureFlag");

export interface FeatureFlagOptions {
	/** Extract a `FlagContext` from the Hono `Context` object (first arg of the handler). */
	contextFn?: (c: any) => FlagContext;
	/** Custom response when the flag is disabled. Defaults to 404 JSON. */
	onDisabled?: (c: any) => Response | Promise<Response>;
}

export interface FlagSpec {
	propertyKey: string | symbol;
	flagName: string;
	contextFn?: (c: any) => FlagContext;
	onDisabled?: (c: any) => Response | Promise<Response>;
	original: (...args: any[]) => any;
}

/**
 * Mark a route handler so `FeatureFlagService.applyDecorators()` will gate it.
 *
 *   @Get('/')
 *   @FeatureFlag('new-dashboard')
 *   async index(c: Context) { ... }
 *
 * When the flag is disabled the handler returns a 404 JSON response.
 * Pass `onDisabled` to customise the response, or `contextFn` to extract
 * a `FlagContext` (userId etc.) from the Hono `Context`.
 */
export function FeatureFlag(
	flagName: string,
	options: FeatureFlagOptions = {},
): MethodDecorator {
	return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
		const specs: FlagSpec[] = Reflect.getMetadata(FLAG_META, target.constructor) ?? [];
		specs.push({
			propertyKey,
			flagName,
			contextFn: options.contextFn,
			onDisabled: options.onDisabled,
			original: descriptor.value,
		});
		Reflect.defineMetadata(FLAG_META, specs, target.constructor);
	};
}

export function getFlagSpecs(target: any): FlagSpec[] {
	return Reflect.getMetadata(FLAG_META, target) ?? [];
}
