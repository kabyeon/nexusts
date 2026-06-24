/**
 * NexusTS benchmark runner.
 *
 * Starts each server, hammers it with concurrent requests,
 * collects req/s and latency statistics, then prints a Markdown table.
 *
 * Usage:
 *   bun benchmarks/bench.ts                  # all suites
 *   bun benchmarks/bench.ts --suite hello    # single suite
 *   bun benchmarks/bench.ts --json           # output JSON
 *
 * Environment:
 *   BENCH_DURATION   seconds per run      (default: 5)
 *   BENCH_CONCURRENCY concurrent workers  (default: 50)
 *   BENCH_WARMUP     warmup seconds       (default: 1)
 */

import { join } from "node:path";
import { writeFileSync } from "node:fs";

// ── Config ────────────────────────────────────────────────────────────────────

const DURATION    = Number(process.env.BENCH_DURATION    ?? 5);
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY ?? 50);
const WARMUP      = Number(process.env.BENCH_WARMUP      ?? 1);
const OUTPUT_JSON = process.argv.includes("--json");
const SUITE_FILTER = (() => {
  const idx = process.argv.indexOf("--suite");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// ── Types ─────────────────────────────────────────────────────────────────────

interface BenchResult {
  suite: string;
  framework: string;
  reqPerSec: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  errors: number;
}

interface ServerConfig {
  name: string;
  script: string;
  port: number;
}

// ── Servers ───────────────────────────────────────────────────────────────────

const SERVERS: ServerConfig[] = [
  { name: "nexusts", script: "benchmarks/servers/nexusts.ts", port: 3001 },
  { name: "hono",    script: "benchmarks/servers/hono.ts",    port: 3002 },
];

// ── Benchmark suites ──────────────────────────────────────────────────────────

const SUITES: Array<{ name: string; path: string }> = [
  { name: "hello",      path: "/hello"      },
  { name: "json",       path: "/json"       },
  { name: "di",         path: "/di"         },
  { name: "middleware", path: "/middleware" },
];

// ── Core benchmark ────────────────────────────────────────────────────────────

async function runBenchmark(
  url: string,
  durationMs: number,
  concurrency: number
): Promise<{ reqPerSec: number; avgLatencyMs: number; p99LatencyMs: number; errors: number }> {
  const latencies: number[] = [];
  let errors = 0;
  const deadline = Date.now() + durationMs;

  async function worker() {
    while (Date.now() < deadline) {
      const start = performance.now();
      try {
        const res = await fetch(url);
        await res.text();
        latencies.push(performance.now() - start);
      } catch {
        errors++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  if (latencies.length === 0) {
    return { reqPerSec: 0, avgLatencyMs: 0, p99LatencyMs: 0, errors };
  }

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? latencies[latencies.length - 1]!;
  const reqPerSec = Math.round((latencies.length / durationMs) * 1000);

  return { reqPerSec, avgLatencyMs: Number(avg.toFixed(2)), p99LatencyMs: Number(p99.toFixed(2)), errors };
}

// ── Server lifecycle ──────────────────────────────────────────────────────────

// Resolve the bun binary — it may not be in $PATH in CI / subprocess contexts
const BUN_BIN =
  process.env["BUN_BIN"] ??
  Bun.which("bun") ??
  process.execPath; // Bun's own executable path

async function startServer(cfg: ServerConfig): Promise<Bun.Subprocess> {
  const proc = Bun.spawn(
    [BUN_BIN, cfg.script, String(cfg.port)],
    { stdout: "pipe", stderr: "pipe" }
  );

  // Wait for the server to be ready (up to 10s)
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${cfg.port}/hello`);
      return proc;
    } catch {
      await Bun.sleep(100);
    }
  }
  proc.kill();
  throw new Error(`Server ${cfg.name} failed to start within 10s`);
}

// ── Formatting ────────────────────────────────────────────────────────────────

function pad(s: string | number, n: number, right = false): string {
  const str = String(s);
  return right ? str.padStart(n) : str.padEnd(n);
}

function printTable(results: BenchResult[]) {
  const cols = [
    { label: "Suite",        key: "suite",         w: 12 },
    { label: "Framework",    key: "framework",      w: 12 },
    { label: "Req/s",        key: "reqPerSec",      w: 10, right: true },
    { label: "Avg (ms)",     key: "avgLatencyMs",   w: 10, right: true },
    { label: "P99 (ms)",     key: "p99LatencyMs",   w: 10, right: true },
    { label: "Errors",       key: "errors",         w: 8,  right: true },
  ] as const;

  const header = "| " + cols.map(c => pad(c.label, c.w)).join(" | ") + " |";
  const sep    = "| " + cols.map(c => "-".repeat(c.w)).join(" | ") + " |";

  console.log("\n## Benchmark Results\n");
  console.log(header);
  console.log(sep);

  for (const r of results) {
    const row = "| " + cols.map(c => {
      const v = r[c.key as keyof BenchResult];
      return (c as any).right ? pad(v, c.w, true) : pad(v, c.w);
    }).join(" | ") + " |";
    console.log(row);
  }
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────

const results: BenchResult[] = [];
const suites = SUITE_FILTER
  ? SUITES.filter(s => s.name === SUITE_FILTER)
  : SUITES;

if (suites.length === 0) {
  console.error(`Unknown suite: ${SUITE_FILTER}. Available: ${SUITES.map(s => s.name).join(", ")}`);
  process.exit(1);
}

console.log(`\nNexusTS Benchmark Suite`);
console.log(`  Duration    : ${DURATION}s per run`);
console.log(`  Concurrency : ${CONCURRENCY} workers`);
console.log(`  Warmup      : ${WARMUP}s`);
console.log(`  Suites      : ${suites.map(s => s.name).join(", ")}`);
console.log();

for (const server of SERVERS) {
  console.log(`Starting ${server.name} server on port ${server.port}...`);
  let proc: Bun.Subprocess | null = null;
  try {
    proc = await startServer(server);
    console.log(`  ✓ ${server.name} ready`);

    for (const suite of suites) {
      const url = `http://localhost:${server.port}${suite.path}`;

      // Warmup
      await runBenchmark(url, WARMUP * 1000, CONCURRENCY);

      // Measure
      process.stdout.write(`  Benchmarking ${suite.name}...`);
      const stats = await runBenchmark(url, DURATION * 1000, CONCURRENCY);
      console.log(` ${stats.reqPerSec} req/s`);

      results.push({ suite: suite.name, framework: server.name, ...stats });
    }
  } catch (err) {
    console.error(`  ✗ ${server.name} failed: ${err}`);
  } finally {
    proc?.kill();
    // Brief pause to let the port free up
    await Bun.sleep(200);
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

if (OUTPUT_JSON) {
  console.log(JSON.stringify(results, null, 2));
} else {
  printTable(results);
}

// Save to results/latest.json
const outPath = join(import.meta.dir, "results", "latest.json");
writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
console.log(`Results saved to ${outPath}`);
