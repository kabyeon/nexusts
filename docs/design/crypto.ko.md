# 암호화 모듈 — 디자인

> English version: [`crypto.md`](./crypto.md)

이 문서는 `@nexusts/crypto`의 아키텍처를 설명한다: AES-256-GCM
암호화, HMAC 기반 서명, 패스워드 해싱 (scrypt와 argon2), 그리고
purpose-tagged 서명 스킴.

## 목표

1. **핵심 연산의 zero 외부 의존성.** AES-256-GCM, HMAC-SHA256, scrypt는
   모두 Node의 내장 `crypto` 모듈. `bcrypt`, `libsodium` 없음.
2. **Purpose-tagged 서명.** 모든 서명된 값은 purpose 태그 (예: `"csrf"`,
   `"session"`)를 포함하여, 같은 키를 사용해도 CSRF 토큰이 session 토큰으로
   재생될 수 없음.
3. **두 해싱 알고리즘.** scrypt (기본, 의존성 없음) 및 argon2id
   (옵션 `@node-rs/argon2` peer dep).
4. **DI 통합.** `CryptoModule.forRoot({ key })`가 `EncryptionService`와
   `HashService`를 컨테이너에 연결.

## 아키텍처

```
┌────────────────────────────────────────────────────────┐
│                    사용자 코드                            │
│                                                        │
│  enc.encrypt(plaintext)          → EncryptedValue      │
│  enc.decrypt(EncryptedValue)     → string              │
│  enc.sign(plaintext, purpose?)   → string (signed)     │
│  enc.unsign(signed, purpose?)    → string | null       │
│  enc.signRaw(value, purpose?)    → string (raw HMAC)   │
│  enc.verifyRaw(value, sig, purpose?) → boolean         │
│                                                        │
│  hash.hash(password)             → HashedPassword      │
│  hash.verify(stored, plain)      → boolean             │
└────────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│              EncryptionService                          │
│                                                        │
│  키 유도: HKDF(key, salt, purpose)                     │
│    → encryption key (32B AES-256)                      │
│    → signing key    (32B HMAC-SHA256)                  │
│                                                        │
│  encrypt(): AES-256-GCM tag[16] + iv[12] + ciphertext  │
│  sign():     HMAC-SHA256(value + purpose)              │
│                                                        │
│  Node crypto 모듈 사용 (zero 외부 의존성)               │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│              HashService                                │
│                                                        │
│  hash():  scrypt (기본) | argon2id (옵션)              │
│  verify(): constant-time 비교                          │
│                                                        │
│  출력 형식 (scrypt):                                   │
│    $scrypt$ln=<N>,r=<r>,p=<p>$<salt_b64>$<hash_b64>   │
│                                                        │
│  Argon2: @node-rs/argon2에 위임 (lazy)                │
└────────────────────────────────────────────────────────┘
```

## 키 유도 (HKDF)

마스터 `APP_KEY` (32 바이트, hex 인코딩)는 `CryptoModule.forRoot()`에
한 번 제공. 두 서브 키가 HKDF-SHA256으로 유도:

```
encryptionKey = HKDF(APP_KEY, salt="nexus-encryption", purpose, 32)
signingKey    = HKDF(APP_KEY, salt="nexus-signing", purpose, 32)
```

각 purpose 태그 (예: `"csrf"`, `"session"`, `"auth"`)는 고유한 서브 키
쌍을 생성. 이는 다음을 의미:

- `"csrf"`용 서명된 토큰은 `"session"`으로 검증 불가.
- 한 purpose의 서명 키 손상이 다른 것에 영향 안 줌.
- 같은 `APP_KEY`가 모든 purpose에 사용됨.

## 암호화 (AES-256-GCM)

```ts
encrypt(plaintext: string, opts?: EncryptOptions): EncryptedValue
```

출력:

```ts
interface EncryptedValue {
  encrypted: string;  // base64(iv + ciphertext + authTag)
  purpose?: string;   // purpose 태그 echo
}
```

- 알고리즘: AES-256-GCM (인증된 암호화).
- IV: 12 랜덤 바이트 (호출당 생성).
- 인증 태그: 16 바이트 (ciphertext 뒤에 append).
- 출력: `base64(iv + ciphertext + tag)`.

## 서명 (HMAC-SHA256)

```ts
sign(value: string, purpose?: string): string
```

`<value>.<base64(HMAC-SHA256(signingKey, value + purpose))>` 반환.

purpose 태그는 서브 키 유도만이 아니라 HMAC 입력에도 mixed. defense-in-depth
제공: 두 purpose가 어떻게든 서브 키를 공유해도 서명이 다름.

## 패스워드 해싱

### scrypt (기본)

```ts
const hash = await hashService.hash('my-password');
// → "$scrypt$ln=14,r=8,p=1$<salt_b64>$<hash_b64>"

const ok = await hashService.verify(hash, 'my-password');
// → true
```

파라미터: N=16384, r=8, p=1 (OWASP 권장 최소). `HashConfig` 인터페이스를 통해
future-proof.

scrypt 출력 형식은 self-describing (cost 파라미터가 임베드) — `verify()`가
다른 cost로 생성된 해시도 처리 가능.

### argon2id (옵션)

```ts
CryptoModule.forRoot({
  key: process.env.APP_KEY!,
  hash: { algorithm: 'argon2', timeCost: 3, memoryCost: 2 ** 16 },
});
```

`@node-rs/argon2` 옵션 peer dependency 필요. 첫 `hash()` 호출 시 lazy-loaded.

## DI 통합

```ts
@Module({
  imports: [CryptoModule.forRoot({ key: process.env.APP_KEY! })],
})
export class AppModule {}
```

등록:

| Token | Service |
|-------|---------|
| `EncryptionService` | Class token |
| `ENCRYPTION_SERVICE_TOKEN` | Symbol alias |
| `HashService` | Class token |
| `HASH_SERVICE_TOKEN` | Symbol alias |
| `"CRYPTO_CONFIG"` | `{ key, hash? }` config |

## 다른 모듈에서의 사용

| 모듈 | EncryptionService 사용 |
|------|---------------------|
| shield | CSRF 토큰 서명 (`purpose: "csrf"`) |
| session | Session 쿠키 서명 (`purpose: "session"`) |
| auth | 토큰 서명 (`purpose: "auth"`) |

세 모듈 모두 `purpose`-tagged `sign()` / `unsign()` 호출을 사용하여 각
토큰 타입을 격리.

## Future work

- **키 회전** — 여러 active 키 지원 및 `keyResolver` 전략
  (암호화는 최신, 복호화는 모두).
- **스트리밍 암호화** — 큰 payload를 위한
  `createEncryptStream()` / `createDecryptStream()`.
- **비대칭 서명** — JWT를 위한 Ed25519 / ECDSA 지원.
- **패스프레이즈에서 키 유도** — 인간이 기억 가능한 마스터 키를 위한
  PBKDF2 래퍼 (보안성은 낮지만 관리 쉬움).

## 참고

- [`../user-guide/crypto.ko.md`](../user-guide/crypto.ko.md) — 사용자 가이드
- [`../design/shield.ko.md`](../design/shield.ko.md) — CSRF 서명 사용
- [`../design/session.ko.md`](../design/session.ko.md) — session 서명 사용
