import "reflect-metadata";
import { Application, Module, Controller, Get, Ctx, Inject, Injectable } from "@kabyeon/nexusjs";
import { I18nModule, I18nService, I18N_SERVICE_TOKEN } from "@kabyeon/nexusjs/i18n";

/**
 * 21-i18n — multi-language messages.
 *
 *   Run: bun main.ts
 *   Try:
 *     curl http://localhost:3000/greet
 *     curl -H "Accept-Language: ko" http://localhost:3000/greet
 *     curl http://localhost:3000/greet?lang=ja
 */

const messages = {
  en: { greeting: "Hello, {name}!" },
  ko: { greeting: "안녕하세요, {name}님!" },
  ja: { greeting: "こんにちは、{name}さん!" },
};

@Injectable()
@Controller("/")
class AppController {
  constructor(@Inject(I18N_SERVICE_TOKEN) private i18n: I18nService) {}

  @Get("/greet")
  greet(@Ctx() c: any) {
    const name = c.req.query("name") || "world";
    const lang = c.req.query("lang") || c.get?.("locale") || "en";
    return { message: this.i18n.t("greeting", { name }, lang) };
  }
}

@Module({
  imports: [I18nModule.forRoot({ defaultLocale: "en", messages })],
  controllers: [AppController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);