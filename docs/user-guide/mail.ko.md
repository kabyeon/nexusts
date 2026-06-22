# 이메일 · `@nexusts/mail`

> English version: [`mail.md`](./mail.md)

`@nexusts/mail`은 플러그 가능한 트랜스포트를 갖춘 발신 이메일
전송을 제공합니다: SMTP(nodemailer 기반), 개발용 파일 기반 `.eml` 출력,
테스트용 널 트랜스포트.

---

## 설치

mail 모듈은 `@nexusts/core` **내부**에 포함되어 있습니다 — 파일 또는
널 트랜스포트 사용 시 추가 설치가 필요 없습니다.

```ts
import { MailModule } from '@nexusts/mail';
```

선택적 피어 의존성:

```
bun add nodemailer              # SmtpTransport 사용 시
bun add mjml                    # renderMjml() 사용 시
```

---

## 빠른 시작

```ts
import { Module } from '@nexusts/core';
import { MailModule, NullTransport } from '@nexusts/mail';

@Module({
  imports: [
    MailModule.forRoot({
      transport: new NullTransport(),       // 모든 메일 폐기
      defaultFrom: 'no-reply@example.com',
    }),
  ],
})
export class AppModule {}
```

---

## 트랜스포트

### SMTP (프로덕션)

```ts
import { SmtpTransport } from '@nexusts/mail';

MailModule.forRoot({
  transport: new SmtpTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,                          // 465는 true, 587은 false
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    pool: true,                            // 연결 풀
    maxConnections: 5,
  }),
  defaultFrom: 'no-reply@example.com',
});
```

### 파일 트랜스포트 (개발)

모든 발신 메시지를 `.eml` 파일로 기록합니다:

```ts
import { FileTransport } from '@nexusts/mail';

MailModule.forRoot({
  transport: new FileTransport({
    dir: './tmp/mail',                     // 출력 디렉터리
    includeHeaders: true,                  // 헤더가 포함된 전체 .eml
  }),
});
```

각 파일은 `<timestamp>-<random>.eml` 이름으로 생성되며, 모든 메일
클라이언트(Thunderbird, Outlook, Apple Mail)에서 열거나 일반 텍스트로
읽을 수 있습니다.

### 널 트랜스포트 (테스트)

모든 메시지를 폐기합니다. 전송된 메시지를 검사용으로 캡처:

```ts
import { NullTransport } from '@nexusts/mail';

const transport = new NullTransport();

MailModule.forRoot({ transport });

// 테스트에서:
const mailService = container.resolve(MailService);
await mailService.send({ to: 'test@example.com', subject: 'Hi', html: '...' });
console.log(transport.sent.length);  // -> 1
```

---

## 메일 발송

```ts
@Injectable()
class AuthMailer {
  constructor(@Inject(MailService.TOKEN) private mail: MailService) {}

  async sendWelcome(to: string, name: string) {
    await this.mail.send({
      to,
      subject: '환영합니다!',
      html: `<h1>안녕하세요 ${name}님!</h1><p>가입해주셔서 감사합니다.</p>`,
      text: `안녕하세요 ${name}님! 가입해주셔서 감사합니다.`,
      attachments: [
        { filename: 'logo.png', content: pngBuffer, cid: 'logo' },
      ],
    });
  }
}
```

### 배치 발송

```ts
await mail.sendBatch(
  { subject: '뉴스레터', html: '<h1>월간 업데이트</h1>' },
  ['alice@example.com', 'bob@example.com'],
);
```

수신자당 하나의 엔벨로프를 발송합니다.

---

## MJML 템플릿

MJML로 반응형 HTML 이메일 템플릿 렌더링:

```ts
const html = await mail.renderMjml(`
  <mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text>안녕하세요 {{name}}님</mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
`);
```

`mjml`은 선택적 피어 의존성입니다. 필요할 때만 설치하세요:

```
bun add mjml
```

설치되지 않은 경우 `renderMjml()`이 설치 안내와 함께 명확한 오류를
던집니다.

---

## 메시지 형식

```ts
interface MailMessage {
  from?: MailAddress;
  to: MailAddress | MailAddress[];
  cc?: MailAddress | MailAddress[];
  bcc?: MailAddress | MailAddress[];
  replyTo?: MailAddress;
  subject: string;
  text?: string;            // 일반 텍스트 버전
  html?: string;            // HTML 버전
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}
```

`MailAddress`는 문자열(`'user@example.com'`) 또는 `name`과 `address`를
가진 객체(`{ name: 'Alice', address: 'alice@example.com' }`)일 수 있습니다.

### 첨부 파일

```ts
{
  filename: 'report.pdf',
  content: pdfBuffer,       // Buffer 또는 string
  contentType: 'application/pdf',
  cid: 'attachment1',       // Content-ID (인라인 이미지용)
}
```

---

## API 참조

### `MailModule.forRoot(config)`

| 파라미터 | 타입 | 기본값 | 설명 |
| -------- | ---- | ------ | ---- |
| `transport` | `MailTransport` | `NullTransport` | 메일 트랜스포트 |
| `defaultFrom` | `MailAddress` | `undefined` | 기본 발신자 주소 |

### `MailService`

| 메서드 | 설명 |
| ------ | ---- |
| `send(msg)` | 단일 메시지 발송 |
| `sendBatch(msg, recipients)` | 여러 수신자에게 발송 |
| `renderMjml(template, vars?)` | MJML을 HTML로 컴파일 |

### 트랜스포트

| 트랜스포트 | 피어 의존성 | 사용 사례 |
| ---------- | ---------- | --------- |
| `NullTransport` | 없음 | 테스트 |
| `FileTransport` | 없음 | 개발 |
| `SmtpTransport` | `nodemailer` | 프로덕션 SMTP |

---

## 참고

- [`../design/mail.md`](../design/mail.md) — 디자인 문서
- [`cross-cutting-features.ko.md`](./cross-cutting-features.ko.md) — 횡단 관심사 모듈 개요
