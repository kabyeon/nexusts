/**
 * Public API for `nexus/config`.
 *
 * Quick start:
 *
 *   // src/config/schema.ts
 *   import { z } from 'zod';
 *   export const configSchema = z.object({
 *     DATABASE_URL: z.string().url(),
 *     PORT: z.coerce.number().default(3000),
 *   });
 *
 *   // src/app/app.module.ts
 *   import { Module } from 'nexus';
 *   import { ConfigModule } from 'nexus/config';
 *
 *   @Module({
 *     imports: [
 *       ConfigModule.forRoot({
 *         schema: configSchema,
 *       }),
 *     ],
 *   })
 *   export class AppModule {}
 *
 *   // any service
 *   import { ConfigService } from 'nexus/config';
 *
 *   class MyService {
 *     constructor(
 *       @Inject(ConfigService.TOKEN)
 *       private config: ConfigService<typeof configSchema>,
 *     ) {}
 *   }
 */

export * from "./types.js";
export { ConfigService } from "./config.service.js";
export { ConfigModule } from "./config.module.js";