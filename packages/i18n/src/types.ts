/**
 * Public types for `nexusjs/i18n`.
 *
 * `nexusjs/i18n` provides locale-aware translation and formatting
 * for the Bun-native stack. It uses Node's built-in `Intl` API
 * for date / number / currency / pluralization — zero external
 * dependencies.
 */

/* ------------------------------------------------------------------ *
 * Locale
 * ------------------------------------------------------------------ */

/** A locale identifier. e.g. `"en"`, `"en-US"`, `"fr-CA"`, `"ko"`. */
export type Locale = string;

/* ------------------------------------------------------------------ *
 * Message catalog
 * ------------------------------------------------------------------ */

/** A message dictionary. Values can be strings (terminal) or nested dicts. */
export type MessageDict = {
	[key: string]: string | MessageDict;
};

/** A flat `locale → messages` map. */
export type MessageCatalog = Record<Locale, MessageDict>;

/* ------------------------------------------------------------------ *
 * Interpolation
 * ------------------------------------------------------------------ */

/** Arguments passed to `t()`. Values are coerced to strings. */
export type TranslateArgs = Record<string, string | number | boolean>;

/* ------------------------------------------------------------------ *
 * Pluralization
 * ------------------------------------------------------------------ */

/** A plural rule key. Matches `Intl.PluralRule` outputs. */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/** A plural form for a single message. Use `|` to separate forms. */
export type PluralForm = `${string | number}${string}`;

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

export interface I18nConfig {
	/** Default locale. Default: `"en"`. */
	defaultLocale?: Locale;
	/** Whether to fall back to a more general locale (e.g. `fr-CA` → `fr`)
	 * when an exact match is not found. Default: `true`. */
	fallback?: boolean;
	/** Whether to fall back to the default locale when a key is missing
	 * in the requested locale. Default: `true`. */
	fallbackToDefault?: boolean;
	/** Whitelist of supported locales. Empty / undefined = all. */
	supportedLocales?: Locale[];
	/** Initial messages (also useful for tests). */
	messages?: MessageCatalog;
	/** When set, load `*.json` files from this directory on boot. */
	messagesDir?: string;
	/** Query string key for locale detection. Default: `"lang"`. */
	detectQueryKey?: string;
	/** Cookie name for locale detection. Default: `"lang"`. */
	detectCookieKey?: string;
}

/* ------------------------------------------------------------------ *
 * Middleware
 * ------------------------------------------------------------------ */

export interface DetectOptions {
	/** Override the query key. */
	queryKey?: string;
	/** Override the cookie name. */
	cookieKey?: string;
	/** Override the default locale. */
	defaultLocale?: Locale;
}

/* ------------------------------------------------------------------ *
 * Formatter options
 * ------------------------------------------------------------------ */

export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
	/** IETF locale tag. Defaults to the active locale. */
	locale?: Locale;
}

export interface NumberFormatOptions extends Intl.NumberFormatOptions {
	/** IETF locale tag. Defaults to the active locale. */
	locale?: Locale;
}

export interface CurrencyFormatOptions extends Intl.NumberFormatOptions {
	/** IETF locale tag. Defaults to the active locale. */
	locale?: Locale;
	/** ISO 4217 currency code (e.g. `"USD"`, `"KRW"`). */
	currency: string;
}
