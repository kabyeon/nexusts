/**
 * Zod-based validation pipeline.
 *
 * `validateRequest` runs the configured Zod schemas for each request part
 * and either returns the parsed value or throws a ValidationError.
 *
 * Schemas are read from @Validate({ body, query, params, headers }) on the
 * handler method.
 */
import type { ZodError, ZodSchema } from "zod";
import type { ValidationMetadata } from "../di/tokens.js";

export class ValidationError extends Error {
	readonly status = 400;
	readonly issues: ZodError["issues"];

	constructor(zodError: ZodError) {
		super("Validation failed");
		this.name = "ValidationError";
		this.issues = zodError.issues;
	}
}

export interface ValidationInput {
	body?: unknown;
	query?: unknown;
	params?: unknown;
	headers?: unknown;
}

export interface ValidationResult {
	body?: unknown;
	query?: unknown;
	params?: unknown;
	headers?: unknown;
}

/**
 * Validate the request using the handler's @Validate metadata. Returns
 * parsed values keyed by part. Throws ValidationError on the first
 * failure (body → query → params → headers order).
 */
export function validateRequest(
	metadata: ValidationMetadata | undefined,
	input: ValidationInput,
): ValidationResult {
	if (!metadata) return input as ValidationResult;

	const result: ValidationResult = {};

	if (metadata.body) result.body = runSchema(metadata.body, input.body, "body");
	else result.body = input.body;

	if (metadata.query)
		result.query = runSchema(metadata.query, input.query, "query");
	else result.query = input.query;

	if (metadata.params)
		result.params = runSchema(metadata.params, input.params, "params");
	else result.params = input.params;

	if (metadata.headers)
		result.headers = runSchema(metadata.headers, input.headers, "headers");
	else result.headers = input.headers;

	return result;
}

function runSchema(schema: any, value: unknown, part: string): unknown {
	if (!isZodSchema(schema)) {
		// Allow passing a class validator or function as an escape hatch.
		if (typeof schema === "function") return schema(value);
		throw new Error(
			`@Validate "${part}" must be a Zod schema or validator function. Got ${typeof schema}.`,
		);
	}
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		throw new ValidationError(parsed.error);
	}
	return parsed.data;
}

function isZodSchema(value: any): value is ZodSchema {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof value.safeParse === "function"
	);
}

/**
 * Default error formatter for ValidationError.
 * Renders a JSON body suitable for the framework's HTTP layer.
 */
export function formatValidationError(err: ValidationError): {
	status: number;
	body: { error: string; issues: ZodError["issues"] };
} {
	return {
		status: err.status,
		body: {
			error: err.message,
			issues: err.issues,
		},
	};
}
