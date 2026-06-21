/**
 * Public API for `nexus/logger`.
 *
 * Quick start:
 *
 *   // src/app/app.module.ts
 *   import { Module } from 'nexus';
 *   import { LoggerModule } from 'nexus/logger';
 *
 *   @Module({
 *     imports: [
 *       LoggerModule.forRoot({
 *         level: 'info',
 *         pretty: process.env.NODE_ENV !== 'production',
 *       }),
 *     ],
 *   })
 *   export class AppModule {}
 *
 *   // any service
 *   import { Logger } from 'nexus/logger';
 *
 *   @Injectable()
 *   class MyService {
 *     constructor(@Inject(Logger.TOKEN) private logger: Logger) {}
 *
 *     async handle() {
 *       this.logger.info({ userId: 'u-1' }, 'user signed in');
 *     }
 *   }
 */

export * from "./types.js";
export { Logger } from "./logger.service.js";
export { LoggerModule } from "./logger.module.js";
export {
	PinoTransport,
	PrettyTransport,
	NullTransport,
} from "./transports/index.js";
