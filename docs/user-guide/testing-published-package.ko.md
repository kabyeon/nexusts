# 로컬에서 publish된 패키지 테스트하기

> English version: [`testing-published-package.md`](./testing-published-package.md)

모듈을 수정하면 **publish된 형태 그대로** 동작하는지 검증해야 합니다. `bun run test`는
monorepo 내부의 `src/`를 테스트하지만, 다음 문제는 잡지 못합니다:

- `package.json` `exports` 필드 오설정
- `tsconfig.build.json` / `outDir` 불일치
- `dist/` 평탄화 단계 (build.ts phase 3)
- peer-dep 처리 (zod 버전 충돌, optional peer deps)
- CJS / ESM resolution 엣지 케이스

이 가이드는 **`dist/` 폴더를 npm에 publish된 것처럼 테스트하는 3가지 방법**을
설명합니다. 워크플로우에 맞는 방법을 선택하세요.

---

## 한눈에 — 어떤 방법을 써야 하나?

| 워크플로우 | 방법 |
| ---------- | ---- |
| **모듈 개발 중** (빌드 → 테스트 → 수정 → 반복) | `bun link` |
| **PR 전 consumer 시나리오 점검** | `file:` 프로토콜 |
| **publish 직전 최종 확인** (`npm publish`와 100% 동일) | `npm pack` + tarball |

---

## 방법 1 — `bun link` (개발용으로 추천)

`dist/` rebuild에 살아남는 symlink. 한 번만 설정하면 끝.

### 1회 설정

```bash
# framework 저장소에서
bun run build
cd dist
bun link
cd ..

# 테스트 앱에서
mkdir ~/nexusts-sandbox && cd ~/nexusts-sandbox
bun init -y
bun link nexusts
```

### 일상적인 사용

```bash
# framework 저장소 — 수정, 빌드, 끝. 재설치 불필요
bun run build

# 테스트 앱 — 그냥 실행. symlink가 새 dist/를 자동 반영
bun run dev
```

`bun link` symlink가 `dist/`를 가리키므로 매 rebuild마다 즉시 반영됩니다.
주기마다 `bun install`이 필요 없습니다.

### 적합한 상황

- **모듈 개발** — 가장 빠른 피드백 루프
- **멀티 런타임 테스트** — 같은 `dist/`를 Bun, Node 등에서 소비
- **유저가 신고한 버그 재현** — 유저의 install은 `npm install nexusts`이고,
  `bun link`는 monorepo 내부에서 가장 가까운 등가물

---

## 방법 2 — `file:` 프로토콜 (1회성 검사용)

로컬 경로에서 install. `bun install`이 실제로 패키지를 `node_modules`에 복사하므로
진정한 "fresh install" 테스트입니다.

### 단계

```bash
# 1. framework 빌드
bun run build

# 2. framework 저장소 밖에 테스트 앱 생성
mkdir ~/nexusts-sandbox && cd ~/nexusts-sandbox
bun init -y

# 3. 의존성 추가
bun add file:/절대/경로/@nexusts/dist
# 또는 테스트 앱 기준 상대 경로:
bun add file:../@nexusts/dist
```

`bun install`이 `dist/`를 `node_modules/@nexusts/`로 복사하고 `exports` 필드를
npm이 하는 방식 그대로 해석합니다.

### 설치 검증

```bash
# 패키지가 로컬 dist에서 설치됐는지 확인
ls -la node_modules/nexusts
# → dist/ 내용물(index.js, cli/index.js, grpc/index.js, ...)이 보여야 함

# package.json이 consumer-facing 버전인지 확인
cat node_modules/@nexusts/package.json
# → { "name": "@nexusts/core", "version": "0.5.0", "exports": {...}, ... }
```

### 적합한 상황

- **PR 전 점검** — 수정이 publish layout을 깨지 않았는지 확인
- **CI 통합** — 빠르고, hermetic, 네트워크 불필요
- **fresh install 재현** — `file:`는 publish 없이 `npm install nexusts`에 가장 근접

### 정리

```bash
rm -rf ~/nexusts-sandbox
```

`file:` install은 테스트 앱의 `node_modules`에 self-contained.

---

## 방법 3 — `npm pack` (가장 엄격, `npm publish`와 동일)

`npm pack`이 실제 `.tgz` tarball을 만듭니다. 그 tarball을 install하는 것은
registry에서 `npm install nexusts`하는 것과 바이트 단위로 동일합니다.

### 단계

```bash
# 1. framework 빌드
bun run build

# 2. pack
cd dist
npm pack
# → nexusts-0.5.0.tgz
cd ..

# 3. 테스트 앱에 tarball 설치
mkdir ~/nexusts-sandbox && cd ~/nexusts-sandbox
bun init -y
bun add ../@nexusts/dist/nexusts-0.5.0.tgz
```

### 적합한 상황

- **publish 직전 최종 확인** — `npm publish`는 `npm pack`이 만든 tarball을 그대로 올림
- **npm-specific 메타데이터 이슈 캐치** — `.npmignore`, `files` whitelist, license 포함 여부
- **머신 간 테스트** — tarball은 portable; CI runner나 다른 개발자 노트북에 scp 가능

### 정리

```bash
rm -rf ~/nexusts-sandbox
rm dist/nexusts-0.5.0.tgz
```

---

## 검증 스크립트

어떤 방법을 쓰든, 테스트 앱은 최소한 다음 세 가지를 검증해야 합니다:

```ts
// test-app/index.ts
import { Application, Module, Controller, Get } from "@nexusts/core";
import { GrpcService } from "@nexusts/grpc";
import { EventEmitter } from "@nexusts/events";

@Controller("/")
class AppController {
  @Get("/")
  hello() {
    return { framework: "@nexusts/core", version: "0.5.0" };
  }
}

@Module({ controllers: [AppController] })
class AppModule {}

const app = new Application(AppModule);

// 1. root export가 resolve되고 Application이 실제 클래스
console.assert(typeof Application === "function", "Application not exported");

// 2. subpath export가 resolve됨 (deep import 테스트)
console.assert(typeof GrpcService === "function", "@nexusts/grpc subpath broken");
console.assert(typeof EventEmitter === "function", "@nexusts/events subpath broken");

// 3. CLI가 노출됨 (runtime API와 import 경로가 다름에 주의)
import cliPkg from "@nexusts/cli";
console.assert(typeof cliPkg === "object", "@nexusts/cli subpath broken");

// 4. DI + HTTP가 end-to-end로 동작
const events = app.container.resolve(EventEmitter);
events.on("booted", () => console.log("✓ boot event fired"));

await app.listen(3000);
console.log("✓ listening on http://localhost:3000");
```

```bash
bun run test-app/index.ts
# → ✓ boot event fired
# → ✓ listening on http://localhost:3000

# 다른 터미널에서:
curl http://localhost:3000
# → {"framework":"@nexusts/core","version":"0.5.0"}
```

세 줄이 모두 출력되면 `dist/` 빌드는 정상입니다.

---

## `bun run test`가 못 잡지만 `dist/` 테스트가 잡는 것

| 실패 모드 | `bun run test` | `dist/` 테스트 |
| --------- | -------------- | -------------- |
| `src/`의 decorator 오등록 | ✅ 잡음 | ❌ 못 잡음 |
| `package.json` `exports` 필드 오류 | ❌ 조용히 통과 | ✅ 잡음 |
| `tsconfig.build.json` drift | ❌ 조용히 통과 | ✅ 잡음 |
| `dist/src/*` 평탄화 깨짐 | ❌ 조용히 통과 | ✅ 잡음 (`cli/index.js` 없음) |
| Peer dep 버전 불일치 | ❌ monorepo 것 사용 | ✅ dist의 것 사용 |
| Optional peer dep 런타임 누락 | ❌ monorepo에 있음 | ✅ import 에러로 잡음 |
| CJS/ESM resolution 엣지 케이스 | ❌ monorepo가 해결 | ✅ 잡음 |

**규칙**: 빠른 피드백은 test suite, PR 전에는 `dist/` 테스트.

---

## 트러블슈팅

### `Cannot find module 'nexusts'`

`file:` install이 패키지를 못 찾음. 확인:

```bash
ls node_modules/@nexusts/package.json    # 존재?
cat node_modules/@nexusts/package.json | head -5
```

`package.json`이 없으면 `file:` 경로가 잘못된 것. 절대 경로 사용 권장.

### `Cannot find module '@nexusts/grpc'`

Subpath export가 없거나 깨짐. `dist/` 확인:

```bash
ls dist/grpc/
# → 있어야 할 것: decorators.d.ts, index.d.ts, index.js, module.d.ts, ...
```

디렉토리가 없으면 build가 제외한 것. `build.ts`의 `entrypoints`와
`tsconfig.build.json`의 `include` 확인.

### `SyntaxError: Unexpected token 'export'`

파일이 CJS로 emit됐는데 ESM으로 import. 확인:

```bash
head -1 dist/cli/index.js
# → ESM 호환이어야 함 ("use strict" 접두사나 require() 없어야 함)
```

`"use strict"`나 `Object.defineProperty(exports, ...)`로 시작하면
`build.ts`의 `format: "esm"`이 어딘가에서 덮어쓰인 것.

### Install 시 타입 에러

`file:`와 `bun link`는 framework의 `tsconfig.json`이 아니라 consumer의 것을 사용.
테스트 앱이 strict이고 framework의 declaration이 느슨하면 새 에러가 보일 수 있음.
`src/**`에서 고치고 rebuild.

---

## 함께 보기

- [`runtime-deployment.ko.md`](./runtime-deployment.ko.md) — 운영 배포 (Bun / Node / Cloudflare)
- [`getting-started.ko.md`](./getting-started.ko.md) — 첫 앱 만들기
- [`../../README.md`](../../README.md) — 저장소 구조
- [`build.ts`](../../build.ts) — build script 동작과 phase 3의 평탄화 이유
