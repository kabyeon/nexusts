/**
 * @Validate decorator.
 *
 * Attaches Zod schemas (or class validators) to a route handler. Each
 * schema is run against the corresponding request part before the handler
 * executes; failed validation throws or returns a 400 response.
 *
 * @example
 * ```ts
 * const UserSchema = z.object({ name: z.string(), email: z.email() });
 *
 * @Post('/')
 * @Validate({ body: UserSchema })
 * create(@Body() body: z.infer<typeof UserSchema>) { ... }
 * ```
 */
import "reflect-metadata";
import { METADATA_KEY } from "../constants.js";
import type { ValidationMetadata } from "../di/tokens.js";

export function Validate(options: ValidationMetadata): MethodDecorator {
	return (
		target: object,
		propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	) => {
		Reflect.defineMetadata(
			METADATA_KEY.VALIDATE,
			options,
			target.constructor,
			propertyKey,
		);
	};
}

export function getValidationMetadata(
	target: any,
	propertyKey: string | symbol,
): ValidationMetadata | undefined {
	return Reflect.getMetadata(METADATA_KEY.VALIDATE, target, propertyKey);
}
