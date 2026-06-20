/**
 * Public API for the NexusJS session module.
 *
 * Two backends out of the box:
 *   - cookie   — HMAC-signed, stateless, edge-friendly
 *   - memory   — in-process, for tests and single-instance dev
 *   - redis    — planned for v0.3
 *
 * Quick start:
 *
 *   // src/app/app.module.ts
 *   import { Module } from 'nexus';
 *   import { SessionModule } from 'nexus/session';
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
 *   import { SessionService, Session } from 'nexus/session';
 *
 *   class CartController {
 *     @Post('/')
 *     add(@Session() session, @Inject(SessionService.TOKEN) svc: SessionService) {
 *       return svc.update(session.id, { dataPatch: { cart: [...] } });
 *     }
 *   }
 */

export * from './types.js';
export {
	MemorySessionStorage,
	CookieSessionStorage,
	encodeSessionCookie,
	decodeSessionCookie,
	type MemoryStorageOptions,
} from './backends/index.js';
export { SessionService } from './session.service.js';
export { SessionModule } from './session.module.js';
export {
	// v0.2 name (preferred)
	Session,
	// v0.1 alias (still exported, deprecated)
	CurrentSession,
	// Error classes
	UnauthenticatedError,
	SessionForbiddenError,
	// Options type (v0.2 name)
	type SessionOptions,
	// v0.1 alias
	type CurrentSessionOptions,
} from './decorators/current-session.js';