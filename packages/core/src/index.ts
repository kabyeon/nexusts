/**
 * NexusTS framework — public entry point.
 *
 * Re-exports the public surface of every core module so users can
 * `import { ... } from 'nexusjs'` without reaching into subpaths.
 *
 * Public surface intentionally stays small; advanced users can deep-import
 * from `@nexusts/core/<module>` for sub-paths.
 */

// Decorators
export * from "./decorators/index.js";

// DI
export * from "./di/index.js";

// HTTP
export * from "./http/index.js";

// Re-export CtxInput helper for ergonomic access in standard decorator mode
export { getInputHelper, attachInputHelper, type CtxInput, INPUT_HELPER_KEY } from "./http/ctx-input.js";
export { inputValue, type InputValueChain } from "./http/input-value.js";

// Validation
export * from "./validation/index.js";

// View
export * from "@nexusts/view";

// ORM
export * from "./orm/index.js";

// Runtime adapters
export * from "./runtime/index.js";

// Lifecycle hooks
export * from "./lifecycle/index.js";

// Exception Filters
export {
	HttpException,
	type ExceptionFilter,
	type HttpExecutionContext as FilterExecutionContext,
	HttpExecutionContextImpl as FilterExecutionContextImpl,
	createExceptionFilter,
	createDefaultExceptionFilter,
	defaultExceptionFilter,
	executeExceptionFilters,
	UseFilters,
	getControllerExceptionFilters,
	getRouteExceptionFilters,
} from "./exception-filters/index.js";

// Interceptors
export {
	type ExecutionContext,
	type HttpExecutionContext as InterceptorHttpContext,
	type Interceptor,
	type ResolvedInterceptor,
	HttpExecutionContextImpl as InterceptorHttpExecutionContextImpl,
	composeInterceptors,
	createInterceptor,
	UseInterceptors,
	getControllerInterceptors,
	getRouteInterceptors,
	LoggingInterceptor,
	TimeoutInterceptor,
	isHttpContext as isInterceptorHttpContext,
	isWsContext as isInterceptorWsContext,
	isQueueContext as isInterceptorQueueContext,
} from "./interceptors/index.js";

// HTTP Guards
export {
	type HttpExecutionContext as GuardExecutionContext,
	type HttpGuard,
	HttpExecutionContextImpl as GuardExecutionContextImpl,
	executeHttpGuards,
	createHttpGuard,
	UseGuards,
	getControllerGuards,
	getRouteGuards,
	AuthGuard,
	RolesGuard,
} from "./guards/index.js";

// Application
export { Application, type ApplicationOptions, setScheduleScanner } from "./application.js";

// Constants and types
export { METADATA_KEY, PARAM_TYPES, HTTP_METHODS } from "./constants.js";
export {
	EXCEPTION_FILTERS_METADATA,
	CONTROLLER_EXCEPTION_FILTERS_METADATA,
	INTERCEPTORS_METADATA,
	CONTROLLER_INTERCEPTORS_METADATA,
	HTTP_GUARDS_METADATA,
	CONTROLLER_GUARDS_METADATA,
} from "./constants.js";
export type { MetadataKey, ParamType, HttpMethod } from "./constants.js";
