import "reflect-metadata";
import { Application, Module, Controller, Get, Post, Param, Body, Inject, Injectable } from "@kabyeon/nexusjs";
import { DriveService, DriveModule } from "@kabyeon/nexusjs/drive";

/**
 * 15-drive — local disk file storage.
 *
 *   Run: bun main.ts
 */

@Injectable()
@Controller("/files")
class FileController {
  constructor(@Inject(DriveService) private drive: DriveService) {}

  @Post("/:name")
  async upload(@Param("name") name: string, @Body() content: any) {
    const path = `uploads/${name}`;
    await this.drive.put(path, content);
    return { ok: true, path };
  }

  @Get("/:name")
  async read(@Param("name") name: string) {
    const path = `uploads/${name}`;
    if (!await this.drive.exists(path)) return { ok: false };
    const content = await this.drive.get(path);
    return { ok: true, content };
  }
}

@Module({
  // Use default (in-memory) driver. For local disk or S3, build a driver instance.
  imports: [DriveModule.forRoot()],
  controllers: [FileController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);