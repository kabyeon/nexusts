# 22 · Crypto

Encryption and password hashing with `@nexusts/crypto`.

## What it shows

- `EncryptionService` for AES-GCM symmetric encryption
- `HashService` for Argon2id password hashing
- `signRaw()` / `verifyRaw()` for HMAC-SHA256 signatures (used for session cookies)

## How to run

```bash
cd examples/22-crypto
bun main.ts
```

```bash
# Encrypt / decrypt
curl -X POST http://localhost:3000/encrypt -H "Content-Type: application/json" -d '{"plain":"hello"}'
curl -X POST http://localhost:3000/decrypt -H "Content-Type: application/json" -d '{"cipher":"...","iv":"...","tag":"..."}'

# Hash a password and verify
curl -X POST http://localhost:3000/hash -H "Content-Type: application/json" -d '{"password":"secret123"}'
curl -X POST http://localhost:3000/verify -H "Content-Type: application/json" -d '{"password":"secret123","hash":"..."}'
```

## Code

```ts
import "reflect-metadata";
import { Application, Module, Controller, Post, Body, Inject, Injectable } from "@nexusts/core";
import { EncryptionService, HashService, CryptoModule } from "@nexusts/crypto";

@Injectable()
@Controller("/")
class CryptoController {
  constructor(
    @Inject(EncryptionService.TOKEN) private enc: EncryptionService,
    @Inject(HashService.TOKEN) private hash: HashService,
  ) {}

  @Post("/encrypt")
  encrypt(@Body() body: { plain: string }) {
    return { value: this.enc.encrypt(body.plain) };
  }

  @Post("/decrypt")
  decrypt(@Body() body: { value: string }) {
    return { plain: this.enc.decrypt(body.value) };
  }

  @Post("/hash")
  async hash(@Body() body: { password: string }) {
    return { value: await this.hash.make(body.password) };
  }

  @Post("/verify")
  async verify(@Body() body: { password: string; value: string }) {
    return { valid: await this.hash.verify(body.password, body.value) };
  }
}

@Module({
  imports: [
    CryptoModule.forRoot({
      key: "0123456789abcdef0123456789abcdef",  // 32 bytes (256 bits)
    }),
  ],
  controllers: [CryptoController],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);
```

## Key derivation

```ts
const key = EncryptionService.deriveKey(passphrase, { salt: "..." });
// Use this 32-byte key for AES-GCM
```

## Password hashing

```ts
// Argon2id (default) — secure for user passwords
const hash = await hashService.make(plaintext);

// Verify constant-time
const valid = await hashService.verify(plaintext, hash);
```

## Sign/verify (HMAC)

```ts
// Used internally for session cookies
const sig = enc.signRaw(payload, "purpose:cookie");
const ok = enc.verifyRaw(payload, sig, "purpose:cookie");
```
