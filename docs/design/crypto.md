# Crypto Module — design

> 한국어 버전: [`crypto.ko.md`](./crypto.ko.md)

This document explains the architecture of `@nexusts/crypto`:
AES-256-GCM encryption, HMAC-based signing, password hashing (scrypt
and argon2), and the purpose-tagged signing scheme.

## Goals

1. **Zero external dependencies for core operations.** AES-256-GCM,
   HMAC-SHA256, and scrypt all come from Node's built-in `crypto`
   module. No `bcrypt`, no `libsodium`.
2. **Purpose-tagged signing.** Every signed value includes a purpose
   tag (e.g., `"csrf"`, `"session"`) so a CSRF token cannot be
   replayed as a session token even if both use the same key.
3. **Two hashing algorithms.** scrypt (default, no deps) and argon2id
   (via optional `@node-rs/argon2` peer dep).
4. **DI integration.** `CryptoModule.forRoot({ key })` wires both
   `EncryptionService` and `HashService` into the container.

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    User code                            │
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
│  Key derivation: HKDF(key, salt, purpose)              │
│    → encryption key (32B AES-256)                      │
│    → signing key   (32B HMAC-SHA256)                   │
│                                                        │
│  encrypt(): AES-256-GCM tag[16] + iv[12] + ciphertext  │
│  sign():     HMAC-SHA256(value + purpose)              │
│                                                        │
│  Uses Node crypto module (zero external deps)          │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│              HashService                                │
│                                                        │
│  hash():  scrypt (default) | argon2id (optional)       │
│  verify(): constant-time comparison                    │
│                                                        │
│  Output format (scrypt):                               │
│    $scrypt$ln=<N>,r=<r>,p=<p>$<salt_b64>$<hash_b64>   │
│                                                        │
│  Argon2: delegated to @node-rs/argon2 (lazy)           │
└────────────────────────────────────────────────────────┘
```

## Key derivation (HKDF)

The master `APP_KEY` (32 bytes, hex-encoded) is provided once to
`CryptoModule.forRoot()`. From it, two sub-keys are derived via
HKDF-SHA256:

```
encryptionKey = HKDF(APP_KEY, salt="nexus-encryption", purpose, 32)
signingKey    = HKDF(APP_KEY, salt="nexus-signing", purpose, 32)
```

Each purpose tag (e.g., `"csrf"`, `"session"`, `"auth"`) produces a
unique pair of sub-keys. This means:

- A token signed for `"csrf"` cannot be verified as `"session"`.
- Compromise of one purpose's signing key does not affect others.
- The same `APP_KEY` is used for all purposes.

## Encryption (AES-256-GCM)

```ts
encrypt(plaintext: string, opts?: EncryptOptions): EncryptedValue
```

Output:

```ts
interface EncryptedValue {
  encrypted: string;  // base64(iv + ciphertext + authTag)
  purpose?: string;   // echoes the purpose tag
}
```

- Algorithm: AES-256-GCM (authenticated encryption).
- IV: 12 random bytes (generated per call).
- Auth tag: 16 bytes (appended after ciphertext).
- Output: `base64(iv + ciphertext + tag)`.

## Signing (HMAC-SHA256)

```ts
sign(value: string, purpose?: string): string
```

Returns `<value>.<base64(HMAC-SHA256(signingKey, value + purpose))>`.

The purpose tag is mixed into the HMAC input, not just the sub-key
derivation. This provides defense-in-depth: even if two purposes
somehow shared a sub-key, the signatures would still differ.

## Password hashing

### scrypt (default)

```ts
const hash = await hashService.hash('my-password');
// → "$scrypt$ln=14,r=8,p=1$<salt_b64>$<hash_b64>"

const ok = await hashService.verify(hash, 'my-password');
// → true
```

Parameters: N=16384, r=8, p=1 (OWASP-recommended minimum). These are
future-proofed via a `HashConfig` interface.

The scrypt output format is self-describing (cost parameters are
embedded), so `verify()` can handle hashes produced with different
costs.

### argon2id (optional)

```ts
CryptoModule.forRoot({
  key: process.env.APP_KEY!,
  hash: { algorithm: 'argon2', timeCost: 3, memoryCost: 2 ** 16 },
});
```

Requires `@node-rs/argon2` as an optional peer dependency. Lazy-loaded
on the first `hash()` call.

## DI integration

```ts
@Module({
  imports: [CryptoModule.forRoot({ key: process.env.APP_KEY! })],
})
export class AppModule {}
```

Registers:

| Token | Service |
|-------|---------|
| `EncryptionService` | Class token |
| `ENCRYPTION_SERVICE_TOKEN` | Symbol alias |
| `HashService` | Class token |
| `HASH_SERVICE_TOKEN` | Symbol alias |
| `"CRYPTO_CONFIG"` | `{ key, hash? }` config |

## Consumption by other modules

| Module | Uses EncryptionService for |
|--------|--------------------------|
| shield | CSRF token signing (`purpose: "csrf"`) |
| session | Session cookie signing (`purpose: "session"`) |
| auth | Token signing (`purpose: "auth"`) |

All three use `purpose`-tagged `sign()` / `unsign()` calls, keeping
each token type isolated.

## Future work

- **Key rotation** — support for multiple active keys and a
  `keyResolver` strategy (latest for encrypt, all for decrypt).
- **Streaming encryption** — `createEncryptStream()` / `createDecryptStream()`
  for large payloads.
- **Asymmetric signing** — Ed25519 / ECDSA support for JWTs.
- **Key derivation from passphrase** — PBKDF2 wrapper for human-memorable
  master keys (lower security, but easier to manage).

## See also

- [`../user-guide/crypto.md`](../user-guide/crypto.md) — user guide
- [`../design/shield.md`](../design/shield.md) — uses CSRF signing
- [`../design/session.md`](../design/session.md) — uses session signing
