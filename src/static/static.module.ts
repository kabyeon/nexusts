/**
 * `StaticModule` — drop-in module for static file serving.
 *
 * Usage:
 *   @Module({
 *     imports: [
 *       StaticModule.forRoot({
 *         root: './public',
 *         prefix: '/public',
 *         cacheControl: 'public, max-age=86400',
 *       }),
 *     ],
 *   })
 *   export class AppModule {}
 *
 * Then `GET /public/*` serves files from `./public/*` with proper
 * Content-Type, ETag, and Range support.
 */

import "reflect-metadata";
import { Module } from "../core/decorators/module.js";
import { StaticService } from "./static.service.js";
import type { ServeStaticOptions } from "./static.service.js";

@Module({
	providers: [
		StaticService,
		{ provide: StaticService.TOKEN, useExisting: StaticService },
	],
	exports: [StaticService, StaticService.TOKEN],
})
export class StaticModule {
	static forRoot(options: ServeStaticOptions = {}) {
		@Module({
			providers: [
				StaticService,
				{ provide: StaticService.TOKEN, useExisting: StaticService },
				{ provide: "STATIC_OPTIONS", useValue: options },
			],
			exports: [StaticService, StaticService.TOKEN],
		})
		class ConfiguredStaticModule {}

		Object.defineProperty(ConfiguredStaticModule, "name", {
			value: "ConfiguredStaticModule",
		});

		return ConfiguredStaticModule;
	}
}