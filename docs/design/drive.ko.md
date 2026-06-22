# 드라이브 모듈 — 디자인

> English version: [`drive.md`](./drive.md)

이 문서는 `@nexusts/drive`의 아키텍처를 설명한다:
`StorageDriver` 인터페이스, 세 가지 내장 드라이버, 서명된 URL 추상화,
경로 안전성.

## 목표

1. **통합 파일 스토리지 API.** `put`, `get`, `delete`, `head`, `list`,
   `copy`, `move`, `getSignedUrl` — 백엔드와 무관한 동일한 인터페이스.
2. **플러그 가능한 드라이버.** 로컬 파일시스템, 인메모리, S3 호환 —
   `StorageDriver`를 구현하는 모든 사용자 정의 드라이버.
3. **필수 의존성 없음.** 로컬과 메모리 드라이버는 zero-dep. S3는
   lazy-loaded `@aws-sdk/client-s3` 필요.
4. **경로 traversal 보호.** 파일시스템 드라이버는 `..`와 절대 경로를
   거부해야 함.
5. **서명된 URL 지원.** private 파일을 위한 임시 접근 URL.

## 아키텍처

```
사용자 코드 (DriveService)
  │
  ├── put(key, body, opts?)          ──►  driver.put(...)
  ├── get(key)                       ──►  driver.get(...)
  ├── delete(key)                    ──►  driver.delete(...)
  ├── exists(key)                    ──►  driver.exists(...)
  ├── head(key)                      ──►  driver.head(...)
  ├── list(opts?)                    ──►  driver.list(...)
  ├── getSignedUrl(key, opts?)       ──►  signedUrlBuilder(key, opts)
  ├── copy(src, dest)                ──►  driver.copy(...)
  └── move(src, dest)                ──►  driver.move(...)
```

`DriveService`는 얇은 파사드. 모든 메서드를 underlying 드라이버에 위임.
유일한 예외는 `getSignedUrl` — `signedUrlBuilder`를 거치며, 기본적으로
드라이버에 위임하지만 `DriveConfig`에서 재정의 가능.

## `StorageDriver` 인터페이스

```ts
interface StorageDriver {
  readonly kind: string;
  put(key: string, body: FileContent, opts?: PutOptions): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  head(key: string): Promise<FileMetadata>;
  list(opts?: ListOptions): Promise<ListResult>;
  getSignedUrl(key: string, opts?: SignedUrlOptions): Promise<string>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
}
```

각 드라이버는 9개 메서드 모두 구현. `kind` 속성은 런타임 introspection
과 로깅에 사용.

## 드라이버 비교

| 기능 | LocalDriver | MemoryDriver | S3Driver |
|------|-------------|--------------|----------|
| 영속성 | 파일시스템 | 인-프로세스 | S3/R2/MinIO |
| 서명된 URL | 공개 prefix (noop) | `memory://` sentinel | 진짜 presigned URL |
| 경로 traversal | 차단 | N/A | N/A (키 기반) |
| Listing | 재귀 walk | 키 정렬 | ListObjectsV2 |
| Copy | read+write | Map clone | CopyObject |
| Move | rename() | Map delete+clone | Copy+Delete |
| Peer dep | 없음 | 없음 | @aws-sdk/client-s3 |

## 경로 안전성 (LocalDriver)

```ts
private resolveKey(key: string): string {
  const safe = normalize(key).replace(/^[/\\]+/, '');
  const full = resolve(this.root, safe);
  if (!full.startsWith(this.root + sep) && full !== this.root) {
    throw new Error(`Path traversal blocked: ${key}`);
  }
  return full;
}
```

이 체크는 join 결과를 정규화하고 `root` 내부에 있는지 확인. `resolve`가
`..` 세그먼트를 제거하므로 `../etc/passwd`는 `/var/etc/passwd`가 되어
(`/var/data` 외부) 거부됨.

## S3 lazy 로딩

`S3Driver`는 `@aws-sdk/client-s3`와 `@aws-sdk/s3-request-presigner`를
dynamic `import()`로 lazily 로드:

```ts
private async client() {
  if (this._client) return this._client;
  try {
    const mod = await import('@aws-sdk/client-s3');
    this._client = new mod.S3Client({ ... });
  } catch {
    throw new Error('S3Driver requires @aws-sdk/client-s3. Install with: bun add @aws-sdk/client-s3');
  }
  return this._client;
}
```

이는 다음을 의미:

- S3를 사용하지 않는 사용자는 번들 비용 0.
- 에러 메시지가 명확하고 실행 가능.
- import는 프로세스당 한 번만 (첫 호출에 캐시).

`aws-sdk.d.ts`의 ambient 타입 선언은 실제 패키지 없이 TypeScript 타입을
제공. 타입은 `S3Driver` 내부에서만 사용되며 try/catch로 보호되어 안전.

## 서명된 URL

`signedUrlBuilder` config 옵션이 indirection 지점:

```ts
DriveModule.forRoot({
  driver: new S3Driver({ ... }),
  signedUrlBuilder: async (key, opts) => {
    // 커스텀 URL 로직 (예: CDN 프록시, 커스텀 서명)
    return `https://cdn.example.com/${key}?token=${computeToken(key, opts)}`;
  },
});
```

각 드라이버의 `getSignedUrl` 기본 동작:

| 드라이버 | 기본 동작 |
|----------|---------|
| `LocalDriver` | `publicUrlPrefix + '/' + key` (실제 서명 없음) |
| `MemoryDriver` | `memory://<encoded key>` (sentinel; 서명 없음) |
| `S3Driver` | `@aws-sdk/s3-request-presigner`로 진짜 AWS presigned URL |

`signedUrlBuilder` 오버라이드는 CDN 인증, 커스텀 만료 로직, 외부
서명 서비스와의 통합을 허용.

## Future work

- **스트리밍 read/write** — 큰 파일을 위한
  `createReadStream`/`createWriteStream`.
- **드라이버 미들웨어** — 드라이버 레벨의 암호화, 압축, audit 로깅.
- **Multi-driver** — prefix나 content type에 따라 다른 백엔드로 라우팅
  (예: `hot/` → 메모리, `cold/` → S3).
- **Chunked 업로드** — 100MB 이상 파일을 위한 S3 multipart upload 지원.
- **Visibility flag** — first-class 개념으로 `public` vs `private`
  (S3는 이미 ACL 지원).

## 참고

- [`../user-guide/drive.ko.md`](../user-guide/drive.ko.md) — 사용자 가이드
- [`../user-guide/upload.ko.md`](../user-guide/upload.ko.md) — 파일 업로드 헬퍼
  (별도 모듈)
