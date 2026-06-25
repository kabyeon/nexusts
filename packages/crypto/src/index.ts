/**
 * `@nexusts/crypto` — encryption + password hashing.
 *
 * Public API:
 * - `EncryptionService` — AES-256-GCM + HMAC sign/unsign.
 * - `HashService`       — scrypt (default) or argon2 (optional).
 * - `CryptoModule.forRoot({ key })` — wires both into the DI
 *   container.
 * - `hash()` / `verify()` — standalone helpers that wrap a
 *   `HashService` instance. Useful outside the DI container
 *   (CLI scripts, seeders, smoke tests).
 * - `scryptHash()` / `scryptVerify()` — same, but locked to scrypt.
 *
 * Zero external dependencies. All primitives come from Node's
 * built-in `crypto` module.
 *
 *   bun add nexus
 *   # Optional (only if you use argon2):
 *   bun add @node-rs/argon2
 *
 * Quick start:
 *
 *   import { Module } from "@nexusts/core";
 *   import { CryptoModule, EncryptionService, HashService } from "@nexusts/crypto";
 *
 *   @Module({
 *     imports: [CryptoModule.forRoot({ key: process.env.APP_KEY! })],
 *   })
 *   class AppModule {}
 *
 *   @Injectable()
 *   class UserService {
 *     constructor(
 *       @Inject(EncryptionService.TOKEN) private enc: EncryptionService,
 *       @Inject(HashService.TOKEN) private hash: HashService,
 *     ) {}
 *
 *     async createUser(email: string, password: string) {
 *       const passwordHash = await this.hash.hash(password);
 *       const apiToken = this.enc.sign(email);
 *       // ... store
 *     }
 *
 *     async verifyPassword(plain: string, stored: string) {
 *       return this.hash.verify(stored, plain);
 *     }
 *   }
 *
 *   // Or use the standalone helpers without DI:
 *   import { scryptHash, scryptVerify } from "@nexusts/crypto";
 *   const hash = await scryptHash("hunter2");
 *   const ok = await scryptVerify(hash, "hunter2");
 */

export { EncryptionService } from "./encryption.js";
export { HashService, hash, verify, scryptHash, scryptVerify } from "./hash.js";
export { CryptoModule, ENCRYPTION_SERVICE_TOKEN, HASH_SERVICE_TOKEN } from "./module.js";
export type {
	EncryptionConfig,
	EncryptOptions,
	HashConfig,
	HashOptions,
	HashAlgorithm,
	HmacConfig,
	EncryptedValue,
	SignedValue,
	HashedPassword,
} from "./types.js";
