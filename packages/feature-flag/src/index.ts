/**
 * Public entry point for `@nexusts/feature-flag`.
 */
export { FeatureFlagModule } from "./feature-flag.module.js";
export { FeatureFlagService } from "./feature-flag.service.js";
export { MemoryFlagBackend } from "./backends/index.js";
export { FeatureFlag, getFlagSpecs } from "./decorators/index.js";
export type { FlagSpec, FeatureFlagOptions } from "./decorators/index.js";
export type {
	FlagContext,
	FlagDefinition,
	FeatureFlagConfig,
	FeatureFlagBackend,
} from "./types.js";
