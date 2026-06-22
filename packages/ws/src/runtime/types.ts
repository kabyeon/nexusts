/**
 * Runtime adapter types for `nexusjs/ws`.
 */

import type { WebSocketClient } from "../types.js";

/** Options shared by all runtime adapters. */
export interface WebSocketGatewayOptions {
	/** Auto-parse JSON messages. Default: true. */
	json?: boolean;
	/** Called after a client connects. */
	onOpen?: (client: WebSocketClient) => void;
	/** Called after a client disconnects. */
	onClose?: (client: WebSocketClient, code: number, reason: string) => void;
	/** Called on a connection error. */
	onError?: (client: WebSocketClient, err: Error) => void;
}

/** A WebSocket gateway class — a class that has `@WebSocketGateway(path)`. */
export type GatewayClass = new (...args: any[]) => any;
