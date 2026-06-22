# WebSocket 모듈 — 디자인

> English version: [`ws.md`](./ws.md)

이 문서는 `@nexusts/ws`의 아키텍처를 설명한다: gateway
데코레이터 패턴, 런타임 adapter (Bun vs Node), room 기반 broadcasting,
lifecycle 훅.

## 목표

1. **단일 API, 두 런타임.** 같은 `@WebSocketGateway`, 같은 lifecycle
   데코레이터, 같은 broadcasting API — Bun (기본, `Bun.serve` websocket
   사용)과 Node.js (`ws` 패키지 사용)에서 모두 동작.
2. **Gateway 패턴.** 클래스를 `@WebSocketGateway(path)`로 데코레이트하면
   프레임워크가 upgrade, lifecycle, message routing을 처리.
3. **Room 기반 broadcasting.** `joinRoom`, `leaveRoom`, `broadcastToRoom`
   — 외부 의존성 없는 표준 WebSocket room 메커니즘.
4. **Lifecycle 훅.** `@OnWebSocketOpen`, `@OnWebSocketMessage`,
   `@OnWebSocketClose`, `@OnWebSocketError` — 선언적 이벤트 핸들러.
5. **DI 통합.** Gateway는 일반 `@Injectable()` 서비스로 완전한 DI 지원
   (다른 서비스 주입, config 사용 등).

## 아키텍처

```
┌────────────────────────────────────────────────────────┐
│  @WebSocketGateway('/chat')                            │
│  class ChatGateway {                                   │
│    @OnWebSocketOpen() onOpen(client) { ... }           │
│    @OnWebSocketMessage() onMsg(client, data) { ... }   │
│  }                                                     │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│              WebSocketService                           │
│                                                        │
│  joinRoom(client, room)                                │
│  leaveRoom(client, room)                               │
│  broadcastToRoom(room, data)                           │
│  broadcastAll(data)                                    │
│  clientsInRoom(room)                                   │
│                                                        │
│  Internal: Map<roomId, Set<clientId>>                  │
│            Map<clientId, Set<roomId>>                   │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│              Runtime Adapter                            │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  BunWsAdapter    │  │  NodeWsAdapter   │            │
│  │                  │  │                  │            │
│  │  Bun.serve WS    │  │  ws (npm)        │            │
│  │  detectRuntime   │  │  multi-server    │            │
│  │  = 'bun'         │  │  = 'node'        │            │
│  └──────────────────┘  └──────────────────┘            │
└────────────────────────────────────────────────────────┘
```

## 런타임 감지

`detectRuntime()`이 feature detection 사용:

```ts
function detectRuntime(): WsRuntime {
  if (typeof Bun !== 'undefined' && Bun.websocket) return 'bun';
  if (typeof WebSocketServer !== 'undefined') return 'node';
  return 'bun'; // 기본
}
```

### Bun adapter

Hono의 `upgradeWebSocket()` 헬퍼와 `Bun.serve()`의 네이티브 `websocket`
핸들러 사용. Adapter는:

1. Hono 미들웨어에서 WebSocket upgrade 요청을 가로챔.
2. `Bun.serve()`용 `websocket` config 객체 반환.
3. lifecycle 이벤트를 gateway의 데코레이트된 메서드로 라우팅.

### Node adapter

`ws` npm 패키지의 `WebSocketServer` 사용. Adapter는:

1. Node HTTP 서버의 `upgrade` 이벤트 리스닝.
2. `connection`, `message`, `close`, `error` 이벤트 처리.
3. gateway로 라우팅.

Node는 추가 peer dependency 필요: `bun add ws`.

## Gateway lifecycle

```
1. 클라이언트 연결 → upgrade 요청
2. 서버 upgrade → @OnWebSocketOpen(client)
3. 클라이언트 발송 → @OnWebSocketMessage(client, data)
4. 클라이언트 연결 해제 → @OnWebSocketClose(client)
5. 에러 발생 → @OnWebSocketError(client, error)
```

각 gateway 메서드는 `WebSocketClient` 객체 수신:

```ts
interface WebSocketClient {
  id: string;            // 고유 연결 ID
  send(data: any): void; // JSON 또는 raw 데이터 발송
  close(): void;         // 연결 종료
  readyState: number;    // CONNECTING, OPEN, CLOSING, CLOSED
}
```

## Room 관리

Room은 양방향 맵으로 인-프로세스 추적:

- `rooms: Map<roomId, Set<clientId>>` — 각 room의 멤버
- `clientRooms: Map<clientId, Set<roomId>>` — 클라이언트가 속한 room

연결 해제 시 `leaveAllRooms(client)`가 자동 호출되어 양쪽 맵 모두 정리.

```ts
const ws = container.resolve(WebSocketService);

// join / leave
ws.joinRoom(client, 'lobby');
ws.leaveRoom(client, 'lobby');

// broadcast
ws.broadcastToRoom('lobby', { type: 'chat', text: 'Hello!' });
ws.broadcastAll({ type: 'announcement', text: 'Server restarting' });

// 검사
const clients = ws.clientsInRoom('lobby'); // WebSocketClient[]
```

## 메시지 직렬화

모든 메시지는 기본적으로 JSON으로 직렬화. `send()` 메서드는
`JSON.stringify()` 가능한 모든 값 수용.

Future: `binary` 플래그 옵트인으로 `ArrayBuffer`, `Buffer` 등 바이너리 프레임 지원.

## DI 통합

```
ApplicationContainer
  └── ConfiguredWsModule
        ├── WebSocketService
        ├── WEBSOCKET_SERVICE_TOKEN (Symbol alias)
        └── Gateway 클래스 (provider로 주입됨)
```

Gateway는 `WebSocketModule.forRoot()`을 통해 DI provider로 등록. 모듈은
각 gateway 인스턴스를 해석하고 `install()` 중에 메타데이터를 읽음
(`getGatewayPath`, `getLifecycleHandlers`).

## 메타데이터 흐름

데코레이터는 `Reflect.defineMetadata`로 메타데이터 저장:

| 데코레이터 | 저장 |
|-----------|------|
| `@WebSocketGateway(path)` | 클래스의 path |
| `@OnWebSocketOpen()` | `onOpen` 배열의 메서드 키 |
| `@OnWebSocketMessage()` | `onMessage` 배열의 메서드 키 |
| `@OnWebSocketClose()` | `onClose` 배열의 메서드 키 |
| `@OnWebSocketError()` | `onError` 배열의 메서드 키 |

`getLifecycleHandlers(instance)`는 4개 배열 모두 읽어 바인딩된 메서드를 가진
`WsLifecycleHandlers` 객체 반환.

## Future work

- **바이너리 프레임** — `ArrayBuffer`, `Blob`, streaming 지원.
- **네임스페이스 room** — gateway path별 스코프 (예: `/chat/lobby` vs
  `/game/lobby`).
- **Auto-reconnect** — resiliency를 위한 클라이언트측 헬퍼.
- **연결당 rate limiting** — `nexusts/limiter`와 통합하여 WebSocket 메시지
  rate limit.
- **통계** — 활성 연결, messages/sec, room 크기.

## 참고

- [`../user-guide/ws.ko.md`](../user-guide/ws.ko.md) — 사용자 가이드
- [`../design/sse.ko.md`](../design/sse.ko.md) — Server-Sent Events
  (WebSocket의 대안)
