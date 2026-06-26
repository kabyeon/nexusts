import { Application, Module, Controller, Post, Inject, Injectable } from "@nexusts/core";
import { EncryptionService, HashService, CryptoModule } from "@nexusts/crypto";
import type { Context } from "hono";

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
  @Inject(EncryptionService.TOKEN) declare enc: EncryptionService;
  @Inject(HashService.TOKEN) declare hashService: HashService;

  @Post("/encrypt")
  async encrypt(ctx: Context) {
    const body = await ctx.req.json() as { plain: string };
    return { value: this.enc.encrypt(body.plain) };
  }

  @Post("/decrypt")
  async decrypt(ctx: Context) {
    const body = await ctx.req.json() as { value: string };
    return { plain: this.enc.decrypt(body.value) };
  }

  @Post("/hash")
  async hash(ctx: Context) {
    const body = await ctx.req.json() as { password: string };
    return { value: await this.hashService.hash(body.password) };
  }

  @Post("/verify")
  async verify(ctx: Context) {
    const body = await ctx.req.json() as { password: string; value: string };
    return { valid: await this.hashService.verify(body.value, body.password) };
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
