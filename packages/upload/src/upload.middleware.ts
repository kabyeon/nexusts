/**
 * Hono middleware that parses multipart/form-data and stores the
 * requested fields on the Hono context. Routes that need
 * `@UploadedFile` opt in by:
 *
 *   1. Calling `uploadMiddleware(fieldSpecs)` to register the fields
 *      they expect.
 *   2. Or, listing the field names in the `@Upload(...)` decorator
 *      metadata, which the `UploadModule` reads to wire up the
 *      middleware at boot.
 *
 * For convenience, `UploadModule.mountAll()` walks the route table
 * and installs the middleware on every controller method that has
 * an `@Upload(...)` decorator.
 */
import { UploadError } from "./types.js";

export interface FieldSpec {
	fieldName: string;
	maxFiles: number;
	required: boolean;
}

/**
 * Middleware factory. Returns a Hono middleware that:
 *   1. Skips non-multipart requests.
 *   2. Asks the UploadService to parse and store the given fields.
 *   3. On `UploadError`, returns a 400 response with the error code.
 */
export function uploadMiddleware(svc: {
	parseAndStore(c: any, fields: FieldSpec[]): Promise<void>;
}) {
	return async (c: any, next: () => Promise<any>) => {
		const ct = (c.req?.raw?.headers?.get?.("content-type") ?? "") as string;
		if (!ct.startsWith("multipart/form-data")) return next();
		// The fields are read off the route at boot. By the time this
		// middleware runs, `c.var` should have the route spec.
		const fields: FieldSpec[] = (c.get?.("uploadFields") as FieldSpec[] | undefined) ?? [];
		if (fields.length === 0) return next();
		try {
			await svc.parseAndStore(c, fields);
			return next();
		} catch (err) {
			if (err instanceof UploadError) {
				return c.json(
					{ error: err.message, code: err.code, field: err.field },
					err.status as any,
				);
			}
			throw err;
		}
	};
}
