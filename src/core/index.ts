/**
 * Nexus framework — public entry point.
 *
 * Re-exports the public surface of every core module so users can
 * `import { ... } from 'nexusjs'` without reaching into subpaths.
 *
 * Public surface intentionally stays small; advanced users can deep-import
 * from `nexusjs/core/<module>` for sub-paths.
 */

// Decorators
export * from "./decorators/index.js";

// DI
export * from "./di/index.js";

// HTTP
export * from "./http/index.js";

// Validation
export * from "./validation/index.js";

// View
export * from "../view/index.js";

// ORM
export * from "./orm/index.js";

// Runtime adapters
export * from "./runtime/index.js";

// Application
export { Application, type ApplicationOptions } from "./application.js";

// Constants and types
export { METADATA_KEY, PARAM_TYPES, HTTP_METHODS } from "./constants.js";
export type { MetadataKey, ParamType, HttpMethod } from "./constants.js";
