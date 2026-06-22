# 24 · File Upload

Multipart file upload with `@nexusts/upload`.

## What it shows

- `UploadModule.forRoot({ maxFileSize, accept })` for config
- `@UploadedFile('fieldName')` controller parameter decorator
- Streamed upload (memory-efficient for large files)
- Works with both Bun's `Blob` and Node's `File`

## How to run

```bash
cd examples/24-upload
bun main.ts
```

```bash
# Upload a single file
curl -X POST http://localhost:3000/upload \
  -F "file=@README.md"

# Multiple fields
curl -X POST http://localhost:3000/upload/multi \
  -F "avatar=@avatar.png" \
  -F "resume=@resume.pdf"
```

## Code

```ts
import "reflect-metadata";
import { Application, Module, Controller, Post, Injectable } from "@nexusts/core";
import { UploadModule, UploadedFile } from "@nexusts/upload";

@Injectable()
@Controller("/upload")
class UploadController {
  @Post("/")
  async upload(@UploadedFile("file") file: any) {
    return {
      name: file.name,
      type: file.type,
      size: file.size,
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
      maxFileSize: 50 * 1024 * 1024,   // 50MB
      accept: ["image/*", "application/pdf", "text/*"],
    }),
  ],
  controllers: [UploadController],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);
```

## Saving uploads

```ts
import { writeFile } from "node:fs/promises";

@Post("/")
async upload(@UploadedFile("file") file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(`./uploads/${file.name}`, buffer);
  return { saved: true, name: file.name };
}
```

## Cloud upload (S3)

```ts
import { S3Client } from "bun";

@Post("/")
async upload(@UploadedFile("file") file: File) {
  const s3 = new S3Client({ ... });
  await s3.file(`uploads/${file.name}`, file);
  return { ok: true, key: `uploads/${file.name}` };
}
```
