/**
 * Public API for the NexusTS session module.
 *
 * Two backends out of the box:
 *   - cookie   — HMAC-signed, stateless, edge-friendly
 *   - memory   — in-process, for tests and single-instance dev
 *   - redis    — multi-pod via `nexusjs/redis` (Bun/Node/Workers KV)
 *   - cloudflare-kv — Workers KV (via `nexusjs/redis` cloudflare adapter)
 *
 * Quick start:
 *
 *   // src/app/app.module.ts
 *   import { Module } from 'nexusjs';
 *   import { SessionModule } from 'nexusjs/session';
 *
 *   @Module({
 *     imports: [
 *       SessionModule.forRoot({
 *         backend: 'cookie',
 *         cookie: { secret: process.env.SESSION_SECRET! },
 *       }),
 *     ],
 *   })
 *   export class AppModule {}
 *
 *   // any controller
 *   import { SessionService, Session } from 'nexusjs/session';
 *
 *   class CartController {
 *     @Post('/')
 *     add(@Session() session, @Inject(SessionService.TOKEN) svc: SessionService) {
 *       return svc.update(session.id, { dataPatch: { cart: [...] } });
 *     }
 *   }
 */

export * from "./types.js";
export {
	MemorySessionStorage,
	CookieSessionStorage,
	RedisSessionStorage,
	CloudflareKVSessionStorage,
	encodeSessionCookie,
	decodeSessionCookie,
	type MemoryStorageOptions,
	type RedisSessionStorageConfig,
} from "./backends/index.js";
export { SessionService } from "./session.service.js";
export { SessionModule } from "./session.module.js";
export {
	Session,
	UnauthenticatedError,
	SessionForbiddenError,
	type SessionOptions,
} from "./decorators/current-session.js";
export { sessionMiddleware, type SessionMiddlewareOptions } from "./session-middleware.js";
