# 11 · Server-Sent Events

Server-push streaming with `@nexusts/sse`.

## What it shows

- `SseStream` helper for type-safe event emission
- `sse(c, handler)` Hono-native SSE handler
- `Last-Event-ID` reconnection support

## How to run

```bash
cd examples/11-sse
bun main.ts
```

Then:

```bash
curl -N http://localhost:3000/events/timeseries
```

## Code

```ts
// main.ts
import "reflect-metadata";
import { Application, Module, Controller, Get, Injectable } from "@nexusts/core";
import { sse, SseStream } from "@nexusts/sse";

@Injectable()
@Controller("/events")
class EventController {
  @Get("/timeseries")
  timeseries(c: any) {
    return sse(c, async (stream) => {
      let n = 0;
      stream.send("tick", { n });
      const id = setInterval(() => {
        n += 1;
        stream.send("tick", { n, ts: Date.now() });
      }, 1000);
      stream.onAbort(() => clearInterval(id));
      // keep stream open
      await new Promise(() => {});
    });
  }
}

@Module({
  controllers: [EventController],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);
```

## Client (browser)

```js
const es = new EventSource("/events/timeseries");
es.addEventListener("tick", (e) => console.log(JSON.parse(e.data)));
```

## Server-Sent Events vs WebSocket

| | SSE | WS |
|---|---|---|
| Direction | Server → client only | Bidirectional |
| Protocol | HTTP | Upgrade |
| Reconnect | Automatic | Manual |
| Best for | Notifications, prices, logs | Chat, games |

## Typed streams

```ts
type TickEvent = SseStream<{ n: number; ts: number }, "tick">;
stream.sendTyped<TickEvent>({ n: 1, ts: Date.now() });
```
