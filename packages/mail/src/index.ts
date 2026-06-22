/**
 * Public entry point for `nexusjs/mail`.
 */
export * from "./types.js";
export {
	NullTransport,
	FileTransport,
	SmtpTransport,
} from "./transports/index.js";
export type {
	FileTransportOptions,
	SmtpTransportOptions,
} from "./transports/index.js";
export { MailService } from "./mail.service.js";
export { MailModule } from "./mail.module.js";
