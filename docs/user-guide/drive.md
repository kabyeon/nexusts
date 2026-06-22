# File Storage · `@nexusts/drive`

> 한국어 버전: [`drive.ko.md`](./drive.ko.md)

`@nexusts/drive` provides a unified file storage abstraction
across local filesystem, in-memory, and S3-compatible backends (AWS S3,
Cloudflare R2, MinIO).

---

## Installation

The drive module ships **inside** `@nexusts/core` — no extra install
is needed for local or memory drivers.

```ts
import { DriveModule } from '@nexusts/drive';
```

Optional peer dependency for S3:

```
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Quick start

### Local filesystem

```ts
import { Module } from '@nexusts/core';
import { DriveModule, LocalDriver } from '@nexusts/drive';

@Module({
  imports: [
    DriveModule.forRoot({
      driver: new LocalDriver({
        root: '/var/data',
        publicUrlPrefix: '/files',
      }),
    }),
  ],
})
export class AppModule {}
```

---

## Drivers

### LocalDriver

Stores files on the local filesystem. Path traversal is blocked.

```ts
import { LocalDriver } from '@nexusts/drive';

new LocalDriver({
  root: '/var/data',                       // Storage root directory
  publicUrlPrefix: '/files',               // URL prefix for getSignedUrl
});
```

### MemoryDriver

In-memory store. Useful for tests and ephemeral state.

```ts
import { MemoryDriver } from '@nexusts/drive';

DriveModule.forRoot({
  driver: new MemoryDriver(),
});
```

### S3Driver

Works with AWS S3, Cloudflare R2, MinIO, and any S3-compatible API.

```ts
import { S3Driver } from '@nexusts/drive';

DriveModule.forRoot({
  driver: new S3Driver({
    bucket: 'my-bucket',
    region: 'us-east-1',
    endpoint: 'https://my-custom-endpoint.com',  // For R2/MinIO
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }),
});
```

The SDK is loaded lazily — the bundle impact is zero until you actually
use S3.

---

## Usage

### Basic operations

```ts
@Injectable()
class AvatarService {
  constructor(@Inject(DriveService.TOKEN) private drive: DriveService) {}

  async upload(userId: string, bytes: Buffer) {
    const key = `avatars/${userId}.png`;
    await this.drive.put(key, bytes, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=86400',
      metadata: { uploadedBy: userId },
    });
  }
}
```

### Full API

```ts
await drive.put('path/to/file.txt', 'Hello, World!', {
  contentType: 'text/plain',
  cacheControl: 'public, max-age=3600',
});

const buffer = await drive.get('path/to/file.txt');
// -> Buffer

const exists = await drive.exists('path/to/file.txt');
// -> boolean

const meta = await drive.head('path/to/file.txt');
// -> { key, size, contentType, lastModified, etag }

const deleted = await drive.delete('path/to/file.txt');
// -> boolean

const result = await drive.list({ prefix: 'avatars/', limit: 100 });
// -> { keys: string[], hasMore: boolean, cursor?: string }

const url = await drive.getSignedUrl('avatars/42.png', {
  expiresIn: 3600,
});
// -> string (signed URL for temporary access)

await drive.copy('src/path', 'dest/path');
await drive.move('src/path', 'dest/path');
```

### Signed URLs

```ts
const url = await drive.getSignedUrl('avatars/42.png', {
  expiresIn: 3600,             // 1 hour (default)
  asAttachment: 'profile.png', // force download
  contentType: 'image/png',    // override content type
});
```

For `LocalDriver`, the signed URL is a public URL prefix (no actual
signing). For `S3Driver`, a true presigned URL is generated. For custom
implementations, provide a `signedUrlBuilder` in the config:

```ts
DriveModule.forRoot({
  driver: new S3Driver({...}),
  signedUrlBuilder: async (key, opts) => {
    return `https://cdn.example.com/${key}?token=${sign(key)}`;
  },
});
```

---

## Path safety (LocalDriver)

Path traversal is rejected:

```ts
await drive.get('../etc/passwd');
// Throws: "Path traversal blocked: ../etc/passwd"
```

---

## API Reference

### `DriveModule.forRoot(config)`

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `driver` | `StorageDriver` | `MemoryDriver` | Storage backend |
| `defaultVisibility` | `'public' \| 'private'` | `'private'` | Default visibility |
| `signedUrlBuilder` | `(key, opts) => Promise<string>` | Driver default | Custom URL builder |

### `DriveService`

| Method | Description |
| ------ | ----------- |
| `put(key, body, opts?)` | Write a file |
| `get(key)` | Read a file → `Buffer` |
| `delete(key)` | Delete a file |
| `exists(key)` | Check if a file exists |
| `head(key)` | Get file metadata |
| `list(opts?)` | List files with prefix |
| `getSignedUrl(key, opts?)` | Get a signed URL |
| `copy(src, dest)` | Copy a file |
| `move(src, dest)` | Move/rename a file |

### Drivers

| Driver | Peer dep | Use case |
| ------ | -------- | -------- |
| `LocalDriver` | None | Local development, single-server |
| `MemoryDriver` | None | Tests, ephemeral |
| `S3Driver` | `@aws-sdk/client-s3` | AWS S3, R2, MinIO |

---

## See also

- [`../design/drive.md`](../design/drive.md) — design document
- [`cross-cutting-features.md`](./cross-cutting-features.md) — overview of all cross-cutting modules
