import "reflect-metadata";
import { Application, Module, Controller, Post, Body, Inject, Injectable } from "@kabyeon/nexusjs";
import { MailService, MailModule, FileTransport } from "@kabyeon/nexusjs/mail";

/**
 * 16-mail — send emails via the file transport (writes to ./outbox).
 *
 *   Run: bun main.ts
 *   Then:
 *     curl -X POST http://localhost:3000/mail \
 *       -H "Content-Type: application/json" \
 *       -d '{"to":"a@b.com","subject":"hi","text":"hello"}'
 */

@Injectable()
@Controller("/mail")
class MailController {
  constructor(@Inject(MailService) private mail: MailService) {}

  @Post("/")
  async send(@Body() body: { to: string; subject: string; text: string }) {
    await this.mail.send({
      from: "noreply@example.com",
      to: body.to,
      subject: body.subject,
      text: body.text,
    });
    return { ok: true };
  }
}

@Module({
  imports: [
    MailModule.forRoot({ transport: new FileTransport({ dir: "./outbox" }) }),
  ],
  controllers: [MailController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);