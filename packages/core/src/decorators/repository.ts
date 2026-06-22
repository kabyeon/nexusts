/**
 * @Repository decorator.
 *
 * Marks a class as a Spring-style repository. Repositories are normal
 * `@Injectable()` classes; the decorator is a marker so the framework
 * can register them with a database adapter (Drizzle/Prisma) and emit
 * a friendly error if you forget to wire one.
 *
 * @example
 * ```ts
 * @Repository()
 * class UserRepository {
 *   findAll() { return db.select().from(users); }
 * }
 * ```
 */
import "reflect-metadata";
import { METADATA_KEY } from "../constants.js";
import type { InjectionToken } from "../di/tokens.js";

export function Repository(entityToken?: InjectionToken<any>): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(
			METADATA_KEY.REPOSITORY,
			{ entity: entityToken },
			target,
		);
		Reflect.defineMetadata(METADATA_KEY.INJECTABLE, true, target);
	};
}

export function getRepositoryMetadata(
	target: any,
): { entity?: InjectionToken<any> } | undefined {
	return Reflect.getMetadata(METADATA_KEY.REPOSITORY, target);
}

export function isRepository(target: any): boolean {
	return Reflect.hasMetadata(METADATA_KEY.REPOSITORY, target);
}
