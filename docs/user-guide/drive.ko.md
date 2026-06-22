# 파일 스토리지 · `@nexusts/drive`

> English version: [`drive.md`](./drive.md)

`@nexusts/drive`는 로컬 파일시스템, 인메모리, S3 호환 백엔드
(AWS S3, Cloudflare R2, MinIO)에 걸친 통합 파일 스토리지 추상화를
제공합니다.

---

## 설치

drive 모듈은 `@nexusts/core` **내부**에 포함되어 있습니다 — 로컬 또는
메모리 드라이버 사용 시 추가 설치가 필요 없습니다.

```ts
import { DriveModule } from '@nexusts/drive';
```

S3 선택적 피어 의존성:

```
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## 빠른 시작

### 로컬 파일시스템

```ts
import { Module } from '@nexusts/core';
import { DriveModule, LocalDriver } from '@nexusts/drive';

@Module({
  imports: [
    DriveModule.forRoot({
      driver: new LocalDriver({
        root: '/var/data',
        publicUrlPrefix: '/files',
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 드라이버

### LocalDriver

로컬 파일시스템에 파일을 저장합니다. 경로 탐색(path traversal)이
차단됩니다.

```ts
import { LocalDriver } from '@nexusts/drive';

new LocalDriver({
  root: '/var/data',                       // 스토리지 루트 디렉터리
  publicUrlPrefix: '/files',               // getSignedUrl용 URL 접두사
});
```

### MemoryDriver

인메모리 저장소. 테스트와 임시 상태에 유용합니다.

```ts
import { MemoryDriver } from '@nexusts/drive';

DriveModule.forRoot({
  driver: new MemoryDriver(),
});
```

### S3Driver

AWS S3, Cloudflare R2, MinIO 및 모든 S3 호환 API에서 작동합니다.

```ts
import { S3Driver } from '@nexusts/drive';

DriveModule.forRoot({
  driver: new S3Driver({
    bucket: 'my-bucket',
    region: 'us-east-1',
    endpoint: 'https://my-custom-endpoint.com',  // R2/MinIO용
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }),
});
```

SDK는 느리게 로드됩니다 — 실제로 S3를 사용하기 전까지는 번들에 영향을
주지 않습니다.

---

## 사용법

### 기본 연산

```ts
@Injectable()
class AvatarService {
  constructor(@Inject(DriveService.TOKEN) private drive: DriveService) {}

  async upload(userId: string, bytes: Buffer) {
    const key = `avatars/${userId}.png`;
    await this.drive.put(key, bytes, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=86400',
      metadata: { uploadedBy: userId },
    });
  }
}
```

### 전체 API

```ts
await drive.put('path/to/file.txt', 'Hello, World!', {
  contentType: 'text/plain',
  cacheControl: 'public, max-age=3600',
});

const buffer = await drive.get('path/to/file.txt');
// -> Buffer

const exists = await drive.exists('path/to/file.txt');
// -> boolean

const meta = await drive.head('path/to/file.txt');
// -> { key, size, contentType, lastModified, etag }

const deleted = await drive.delete('path/to/file.txt');
// -> boolean

const result = await drive.list({ prefix: 'avatars/', limit: 100 });
// -> { keys: string[], hasMore: boolean, cursor?: string }

const url = await drive.getSignedUrl('avatars/42.png', {
  expiresIn: 3600,
});
// -> string (임시 접근용 서명된 URL)

await drive.copy('src/path', 'dest/path');
await drive.move('src/path', 'dest/path');
```

### 서명된 URL

```ts
const url = await drive.getSignedUrl('avatars/42.png', {
  expiresIn: 3600,             // 1시간 (기본값)
  asAttachment: 'profile.png', // 강제 다운로드
  contentType: 'image/png',    // 콘텐츠 타입 재정의
});
```

`LocalDriver`의 경우 서명된 URL은 공개 URL 접두사입니다(실제 서명 없음).
`S3Driver`의 경우 실제 사전 서명된 URL이 생성됩니다. 사용자 정의
구현을 위해 설정에서 `signedUrlBuilder`를 제공할 수 있습니다:

```ts
DriveModule.forRoot({
  driver: new S3Driver({...}),
  signedUrlBuilder: async (key, opts) => {
    return `https://cdn.example.com/${key}?token=${sign(key)}`;
  },
});
```

---

## 경로 안전성 (LocalDriver)

경로 탐색(path traversal)이 거부됩니다:

```ts
await drive.get('../etc/passwd');
// 예외 발생: "Path traversal blocked: ../etc/passwd"
```

---

## API 참조

### `DriveModule.forRoot(config)`

| 파라미터 | 타입 | 기본값 | 설명 |
| -------- | ---- | ------ | ---- |
| `driver` | `StorageDriver` | `MemoryDriver` | 스토리지 백엔드 |
| `defaultVisibility` | `'public' \| 'private'` | `'private'` | 기본 가시성 |
| `signedUrlBuilder` | `(key, opts) => Promise<string>` | 드라이버 기본값 | 사용자 정의 URL 빌더 |

### `DriveService`

| 메서드 | 설명 |
| ------ | ---- |
| `put(key, body, opts?)` | 파일 쓰기 |
| `get(key)` | 파일 읽기 → `Buffer` |
| `delete(key)` | 파일 삭제 |
| `exists(key)` | 파일 존재 여부 확인 |
| `head(key)` | 파일 메타데이터 조회 |
| `list(opts?)` | 접두사로 파일 목록 조회 |
| `getSignedUrl(key, opts?)` | 서명된 URL 조회 |
| `copy(src, dest)` | 파일 복사 |
| `move(src, dest)` | 파일 이동/이름 변경 |

### 드라이버

| 드라이버 | 피어 의존성 | 사용 사례 |
| -------- | ---------- | --------- |
| `LocalDriver` | 없음 | 로컬 개발, 단일 서버 |
| `MemoryDriver` | 없음 | 테스트, 임시 상태 |
| `S3Driver` | `@aws-sdk/client-s3` | AWS S3, R2, MinIO |

---

## 참고

- [`../design/drive.md`](../design/drive.md) — 디자인 문서
- [`cross-cutting-features.ko.md`](./cross-cutting-features.ko.md) — 횡단 관심사 모듈 개요
