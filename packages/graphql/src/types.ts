/**
 * `nexusjs/graphql` — code-first GraphQL via Bun-native executor.
 *
 * Public types and interfaces. The framework exposes a minimal but
 * complete GraphQL surface (queries, mutations, subscriptions,
 * SDL-first or code-first via class decorators, and a Hono-native
 * `/graphql` endpoint with introspection).
 */

import type { Context } from "hono";

/** Anything that can be passed as a resolver argument. */
export type ResolverArgValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| object
	| bigint
	| symbol;

/**
 * Standard resolver signature. Mirrors graphql-js's 4-tuple form
 * with the same names: `(parent, args, context, info)`.
 *
 * The `TArgs` generic defaults to `Record<string, any>` so a resolver
 * can type its arguments explicitly. Without the generic, TS would
 * narrow the runtime's `args: Record<string, any>` against the
 * function's declared `{ name: string }` and complain.
 */
export type ResolverFn<TResult = unknown, TArgs = Record<string, any>, TParent = any> = (
	parent: TParent,
	args: TArgs,
	context: GraphQLContext,
	info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** What a controller method decorated with `@Query`/`@Mutation` actually is. */
export type FieldResolver<TResult = unknown, TArgs = Record<string, any>, TParent = any> = ResolverFn<TResult, TArgs, TParent>;

/** The full GraphQL execution context exposed to resolvers. */
export interface GraphQLContext {
	/** The Hono context for the inbound request. */
	hono: Context;
	/** Application-provided per-request data (auth user, db tx, ...). */
	state: Record<string, any>;
}

/** A tiny stand-in for graphql-js's `GraphQLResolveInfo` — covers
 *  the field name and the parent type name, which is all a
 *  resolver typically needs. */
export interface GraphQLResolveInfo {
	fieldName: string;
	fieldNodes: ReadonlyArray<{ kind: string; name: { value: string } }>;
	parentType: { name: string; toString(): string };
	path: { key: string | number; typename: string | null | undefined }[];
	returnType: { toString(): string };
	schema: unknown;
	operation: { kind: "query" | "mutation" | "subscription" };
}

/** Where to mount the GraphQL endpoint. Default: POST /graphql. */
export interface GraphQLEndpoint {
	/** Single endpoint that handles queries + mutations. */
	path: string;
	/** Optional GET endpoint for SSE-based subscriptions. */
	subscriptionsPath?: string;
	/** Enable GET (in addition to POST) for the main endpoint.
	 *  Browsers send GET for persisted queries / static queries. */
	enableGet?: boolean;
}

/** Optional playground / explorer UI mounted at the same path. */
export type PlaygroundUI = "graphiql" | "graphql-playground" | "none";

/** Top-level config for the GraphQL module. */
export interface GraphQLConfig {
	/** SDL typeDefs. Either this OR the decorator-driven code-first
	 *  approach is required. Both can coexist in the same schema. */
	typeDefs?: string | string[];
	/** Resolver map (optional). When omitted, the framework builds
	 *  the resolver map from `@Query`/`@Mutation`/`@Subscription`
	 *  decorators on registered controllers. */
	resolvers?: ResolverMap;
	/** Endpoint config. */
	endpoint?: GraphQLEndpoint;
	/** UI config. Default: "graphiql". Set to "none" to disable. */
	playground?: PlaygroundUI;
	/** Context factory — called once per request. Use this to inject
	 *  the auth user, db transaction, request scope, etc. */
	context?: (c: Context) => Record<string, any> | Promise<Record<string, any>>;
	/** Whether to expose the full schema as SDL at GET /graphql/schema. */
	exposeSchemaSDL?: boolean;
	/** Enable introspection at runtime (disable in production). */
	introspection?: boolean;
}

/** The shape of a hand-written resolver map. */
export interface ResolverMap {
	[TypeName: string]: {
		[fieldName: string]: FieldResolver | { resolve: FieldResolver };
	};
}

/** A registered resolver class — collected by the scanner. */
export interface ResolverClassRecord {
	/** The class constructor. */
	target: new (...args: any[]) => any;
	/** Symbol-keyed metadata. */
	__resolverTypeName: string;
	/** All field methods with their operation kind. */
	fields: Array<{
		propertyKey: string;
		kind: "query" | "mutation" | "subscription";
		name: string;
		returnTypeName: string;
		args: Array<{ name: string; type: string; defaultValue?: unknown }>;
		description?: string;
		deprecationReason?: string;
	}>;
}

/** Execution result envelope. */
export interface GraphQLExecutionResult {
	data?: Record<string, any> | null;
	errors?: Array<{ message: string; path?: (string | number)[]; locations?: { line: number; column: number }[] }>;
	extensions?: Record<string, any>;
}

/** Lifecycle hook for resolver classes. */
export interface ResolverLifecycle {
	/** Called once when the schema is built. */
	onSchemaInit?(): void | Promise<void>;
}
