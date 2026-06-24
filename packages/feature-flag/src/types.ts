/** Targeting context passed to `isEnabled()`. */
export interface FlagContext {
	/** User identifier — used for allowlist/denylist and rollout hash. */
	userId?: string;
	/** Tenant identifier — fallback when userId is absent. */
	tenantId?: string;
	/** Arbitrary key used as the rollout hash seed when userId/tenantId are absent. */
	key?: string;
	/** Additional attributes available to custom backends. */
	attributes?: Record<string, unknown>;
}

/** Per-flag definition stored in the backend. */
export interface FlagDefinition {
	/** Whether the flag is on. Defaults to `false`. */
	enabled?: boolean;
	/** Fractional rollout: 0 = nobody, 1 = everybody, 0.5 = 50% of traffic. */
	rollout?: number;
	/** User/tenant IDs that are always enabled regardless of `rollout`. */
	allowlist?: string[];
	/** User/tenant IDs that are always disabled regardless of other rules. */
	denylist?: string[];
}

/** Config passed to `FeatureFlagModule.forRoot()`. */
export interface FeatureFlagConfig {
	/** Storage backend. Default: `'memory'`. */
	backend?: "memory";
	/** Initial flag definitions. Values may be `true/false` shorthand or full `FlagDefinition`. */
	flags?: Record<string, FlagDefinition | boolean>;
}

/** Interface that any backend must implement. */
export interface FeatureFlagBackend {
	isEnabled(flagName: string, context?: FlagContext): Promise<boolean>;
	setFlag(flagName: string, definition: FlagDefinition | boolean): void;
	getFlag(flagName: string): FlagDefinition | undefined;
}
