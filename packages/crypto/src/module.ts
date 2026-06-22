/**
 * `CryptoModule` — wires `EncryptionService` and `HashService`
 * into the DI container.
 *
 *   @Module({
 *     imports: [CryptoModule.forRoot({ key: process.env.APP_KEY! })],
 *   })
 *   class AppModule {}
 *
 * The `key` is required for `EncryptionService` (32 bytes). For
 * `HashService` only the algorithm config is required — there's no
 * shared key.
 *
 * If you only need `HashService` (and don't use encryption), you
 * can pass an empty config:
 *
 *   CryptoModule.forRoot({ key: \"x\" })
 *   // Encryption will pad the key to 32 bytes via HKDF.
 */

import { Module } from "../core/decorators/module.js";
import { EncryptionService } from "./encryption.js";
import { HashService } from "./hash.js";
import type { EncryptionConfig, HashConfig } from "./types.js";

export const ENCRYPTION_SERVICE_TOKEN = Symbol.for("nexus:EncryptionService");
export const HASH_SERVICE_TOKEN = Symbol.for("nexus:HashService");

@Module({
	providers: [
		EncryptionService,
		HashService,
		{ provide: ENCRYPTION_SERVICE_TOKEN, useExisting: EncryptionService },
		{ provide: HASH_SERVICE_TOKEN, useExisting: HashService },
	],
	exports: [
		EncryptionService,
		HashService,
		ENCRYPTION_SERVICE_TOKEN,
		HASH_SERVICE_TOKEN,
	],
})
export class CryptoModule {
	static forRoot(config: EncryptionConfig & { hash?: HashConfig } = { key: "" }) {
		const fullEncryptionConfig = {
			key: config.key,
			algorithm: config.algorithm ?? "aes-256-gcm",
			defaultExpiresIn: config.defaultExpiresIn,
		} as Required<EncryptionConfig>;
		const fullHashConfig = config.hash ?? {};

		@Module({
			providers: [
				{ provide: "ENCRYPTION_CONFIG", useValue: fullEncryptionConfig },
				{ provide: "HASH_CONFIG", useValue: fullHashConfig },
				{
					provide: EncryptionService,
					useFactory: () => new EncryptionService(fullEncryptionConfig.key),
				},
				{
					provide: HashService,
					useFactory: () => new HashService(fullHashConfig),
				},
				{ provide: ENCRYPTION_SERVICE_TOKEN, useExisting: EncryptionService },
				{ provide: HASH_SERVICE_TOKEN, useExisting: HashService },
			],
			exports: [
				EncryptionService,
				HashService,
				ENCRYPTION_SERVICE_TOKEN,
				HASH_SERVICE_TOKEN,
			],
		})
		class ConfiguredCryptoModule {}
		Object.defineProperty(ConfiguredCryptoModule, "name", {
			value: "ConfiguredCryptoModule",
		});

		return ConfiguredCryptoModule as unknown as typeof CryptoModule;
	}
}
