/**
 * `SessionModule` — drop-in module for adding sessions to a NexusTS app.
 *
 * Usage:
 *   @Module({
 *     imports: [SessionModule.forRoot({
 *       backend: 'cookie',
 *       cookie: { secret: process.env.SESSION_SECRET! },
 *     })],
 *   })
 *   class AppModule {}
 *
 * Then in bootstrap:
 *   const app = new Application(AppModule);
 *   const svc = app.container.resolve(SessionService.TOKEN);
 *   app.server.app.use('*', sessionMiddleware(svc));
 *   await app.listen(port);
 */

import { Module, Inject } from "@nexusts/core";
import { SessionService } from "./session.service.js";
import type { SessionConfig } from "./types.js";

@Module({
	providers: [
		SessionService,
		{ provide: SessionService.TOKEN, useExisting: SessionService },
	],
	exports: [SessionService, SessionService.TOKEN],
})
export class SessionModule {
	static forRoot(config: SessionConfig = {}) {
		@Module({
			providers: [
				SessionService,
				{ provide: SessionService.TOKEN, useExisting: SessionService },
				{ provide: "SESSION_CONFIG", useValue: config },
			],
			exports: [SessionService, SessionService.TOKEN],
		})
		class ConfiguredSessionModule {
			constructor(@Inject(SessionService.TOKEN) readonly sessions: SessionService) {}
		}

		Object.defineProperty(ConfiguredSessionModule, "name", {
			value: "ConfiguredSessionModule",
		});

		return ConfiguredSessionModule;
	}
}
