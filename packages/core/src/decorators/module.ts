/**
 * @Module decorator.
 *
 * Marks a class as a Nest-style module: a logical grouping of
 * controllers and providers with explicit imports/exports.
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [UserModule],
 *   controllers: [UserController],
 *   providers: [UserService],
 *   exports: [UserService],
 * })
 * class AppModule {}
 * ```
 */
import "reflect-metadata";
import { METADATA_KEY } from "../constants.js";
import type { ModuleOptions, Type } from "../di/tokens.js";

export function Module(options: ModuleOptions = {}): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(METADATA_KEY.MODULE, options, target);
	};
}

/** Read the @Module options from a class. */
export function getModuleOptions(target: Type<any>): ModuleOptions {
	return Reflect.getMetadata(METADATA_KEY.MODULE, target) ?? {};
}
