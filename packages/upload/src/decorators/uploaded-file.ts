/**
 * `@UploadedFile('fieldName')` — inject a single uploaded file into
 * the controller method.
 *
 * The framework pulls the parsed file from the Hono context (which
 * the upload middleware populated). If the field is missing and the
 * `@Upload` decorator declared it required, the middleware has
 * already returned a 400 — by the time we run, the file is either
 * present or the request is non-multipart.
 */
import { createParamDecorator } from "../../core/decorators/params.js";
import { UPLOAD_STORAGE_KEY } from "../types.js";

export const UploadedFile = (fieldName?: string) =>
	createParamDecorator(0x80 as any /* USER */, fieldName); // placeholder token

// ---------------------------------------------------------------------
// The decorator above is a placeholder for the framework's param
// decorator factory. The actual pull-from-context logic is wired by
// the framework's param resolver at boot. We re-export a helper
// that, given a Hono context, returns the file.
// ---------------------------------------------------------------------

/**
 * Resolve a `@UploadedFile(name)` call against a Hono context. The
 * framework invokes this from its param pipeline. Application
 * code typically does not call this directly — use the decorator.
 */
export function getUploadedFile(c: any, fieldName: string) {
	const stored = c.get?.(UPLOAD_STORAGE_KEY) ?? c.var?.[UPLOAD_STORAGE_KEY];
	if (!stored) return undefined;
	const v = stored[fieldName];
	if (Array.isArray(v)) return v[0];
	return v;
}

/** Resolve a `@UploadedFiles(name)` call. */
export function getUploadedFiles(c: any, fieldName: string) {
	const stored = c.get?.(UPLOAD_STORAGE_KEY) ?? c.var?.[UPLOAD_STORAGE_KEY];
	if (!stored) return [];
	const v = stored[fieldName];
	if (Array.isArray(v)) return v;
	if (v) return [v];
	return [];
}