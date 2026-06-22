import "reflect-metadata";
import { Application, Module, Controller, Post, Body, Inject, Injectable } from "@nexusts/core";
import { EncryptionService, HashService, CryptoModule } from "@nexusts/crypto";

/**
 * 22-crypto — encryption + password hashing.
 *
 *   Run: bun main.ts
 *   Try:
 *     curl -X POST http://localhost:3000/encrypt \
 *       -H "Content-Type: application/json" -d '{"plain":"hello"}'
 *     curl -X POST http://localhost:3000/hash \
 *       -H "Content-Type: application/json" -d '{"password":"secret123"}'
 */

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
      key: "0123456789abcdef0123456789abcdef",
    }),
  ],
  controllers: [CryptoController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);