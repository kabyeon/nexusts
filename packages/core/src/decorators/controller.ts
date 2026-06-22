/**
 * @Controller decorator.
 *
 * Marks a class as a controller and registers a route prefix.
 * Routes inside the controller class are decorated with @Get/@Post/etc.
 *
 * @example
 * ```ts
 * @Controller('/users')
 * class UserController {
 *   @Get('/')
 *   list() { ... }
 * }
 * ```
 */
import "reflect-metadata";
import { METADATA_KEY } from "../constants.js";
import type { ControllerMetadata } from "../di/tokens.js";

export function Controller(prefix: string = "/"): ClassDecorator {
	return (target: object) => {
		const normalized = normalizePrefix(prefix);
		const meta: ControllerMetadata = { prefix: normalized };
		Reflect.defineMetadata(METADATA_KEY.CONTROLLER, meta, target);
	};
}

export function getControllerMetadata(target: any): ControllerMetadata {
	return (
		Reflect.getMetadata(METADATA_KEY.CONTROLLER, target) ?? { prefix: "/" }
	);
}

export function isController(target: any): boolean {
	return Reflect.hasMetadata(METADATA_KEY.CONTROLLER, target);
}

/**
 * Normalize a prefix so we can safely concatenate it with handler paths.
 * - Empty string becomes '/'.
 * - Trailing slashes are trimmed (we re-add them on the join).
 * - No leading slash is added; the router always joins with `/`.
 */
function normalizePrefix(prefix: string): string {
	if (!prefix) return "";
	if (prefix !== "/" && prefix.endsWith("/")) {
		return prefix.slice(0, -1);
	}
	return prefix;
}
