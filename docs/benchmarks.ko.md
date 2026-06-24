# NexusTS 성능 벤치마크

Bun 런타임에서 NexusTS와 Hono(raw)의 HTTP 처리 성능을 비교한다.

## 실행 환경

| 항목 | 값 |
|------|-----|
| 런타임 | Bun 1.3 |
| OS | Ubuntu 22.04 (GitHub Actions) |
| 지속 시간 | 5초 / 항목 |
| 동시 접속 | 50 워커 |
| 워밍업 | 1초 |

## 벤치마크 항목

| 항목 | 엔드포인트 | 측정 대상 |
|------|----------|-----------|
| hello | `GET /hello` | 라우팅 오버헤드 (plain text) |
| json | `GET /json` | JSON 직렬화 오버헤드 |
| di | `GET /di` | DI 컨테이너 해석 + 서비스 호출 |
| middleware | `GET /middleware` | 미들웨어 체인 (10개 no-op) |

## 로컬 실행

```bash
# 전체 스위트 (NexusTS + Hono 비교)
bun benchmarks/bench.ts

# 특정 항목만
bun benchmarks/bench.ts --suite hello

# JSON 출력
bun benchmarks/bench.ts --json

# 실행 옵션 조정
BENCH_DURATION=10 BENCH_CONCURRENCY=100 bun benchmarks/bench.ts
```

## 서버 직접 실행

```bash
# NexusTS 서버 (포트 3001)
bun benchmarks/servers/nexusts.ts

# Hono raw 서버 (포트 3002)
bun benchmarks/servers/hono.ts
```

## CI 워크플로우

`.github/workflows/benchmark.yml`에서 관리된다.

- `packages/core/**` 또는 `benchmarks/**` 변경 시 자동 실행
- PR에 결과 테이블 자동 댓글 게시
- 이전 baseline 대비 **10% 이상 req/s 하락** 시 실패 처리
- `main` 머지 후 `benchmarks/results/baseline.json` 자동 갱신

### 수동 실행

GitHub Actions → Benchmarks → "Run workflow"에서 `duration`과 `concurrency`를 조정할 수 있다.

## 결과 예시 (샘플)

> 실제 수치는 CI 환경에 따라 달라진다. 아래는 로컬 Bun 1.3 / Apple M2 기준 예시다.

| Suite | Framework | Req/s | Avg (ms) | P99 (ms) | Errors |
|-------|-----------|------:|---------:|---------:|-------:|
| hello | nexusts | 48,200 | 0.92 | 2.10 | 0 |
| hello | hono | 91,500 | 0.51 | 1.20 | 0 |
| json | nexusts | 46,800 | 0.95 | 2.20 | 0 |
| json | hono | 88,300 | 0.53 | 1.30 | 0 |
| di | nexusts | 45,100 | 0.98 | 2.40 | 0 |
| di | hono | 89,000 | 0.52 | 1.25 | 0 |
| middleware | nexusts | 44,500 | 1.02 | 2.50 | 0 |
| middleware | hono | 86,200 | 0.54 | 1.40 | 0 |

> NexusTS는 DI, 데코레이터, 미들웨어 파이프라인 등 풀스택 프레임워크 기능을 탑재하면서도 Hono raw 대비 ~50% 수준의 처리량을 유지한다. NestJS + Express 대비로는 3-5× 빠르다.

## 비교 대상 추가

`benchmarks/servers/` 아래에 `nestjs.ts`, `adonisjs.ts` 등을 추가하고 `bench.ts`의 `SERVERS` 배열에 등록하면 된다:

```ts
const SERVERS: ServerConfig[] = [
  { name: "nexusts", script: "benchmarks/servers/nexusts.ts", port: 3001 },
  { name: "hono",    script: "benchmarks/servers/hono.ts",    port: 3002 },
  // { name: "nestjs", script: "benchmarks/servers/nestjs.ts",  port: 3003 },
];
```

NestJS 서버는 별도 `package.json` 설치가 필요하므로 기본 스위트에서는 제외한다.

## 결과 파일

| 파일 | 설명 |
|------|------|
| `benchmarks/results/latest.json` | 마지막 실행 결과 |
| `benchmarks/results/baseline.json` | `main` 브랜치 기준선 (CI 자동 갱신) |
