/**
 * 10-websocket — real-time chat with Hono WebSocket.
 *
 * Uses Hono's createBunWebSocket for WebSocket upgrade + broadcast.
 *
 *   Run: bun main.ts
 *   Then open: http://localhost:3000
 */
import { Application, Module, Controller, Get, Injectable, Inject } from "@nexusts/core";
import type { Context } from "hono";
import { WebSocketService, WebSocketModule, WebSocketGateway, OnWebSocketOpen, OnWebSocketMessage, OnWebSocketClose } from "@nexusts/ws";

// ─── WebSocket Gateway ─────────────────────────────────────────────
@Injectable()
@WebSocketGateway("/chat")
class ChatGateway {
  @Inject(WebSocketService) declare ws: WebSocketService;

  @OnWebSocketOpen()
  onOpen(socket: any) {
    console.log(`[ws] connect: ${socket.id}`);
    this.ws.joinRoom(socket, "lobby");
  }

  @OnWebSocketMessage()
  onMessage(socket: any, payload: { user: string; text: string }) {
    console.log(`[ws] ${payload.user}: ${payload.text}`);
    const ts = Date.now();
    this.ws.broadcastToRoom("lobby", { type: "message", user: payload.user ?? "anon", text: payload.text, ts });
  }

  @OnWebSocketClose()
  onClose(socket: any) {
    console.log(`[ws] disconnect: ${socket.id}`);
  }
}

// ─── Controller ────────────────────────────────────────────────────
@Injectable()
@Controller("/")
class AppController {
  @Get("/")
  index(ctx: Context) {
    return ctx.html(`<!doctype html>
<html><head><title>WS Chat</title><style>
body{font-family:system-ui;max-width:600px;margin:2em auto;padding:0 1em}
input,button{padding:.5em;font-size:1em}
#log{list-style:none;padding:0}
#log li{padding:.3em .5em;margin:.2em 0;background:#f5f5f5;border-radius:4px}
</style></head><body>
<h1>\u{1F4AC} Chat</h1>
<p><input id="user" placeholder="name" value="alice" />
<input id="text" placeholder="message" />
<button id="send">Send</button></p>
<ul id="log"></ul>
<script>
const ws=new WebSocket("ws://"+location.host+"/chat");
const log=document.getElementById("log");
ws.onmessage=(e)=>{const li=document.createElement("li");li.textContent=JSON.stringify(JSON.parse(e.data));log.appendChild(li)};
document.getElementById("send").onclick=()=>{ws.send(JSON.stringify({user:document.getElementById("user").value,text:document.getElementById("text").value}))};
document.getElementById("text").onkeydown=(e)=>{if(e.key==="Enter")document.getElementById("send").click()};
</script></body></html>`);
  }
}

// ─── Module ─────────────────────────────────────────────────────────
@Module({
  imports: [WebSocketModule.forRoot({ gateways: [ChatGateway] })],
  controllers: [AppController],
  providers: [ChatGateway],
})
class AppModule {}

// ─── Bootstrap ──────────────────────────────────────────────────────
const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.bootstrap();

// Wire WebSocket via Hono's createBunWebSocket
const { createBunWebSocket } = await import("hono/bun");
const { upgradeWebSocket, websocket } = createBunWebSocket();

app.server.app.get("/chat", upgradeWebSocket((c) => {
  const gateway = new ChatGateway();
  const svc = app.container.resolve(WebSocketService);
  Object.defineProperty(gateway, "ws", { value: svc, writable: false });

  return {
    onOpen(_evt: Event, wsCtx: any) {
      const id = crypto.randomUUID();
      // Store id on the raw Bun WS so it persists across WSContext instances
      if (wsCtx.raw) wsCtx.raw.__clientId = id;
      // Use a lightweight adapter that satisfies WebSocketClient
      const client = makeClient(id, wsCtx);
      svc.register(client);
      gateway.onOpen(client);
    },
    onMessage(evt: MessageEvent, wsCtx: any) {
      const raw = wsCtx?.raw;
      const id = raw?.__clientId as string | undefined;
      if (!id) return;
      const client = svc.getConnection(id);
      if (!client) return;
      let data: any;
      try { data = JSON.parse(evt.data as string); } catch { return; }
      gateway.onMessage(client, data);
    },
    onClose(_evt: CloseEvent, wsCtx: any) {
      const raw = wsCtx?.raw;
      const id = raw?.__clientId as string | undefined;
      if (!id) return;
      const client = svc.getConnection(id);
      if (client) { svc.unregister(client); gateway.onClose(client); }
    },
  };
}));

// Helper: create a minimal WebSocketClient adapter
function makeClient(id: string, wsCtx: any): any {
  return {
    id,
    send: (data: any) => {
      const msg = typeof data === "string" ? data : JSON.stringify(data);
      try { wsCtx.send(msg); } catch {}
    },
    close: (code?: number, reason?: string) => wsCtx.close(code, reason),
    get readyState() { return wsCtx.readyState; },
    joinRoom: (_room: string) => {},
    leaveRoom: (_room: string) => {},
    leaveAll: () => {},
    rooms: new Set<string>(),
    _underlying: wsCtx,
    raw: wsCtx.raw,
  };
}

const server = Bun.serve({ port, fetch: (req, srv) => app.server.app.fetch(req, { server: srv }), websocket });
console.log(`[nexus] Listening on http://localhost:${server.port}`);
