# Drive Module — design

> 한국어 버전: [`drive.ko.md`](./drive.ko.md)

This document explains the architecture of `@nexusts/drive`:
the `StorageDriver` interface, the three built-in drivers, the
signed URL abstraction, and path safety.

## Goals

1. **Unified file storage API.** `put`, `get`, `delete`, `head`, `list`,
   `copy`, `move`, `getSignedUrl` — identical interface regardless of
   backend.
2. **Pluggable drivers.** Local filesystem, in-memory, S3-compatible —
   and any custom driver implementing `StorageDriver`.
3. **No mandatory dependencies.** Local and memory drivers are zero-dep.
   S3 requires `@aws-sdk/client-s3` loaded lazily.
4. **Path traversal protection.** Filesystem drivers must reject `..`
   and absolute paths.
5. **Signed URL support.** Temporary access URLs for private files.

## Architecture

```
User code (DriveService)
  │
  ├── put(key, body, opts?)          ──►  driver.put(...)
  ├── get(key)                       ──►  driver.get(...)
  ├── delete(key)                    ──►  driver.delete(...)
  ├── exists(key)                    ──►  driver.exists(...)
  ├── head(key)                      ──►  driver.head(...)
  ├── list(opts?)                    ──►  driver.list(...)
  ├── getSignedUrl(key, opts?)       ──►  signedUrlBuilder(key, opts)
  ├── copy(src, dest)                ──►  driver.copy(...)
  └── move(src, dest)                ──►  driver.move(...)
```

`DriveService` is a thin façade. It delegates every method to the
underlying driver. The only exception is `getSignedUrl` — it goes
through `signedUrlBuilder`, which by default delegates to the driver
but can be overridden in `DriveConfig`.

## The `StorageDriver` interface

```ts
interface StorageDriver {
  readonly kind: string;
  put(key: string, body: FileContent, opts?: PutOptions): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  head(key: string): Promise<FileMetadata>;
  list(opts?: ListOptions): Promise<ListResult>;
  getSignedUrl(key: string, opts?: SignedUrlOptions): Promise<string>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
}
```

Each driver implements all nine methods. The `kind` property is used
for runtime inspection and logging.

## Driver comparison

| Feature | LocalDriver | MemoryDriver | S3Driver |
|---------|-------------|--------------|----------|
| Persistence | Filesystem | In-process | S3/R2/MinIO |
| Signed URLs | Public prefix (noop) | `memory://` sentinel | True presigned URLs |
| Path traversal | Blocked | N/A | N/A (key-based) |
| Listing | Recursive walk | Key sort | ListObjectsV2 |
| Copy | Read+write | Map clone | CopyObject |
| Move | rename() | Map delete+clone | Copy+Delete |
| Peer dep | None | None | @aws-sdk/client-s3 |

## Path safety (LocalDriver)

```ts
private resolveKey(key: string): string {
  const safe = normalize(key).replace(/^[/\\]+/, '');
  const full = resolve(this.root, safe);
  if (!full.startsWith(this.root + sep) && full !== this.root) {
    throw new Error(`Path traversal blocked: ${key}`);
  }
  return full;
}
```

The check normalizes the join result and verifies it's inside `root`.
`resolve` removes `..` segments, so `../etc/passwd` becomes
`/var/etc/passwd` (outside `/var/data`) and is rejected.

## S3 lazy loading

The `S3Driver` loads `@aws-sdk/client-s3` and
`@aws-sdk/s3-request-presigner` lazily via dynamic `import()`:

```ts
private async client() {
  if (this._client) return this._client;
  try {
    const mod = await import('@aws-sdk/client-s3');
    this._client = new mod.S3Client({ ... });
  } catch {
    throw new Error('S3Driver requires @aws-sdk/client-s3. Install with: bun add @aws-sdk/client-s3');
  }
  return this._client;
}
```

This means:

- Users who don't use S3 pay zero bundle cost.
- The error message is clear and actionable.
- The import happens once per process (cached on first call).

The ambient type declarations in `aws-sdk.d.ts` provide TypeScript
types without the actual package. This is safe because the types are
only used inside `S3Driver` which is guarded by the try/catch.

## Signed URLs

The `signedUrlBuilder` config option is the indirection point:

```ts
DriveModule.forRoot({
  driver: new S3Driver({ ... }),
  signedUrlBuilder: async (key, opts) => {
    // Custom URL logic (e.g., CDN proxy, custom signing)
    return `https://cdn.example.com/${key}?token=${computeToken(key, opts)}`;
  },
});
```

Each driver's `getSignedUrl` default behavior:

| Driver | Default behavior |
|--------|-----------------|
| `LocalDriver` | `publicUrlPrefix + '/' + key` (no actual signing) |
| `MemoryDriver` | `memory://<encoded key>` (sentinel; no signing) |
| `S3Driver` | True AWS presigned URL via `@aws-sdk/s3-request-presigner` |

The `signedUrlBuilder` override allows CDN authentication, custom
expiry logic, or integration with external signing services.

## Future work

- **Streaming reads/writes** — `createReadStream`/`createWriteStream`
  for large files.
- **Driver middleware** — encryption, compression, audit logging at
  the driver level.
- **Multi-driver** — route files to different backends based on
  prefix or content type (e.g., `hot/` → memory, `cold/` → S3).
- **Chunked upload** — S3 multipart upload support for files > 100MB.
- **Visibility flags** — `public` vs `private` as a first-class
  concept in the driver interface (S3 already supports ACL).

## See also

- [`../user-guide/drive.md`](../user-guide/drive.md) — user guide
- [`../user-guide/upload.md`](../user-guide/upload.md) — file upload helper (separate module)
