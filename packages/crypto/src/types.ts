/**
 * Public types for `nexusjs/crypto`.
 *
 * `nexusjs/crypto` provides:
 * - `EncryptionService` — AES-256-GCM symmetric encryption +
 *   HMAC sign/unsign (for stateless session cookies, CSRF tokens,
 *   signed URLs, etc.).
 * - `HashService` — scrypt password hashing (argon2 available as
 *   an optional peer dep when the user installs `@node-rs/argon2`).
 *
 * No external dependencies. All primitives come from Node's
 * built-in `crypto` module.
 */

/* ------------------------------------------------------------------ *
 * Encryption
 * ------------------------------------------------------------------ */

export interface EncryptionConfig {
	/**
	 * Master key as a string or base64-encoded bytes. Must be at
	 * least 32 bytes after decoding. The framework derives separate
	 * 32-byte keys for AES and HMAC from this master.
	 *
	 * If the key is shorter, the framework pads / hashes it with
	 * SHA-256 — but the user is encouraged to provide a 32-byte
	 * random value (`openssl rand -base64 32`).
	 */
	key: string;
	/**
	 * Algorithm. Currently only "aes-256-gcm" is supported.
	 * Default: "aes-256-gcm".
	 */
	algorithm?: "aes-256-gcm";
	/**
	 * Default expiry for encrypted payloads. The decryptor
	 * throws if the payload was created with a past `expiresAt`.
	 * Default: never.
	 */
	defaultExpiresIn?: number | string;
}

export interface EncryptOptions {
	/** Expiry in seconds, or a future Date, or an absolute timestamp. */
	expiresAt?: number | string | Date;
	/** Purpose / namespace — included in the MAC, so a payload signed
	 * for "session" can't be replayed as a "csrf" token. */
	purpose?: string;
}

/* ------------------------------------------------------------------ *
 * HMAC
 * ------------------------------------------------------------------ */

export interface HmacConfig {
	/** The secret key. Must be at least 16 bytes; longer is better. */
	secret: string;
	/** Algorithm. Default: "sha256". */
	algorithm?: "sha256" | "sha512";
	/** Optional purpose / namespace. */
	purpose?: string;
}

/* ------------------------------------------------------------------ *
 * Hashing
 * ------------------------------------------------------------------ */

export type HashAlgorithm = "scrypt" | "argon2";

export interface HashConfig {
	/** Algorithm. Default: "scrypt". "argon2" requires the optional peer. */
	algorithm?: HashAlgorithm;
	/** scrypt N cost parameter. Default: 16384. */
	scryptCost?: number;
	/** scrypt block size. Default: 8. */
	scryptBlockSize?: number;
	/** scrypt parallelization. Default: 1. */
	scryptParallelization?: number;
	/** Output key length for scrypt. Default: 64. */
	scryptKeyLength?: number;
	/** Argon2 memory cost (KB). Default: 65536. */
	argon2MemoryCost?: number;
	/** Argon2 time cost. Default: 3. */
	argon2TimeCost?: number;
	/** Argon2 parallelism. Default: 4. */
	argon2Parallelism?: number;
}

export interface HashOptions {
	/** Custom algorithm override for this call. */
	algorithm?: HashAlgorithm;
}

/* ------------------------------------------------------------------ *
 * Returned values
 * ------------------------------------------------------------------ */

/** A hashed password in the framework's canonical string format. */
export type HashedPassword = string;

/** An encrypted payload — base64url-encoded, self-describing. */
export type EncryptedValue = string;

/** A signed value — base64url-encoded `<value>.<signature>`. */
export type SignedValue = string;
