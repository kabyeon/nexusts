# 메일 모듈 — 디자인

> English version: [`mail.md`](./mail.md)

이 문서는 `@nexusts/mail`의 아키텍처를 설명한다: `MailTransport`
인터페이스, 세 가지 내장 transport, MJML 통합, zero 의존성 설계.

## 목표

1. **플러그 가능한 transport.** 프로덕션용 SMTP, 개발용 `.eml` 파일,
   테스트용 null — 그리고 `MailTransport`를 구현하는 모든 사용자 정의
   transport.
2. **필수 의존성 없음.** `NullTransport`와 `FileTransport`는 zero peer
   dependency. `SmtpTransport`는 `nodemailer`를 lazily 로드. `mjml`도
   lazy.
3. **일괄 발송.** 단일 호출로 여러 수신자에게 동일 메시지 발송.
4. **MJML 템플릿.** 옵션 `mjml` 패키지로 반응형 HTML 이메일 템플릿 렌더.

## 아키텍처

```
사용자 코드 (MailService)
  │
  ├── send(msg)              ──►  transport.send(msg)
  ├── sendBatch(msg, to[])   ──►  transport.send(msg) × n
  └── renderMjml(tpl)        ──►  mjml.mjml2html(tpl)

                  │
                  ▼
              MailTransport
          ┌──────────────────────┐
          │ SmtpTransport        │  ← nodemailer (lazy)
          │ FileTransport        │  ← .eml 출력
          │ NullTransport        │  ← 삭제 + 캡처
          │ CustomTransport      │  ← MailTransport 구현
          └──────────────────────┘
```

## `MailTransport` 인터페이스

```ts
interface MailTransport {
  readonly kind: string;
  send(msg: MailMessage): Promise<MailSendResult>;
  close?(): Promise<void>;
}
```

의도적으로 minimal. 세 메서드 (`send` + 옵션 `close`), 한 입력 타입
(`MailMessage`), 한 결과 타입 (`MailSendResult`).

## 메시지 포맷

```ts
interface MailMessage {
  from?: MailAddress;
  to: MailAddress | MailAddress[];
  cc?: MailAddress | MailAddress[];
  bcc?: MailAddress | MailAddress[];
  replyTo?: MailAddress;
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}
```

`text`와 `html` 둘 다 지원. 모던 메일 클라이언트는 HTML 버전을 표시;
text 버전은 레거시 클라이언트와 접근성용.

## Transport 비교

| 기능 | SmtpTransport | FileTransport | NullTransport |
|------|---------------|---------------|---------------|
| 발송 | SMTP 서버 | `.eml` 파일 | 인메모리 캡처 |
| Peer dep | nodemailer | 없음 | 없음 |
| 사용 사례 | 프로덕션 | 개발 | 테스트 |
| 메시지 캡처 | 아니오 (transient) | 파일 시스템 | `transport.sent[]` |
| Connection pool | 설정 가능 | N/A | N/A |
| 첨부 파일 | 완전 지원 | .eml에 인라인 | 메모리에 캡처 |

### SmtpTransport

- nodemailer의 `createTransport()` 사용 (SMTP 또는 nodemailer가 지원하는
  모든 transport: SendGrid, Mailgun, SES via extras).
- `pool: true` / `maxConnections`로 connection pooling.
- nodemailer lazy-load — import와 transport 생성은 첫 `send()` 호출 시.
- 타입드 인터페이스로 다루지 않는 nodemailer 옵션을 위한 `extras` 수용.

### FileTransport

- 설정 가능한 디렉토리에 `.eml` 파일 작성.
- 각 파일은 RFC 5322 헤더 (From, To, Subject, Date)와 본문 포함.
- 파일명은 고유성을 위해 `<timestamp>-<random>.eml`.
- 시각적 regression 테스트와 개발 미리보기에 유용.

### NullTransport

- 모든 메시지 삭제 — zero I/O.
- 테스트 assertion을 위해 `transport.sent[]`에 메시지 캡처.
- config 없을 때 기본 transport.

## MJML 통합

`mail.renderMjml()`이 `mjml`을 dynamic import:

```ts
async renderMjml(template: string): Promise<string> {
  try {
    const mod = await import('mjml');
    const { html } = mod.mjml2html(template);
    return html;
  } catch {
    throw new Error(
      "renderMjml requires the 'mjml' package. Install it with: bun add mjml"
    );
  }
}
```

Import는 사람이 읽을 수 있는 에러를 생성하는 try/catch로 감쌈. MJML 자체는
한 번 로드되어 캐시.

## 주소 포맷

```ts
type MailAddress = string | { name?: string; address: string };
```

`SmtpTransport`와 `FileTransport`는 모두 SMTP 헤더용 `"Name <addr>"`
포맷으로 주소를 정규화. `NullTransport`는 그대로 유지.

## Future work

- **템플릿 엔진 통합** — 발송 전 view engine에서 Handlebars/Mustache/
  Vento 템플릿 resolve.
- **이메일 큐** — 신뢰성과 rate limiting을 위해 `nexusts/queue` 모듈을
  통한 발송 defer.
- **Open/track** — transparent pixel + click tracking (opt-in).
- **Mailgun / SES / SendGrid transport** — 해당 API를 직접 wrap하는
  얇은 어댑터 (nodemailer 없이).
- **첨부 파일 스트리밍** — 큰 첨부를 위한 `ReadableStream` 수용.

## 참고

- [`../user-guide/mail.ko.md`](../user-guide/mail.ko.md) — 사용자 가이드
- [`../user-guide/queue.ko.md`](../user-guide/queue.ko.md) — queue 모듈 (지연 메일용)
- [`../user-guide/view-engines.ko.md`](../user-guide/view-engines.ko.md) — 템플릿 렌더링
