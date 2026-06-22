/**
 * Metadata keys used by reflect-metadata for storing decorator data.
 *
 * These constants are the contract between decorators and the framework
 * core (DI container, router, validator).
 */
export const METADATA_KEY = {
	/** Marks a class as a Nest-style controller, stores route prefix. */
	CONTROLLER: "nexus:controller",

	/** Marks a class as an injectable provider. */
	INJECTABLE: "nexus:injectable",

	/** Marks a class as a repository. */
	REPOSITORY: "nexus:repository",

	/** Marks a class as a module. Stores module options. */
	MODULE: "nexus:module",

	/** HTTP method routes registered on a controller (Get/Post/...). */
	ROUTES: "nexus:routes",

	/** Method parameter type metadata (body/query/param/headers/ctx). */
	PARAMS: "nexus:params",

	/** Validation schema per method (Zod schema or class). */
	VALIDATE: "nexus:validate",

	/** Class-level design:paramtypes (built-in). */
	PARAMTYPES: "design:paramtypes",

	/** Class-level design:type (built-in). */
	TYPE: "design:type",

	/** Class-level design:returntype (built-in). */
	RETURNTYPE: "design:returntype",

	/** Provider token to inject for a parameter (for custom tokens). */
	INJECT: "nexus:inject",
} as const;

export type MetadataKey = (typeof METADATA_KEY)[keyof typeof METADATA_KEY];

/** Available parameter decorator locations. */
export const PARAM_TYPES = {
	REQUEST: 0,
	RESPONSE: 1,
	NEXT: 2,
	BODY: 3,
	QUERY: 4,
	PARAM: 5,
	HEADERS: 6,
	CTX: 7,
	USER: 8,
} as const;

export type ParamType = (typeof PARAM_TYPES)[keyof typeof PARAM_TYPES];

/** HTTP methods supported by the router. */
export const HTTP_METHODS = [
	"GET",
	"POST",
	"PUT",
	"DELETE",
	"PATCH",
	"OPTIONS",
	"HEAD",
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
