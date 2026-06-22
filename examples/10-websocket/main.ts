import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable, Inject } from "@kabyeon/nexusjs";
import {
  WebSocketService, WebSocketModule,
  WebSocketGateway,
  OnWebSocketOpen, OnWebSocketMessage, OnWebSocketClose,
} from "@kabyeon/nexusjs/ws";

/**
 * 10-websocket — real-time chat with @kabyeon/nexusjs/ws.
 *
 *   WS /chat   — broadcast "message" events to all connected clients.
 *
 *   Run: bun main.ts
 *   Then: open examples/10-websocket/client.html in a browser.
 */

@Injectable()
@Controller("/")
class AppController {
  @Get("/")
  status() { return { ok: true }; }
}

@Injectable()
@WebSocketGateway("/chat")
class ChatGateway {
  constructor(@Inject(WebSocketService) private ws: WebSocketService) {}

  @OnWebSocketOpen()
  onOpen(socket: any) {
    console.log(`[ws] connect: ${socket.id}`);
  }

  @OnWebSocketMessage()
  onMessage(socket: any, payload: { user: string; text: string }) {
    console.log(`[ws] ${payload.user}: ${payload.text}`);
    this.ws.broadcast({ path: "/chat", event: "message", data: { ...payload, ts: Date.now() } });
  }

  @OnWebSocketClose()
  onClose(socket: any) {
    console.log(`[ws] disconnect: ${socket.id}`);
  }
}

@Module({
  imports: [WebSocketModule.forRoot({ gateways: [ChatGateway] })],
  controllers: [AppController],
  providers: [ChatGateway],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);