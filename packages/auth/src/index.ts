/**
 * Public API for the NexusTS auth module.
 *
 * This is a thin layer over `better-auth` — it does not re-implement
 * any auth primitives. It adapts better-auth's surface to NexusTS's
 * DI / decorator model.
 *
 * Quick start:
 *
 *   // src/auth/auth.ts
 *   import { createAuth } from '@nexusts/auth';
 *   export const auth = createAuth({
 *     emailAndPassword: { enabled: true },
 *     socialProviders: { github: { clientId: '...', clientSecret: '...' } },
 *   });
 *
 *   // src/app/app.module.ts
 *   import { Module } from '@nexusts/core';
 *   import { AuthModule } from '@nexusts/auth';
 *
 *   @Module({ imports: [AuthModule.forRoot({ ... })] })
 *   export class AppModule {}
 *
 *   // any controller
 *   import { CurrentUser } from '@nexusts/auth';
 *
 *   @Controller('/profile')
 *   class ProfileController {
 *     @Get('/')
 *     me(@CurrentUser({ required: true }) user) {
 *       return user;
 *     }
 *   }
 */

export * from "./types.js";
export { createAuth } from "./auth.js";
export type { NexusAuth } from "./auth.js";
export { AuthService } from "./auth.service.js";
export { AuthController } from "./auth.controller.js";
export { AuthModule } from "./auth.module.js";
export {
	authMiddleware,
	authHandler,
	type AuthMiddlewareMode,
	type AuthMiddlewareOptions,
} from "./middleware.js";
export {
	CurrentUser,
	UnauthenticatedError,
	ForbiddenError,
	type CurrentUserOptions,
} from "./decorators/current-user.js";
