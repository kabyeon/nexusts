/**
 * `@Query(name?)` / `@Mutation(name?)` / `@Subscription(name?)`
 *
 * Method decorators that mark a resolver method as a GraphQL operation.
 * The optional `name` argument overrides the field name in the schema
 * (defaults to the method name).
 *
 *   @Resolver("User")
 *   class UserResolver {
 *     @Query("currentUser")
 *     me() { return ctx.state.user; }
 *
 *     @Mutation()
 *     updateProfile(@Arg("name") name: string) { ... }
 *
 *     @Subscription()
 *     events() { return pubsub.asyncIterator("EVENTS"); }
 *   }
 */
import "reflect-metadata";
import { pushResolverField, getResolverTypeName } from "./resolver.js";
import type { ResolverClassRecord } from "../types.js";

type OperationKind = "query" | "mutation" | "subscription";

/**
 * Common implementation. `decorator` is a factory the user calls as
 * `@Query(...)` / `@Mutation(...)` etc. We can't share one decorator
 * across kinds because we want per-kind runtime behavior to be
 * identical — only the discriminator string differs.
 */
function makeOperationDecorator(kind: OperationKind) {
	return function (name?: string) {
		return (
			target: object,
			propertyKey: string | symbol,
			descriptor: TypedPropertyDescriptor<any>,
		): void => {
			const meta = parseMethodType(descriptor.value);
			pushResolverField(target, {
				propertyKey: String(propertyKey),
				kind,
				name: name ?? String(propertyKey),
				returnTypeName: meta.returnTypeName,
				args: meta.args,
			});
		};
	};
}

/** Reflect on a method's parameter list to extract `@Arg` names. */
function parseMethodType(fn: Function): {
	returnTypeName: string;
	args: Array<{ name: string; type: string; defaultValue?: unknown }>;
} {
	// We can't read parameter names at runtime in vanilla JS without
	// extra tooling (the TypeScript metadata API exposes types but
	// not parameter names). Convention: methods accept a single
	// `args` object whose keys are the GraphQL field arguments.
	//
	// For finer control, the user can call `@Arg("name")` on
	// individual parameters (see `./arg.js`). The names are then
	// gathered by `@Arg` and merged at scan time.
	const fnName = fn.name || "unknown";
	return {
		returnTypeName: "JSON", // SDL "JSON" scalar until a more specific
								// type system is wired in.
		args: [],
	};
}

export const Query = makeOperationDecorator("query");
export const Mutation = makeOperationDecorator("mutation");
export const Subscription = makeOperationDecorator("subscription");

/** Public helper for the scanner. */
export type AnyField = ResolverClassRecord["fields"][number];
