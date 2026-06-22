import "reflect-metadata";
import { Application, Module, Controller, Post, Injectable } from "@kabyeon/nexusjs";
import { UploadModule, UploadedFile } from "@kabyeon/nexusjs/upload";

/**
 * 24-upload — file upload via multipart form data.
 *
 *   Run: bun main.ts
 *   Try:
 *     curl -X POST http://localhost:3000/upload -F "file=@README.md"
 *     curl -X POST http://localhost:3000/upload/multi \
 *       -F "avatar=@README.md" -F "resume=@README.md"
 */

@Injectable()
@Controller("/upload")
class UploadController {
  @Post("/")
  async upload(@UploadedFile("file") file: any) {
    return {
      name: file?.name ?? file?.filename,
      type: file?.type,
      size: file?.size,
    };
  }

  @Post("/multi")
  async multi(@UploadedFile("avatar") avatar: any, @UploadedFile("resume") resume: any) {
    return {
      avatar: { name: avatar?.name, size: avatar?.size },
      resume: { name: resume?.name, size: resume?.size },
    };
  }
}

@Module({
  imports: [
    UploadModule.forRoot({
      maxFileSize: 50 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
  controllers: [UploadController],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);