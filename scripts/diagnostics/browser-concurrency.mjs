import { spawn, execFileSync } from "node:child_process";
import {
  appendFileSync,
  createWriteStream,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { request } from "node:http";
import { createHash } from "node:crypto";
import { availableParallelism, cpus, totalmem } from "node:os";
import { gunzipSync } from "node:zlib";
import {
  prepareOutput,
  validateOptions,
  summarizeReport,
  summarizeResources,
  experimentFailed,
} from "./concurrency-evidence.mjs";

const args = process.argv.slice(2);
const option = (key, fallback) =>
  args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const workers = option("--workers", "1,4,12").split(",").map(Number);
const rounds = Number(option("--rounds", "1"));
const suite = option("--suite", "historical");
validateOptions(workers, rounds, process.env.KK_TEST_PORT);
if (!["historical", "full"].includes(suite))
  throw new Error("suite must be historical or full.");
if (process.platform !== "win32")
  throw new Error(
    "Resource-instrumented experiments require Windows/Edge; this host is not equivalent.",
  );
const out = resolve(option("--out", `.tmp/concurrency-${Date.now()}`));
prepareOutput(out);
const write = (path, value) =>
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
const git = (...argv) => execFileSync("git", argv, { encoding: "utf8" }).trim();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(root, entry.name))
      : [join(root, entry.name)],
  );
}
const dist = files("dist")
  .sort()
  .map((path) => ({
    path: path.replaceAll("\\", "/"),
    bytes: readFileSync(path).length,
    sha256: hash(readFileSync(path)),
  }));
const historical = summarizeReport(
  JSON.parse(
    gunzipSync(
      readFileSync(
        "docs/changes/2026-10-09-windows-entry-diagnostics/evidence/source-10577c1/browser-results-10577c1-default-workers.json.gz",
      ),
    ),
  ),
);
const selected =
  suite === "full"
    ? []
    : historical.firstFailures.map((t) => `${t.file}:${t.line}`);
// Parameterized tests share file:line. Filter exact historical titles as well.
const grep = historical.firstFailures
  .map((t) => t.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ channel: "msedge" });
const edgeVersion = browser.version();
await browser.close();
write(join(out, "identity.json"), {
  sourceHead: git("rev-parse", "HEAD"),
  sourceTree: git("rev-parse", "HEAD^{tree}"),
  dirty: git("status", "--porcelain"),
  node: process.version,
  playwright: JSON.parse(
    readFileSync("node_modules/@playwright/test/package.json"),
  ).version,
  edgeVersion,
  os: process.platform,
  logicalCpu: cpus().length,
  availableParallelism: availableParallelism(),
  totalMemoryBytes: totalmem(),
  suite,
  workers,
  rounds,
  port: 1423,
  retries: 0,
  selected,
  distHash: hash(JSON.stringify(dist)),
  dist,
});

function probe() {
  return new Promise((done) => {
    const start = performance.now();
    const req = request("http://127.0.0.1:1423", { timeout: 1000 }, (res) => {
      res.resume();
      res.once("end", () =>
        done({ status: res.statusCode, latencyMs: performance.now() - start }),
      );
    });
    req.once("error", (e) =>
      done({ error: e.code, latencyMs: performance.now() - start }),
    );
    req.once("timeout", () =>
      req.destroy(
        Object.assign(new Error("Probe timeout"), { code: "ETIMEDOUT" }),
      ),
    );
    req.end();
  });
}
const receipts = [];
for (let round = 1; round <= rounds; round++) {
  const order = round % 2 ? workers : [...workers].reverse();
  for (const worker of order) {
    const dir = join(out, `round-${round}-workers-${worker}`);
    prepareOutput(dir);
    const before = await probe();
    if (!before.error || before.error !== "ECONNREFUSED") {
      write(join(dir, "receipt.json"), {
        result: "ENVIRONMENT_REJECTED",
        portBefore: before,
      });
      throw new Error(
        "1423 is occupied or unavailable; preserving the existing service.",
      );
    }
    const config = join(dir, "playwright.config.mjs");
    const reportPath = join(dir, "browser-results.json");
    writeFileSync(
      config,
      `import base from ${JSON.stringify(resolve("playwright.config.ts").replaceAll("\\", "/"))};\nimport { createDiagnosticConfig } from ${JSON.stringify(resolve("scripts/diagnostics/concurrency-evidence.mjs").replaceAll("\\", "/"))};\nexport default createDiagnosticConfig(base, ${JSON.stringify({ root: process.cwd(), dir, reportPath })});\n`,
    );
    const command = [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config",
      config,
      `--workers=${worker}`,
      "--retries=0",
      ...selected,
      ...(suite === "historical" ? ["--grep", `(?:${grep})$`] : []),
    ];
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const consoleLog = createWriteStream(join(dir, "console.log"));
    const runner = spawn(process.execPath, command, {
      env: {
        ...process.env,
        KK_TEST_PORT: "1423",
        KK_CONC_EVENTS: join(dir, "steps.jsonl"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    runner.stdout.pipe(consoleLog, { end: false });
    runner.stderr.pipe(consoleLog, { end: false });
    const sampler = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        resolve("scripts/diagnostics/concurrency-resources.ps1"),
        "-RootPid",
        String(runner.pid),
        "-OutputFile",
        join(dir, "resources.jsonl"),
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    const samplerLog = createWriteStream(join(dir, "sampler.log"));
    sampler.stdout.pipe(samplerLog, { end: false });
    sampler.stderr.pipe(samplerLog, { end: false });
    let runnerCompleted = false,
      samplerError,
      samplerExit,
      forcedKill = false;
    runner.once("exit", () => {
      runnerCompleted = true;
    });
    runner.once("error", () => {
      runnerCompleted = true;
    });
    sampler.on("error", (error) => {
      samplerError = String(error);
      appendFileSync(join(dir, "sampler.log"), String(error));
    });
    const samplerClosed = new Promise((done) =>
      sampler.once("close", (code, signal) => {
        samplerExit = {
          code,
          signal,
          error: samplerError,
          endedBeforeRunner: !runnerCompleted,
        };
        done();
      }),
    );
    let busy = false,
      last = performance.now(),
      firstReadyMs = null;
    const interval = setInterval(async () => {
      const now = performance.now(),
        schedulingGapMs = now - last;
      last = now;
      if (busy) return;
      busy = true;
      const result = await probe();
      if (result.status === 200 && firstReadyMs === null)
        firstReadyMs = performance.now() - started;
      appendFileSync(
        join(dir, "service.jsonl"),
        JSON.stringify({
          capturedAt: new Date().toISOString(),
          elapsedMs: performance.now() - started,
          schedulingGapMs,
          ...result,
        }) + "\n",
      );
      busy = false;
    }, 500);
    const exit = await new Promise((done) => {
      runner.once("error", (error) =>
        done({ code: null, signal: null, error: String(error) }),
      );
      runner.once("close", (code, signal) => done({ code, signal }));
    });
    clearInterval(interval);
    while (busy) await new Promise((done) => setTimeout(done, 20));
    let samplerTimer;
    await Promise.race([
      samplerClosed,
      new Promise((done) => {
        samplerTimer = setTimeout(() => {
          forcedKill = true;
          sampler.kill();
          done();
        }, 5000);
      }),
    ]);
    clearTimeout(samplerTimer);
    await samplerClosed;
    await Promise.all([
      new Promise((done) => consoleLog.end(done)),
      new Promise((done) => samplerLog.end(done)),
    ]);
    let report, resourceSummary, parseError;
    try {
      report = summarizeReport(JSON.parse(readFileSync(reportPath)));
      const samples = readFileSync(join(dir, "resources.jsonl"), "utf8")
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      resourceSummary = summarizeResources(samples);
      const expected =
        suite === "historical" ? historical.firstFailures.length : 447;
      if (report.tests !== expected)
        throw new Error(
          `Expected ${expected} cases, observed ${report.tests}; experiment selection changed.`,
        );
      if (report.config.projects.some((p) => p.retries !== 0))
        throw new Error("Unexpected retry configuration.");
    } catch (error) {
      parseError = String(error);
    }
    const receipt = {
      round,
      requestedWorkers: worker,
      actualWorkers: report?.config?.metadata?.actualWorkers,
      startedAt,
      endedAt: new Date().toISOString(),
      durationMs: performance.now() - started,
      command,
      exit,
      samplerExit: { ...samplerExit, forcedKill },
      firstReadyMs,
      portBefore: before,
      portAfter: await probe(),
      report: report && {
        tests: report.tests,
        attempts: report.attempts,
        actualRetries: report.actualRetries,
        firstFailures: report.firstFailures,
        stats: report.stats,
      },
      resourceSummary,
      parseError,
    };
    write(join(dir, "receipt.json"), receipt);
    receipts.push(receipt);
    write(join(out, "summary.json"), receipts);
    console.log(
      JSON.stringify({ round, worker, exit, stats: report?.stats, parseError }),
    );
  }
}
write(join(out, "summary.json"), receipts);
write(
  join(out, "manifest.json"),
  files(out)
    .filter((path) => !path.endsWith("manifest.json"))
    .map((path) => ({
      path: path.slice(out.length + 1).replaceAll("\\", "/"),
      bytes: readFileSync(path).length,
      sha256: hash(readFileSync(path)),
    })),
);
process.exitCode = receipts.some(experimentFailed) ? 1 : 0;
