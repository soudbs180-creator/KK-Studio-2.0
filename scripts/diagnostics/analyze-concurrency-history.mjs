import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  summarizeReport,
  summarizeResources,
  decodeEvidenceJson,
} from "./concurrency-evidence.mjs";

const history = "docs/changes/2026-10-09-windows-entry-diagnostics";
const matrix = "docs/changes/2026-10-10-verify-concurrency-002";
const hash = (data) => createHash("sha256").update(data).digest("hex");
const gz = (path) => gunzipSync(readFileSync(path));
const read = (path) => decodeEvidenceJson(gz(path));
const checks = [];
for (const [root, entries] of [
  [
    history,
    JSON.parse(readFileSync(join(history, "evidence/manifest.json"))).entries,
  ],
  ["", JSON.parse(readFileSync(join(matrix, "evidence/manifest.json"))).files],
]) {
  for (const entry of entries) {
    const path = join(root, entry.path);
    const compressed = readFileSync(path),
      data = gunzipSync(compressed);
    const valid =
      hash(data) === entry.sha256 &&
      data.length === entry.bytes &&
      hash(compressed) === entry.compressedSha256 &&
      compressed.length === entry.compressedBytes;
    checks.push({
      path: path.replaceAll("\\", "/"),
      valid,
      sha256: hash(data),
    });
    if (!valid)
      throw new Error(`Historical evidence identity mismatch: ${path}`);
  }
}
const reportPath = join(
  history,
  "evidence/source-10577c1/browser-results-10577c1-default-workers.json.gz",
);
const report = summarizeReport(read(reportPath));
const attempts = report.cases.flatMap((c) =>
  c.attempts.map((r) => ({
    file: c.file,
    title: c.title,
    ...r,
    endMs: Date.parse(r.startTime) + r.duration,
  })),
);
const overlapStart = Math.max(
  ...report.firstFailures.map((r) => Date.parse(r.startTime)),
);
const overlapEnd = Math.min(
  ...report.firstFailures.map((r) => Date.parse(r.startTime) + r.duration),
);
const active = attempts.filter(
  (r) =>
    r.retry === 0 &&
    Date.parse(r.startTime) <= overlapStart &&
    r.endMs >= overlapStart,
);
const rows = [];
for (const worker of [1, 2, 4, 8, 12]) {
  const dir = join(matrix, `evidence/workers-${worker}`);
  const r = summarizeReport(read(join(dir, "browser-results.json.gz")));
  const samples = gz(join(dir, "resources.jsonl.gz"))
    .toString()
    .trim()
    .split(/\r?\n/)
    .map((s) => JSON.parse(s));
  const receipt = read(join(dir, "receipt.json.gz"));
  const durations = r.cases
    .flatMap((c) => c.attempts.map((a) => a.duration))
    .sort((a, b) => a - b);
  rows.push({
    worker,
    durationMs: r.stats.duration,
    tests: r.tests,
    attempts: r.attempts,
    actualRetries: r.actualRetries,
    firstFailures: r.firstFailures.length,
    port: receipt.port,
    portBefore: receipt.portBefore,
    portAfter: receipt.portAfter,
    webServer: r.config.webServer,
    resources: summarizeResources(samples),
    sampleCoverage: {
      firstSampleAt: samples[0].capturedAt,
      lastSampleAt: samples.at(-1).capturedAt,
      initialUnobservedMs:
        Date.parse(samples[0].capturedAt) - Date.parse(receipt.startedAt),
      finalUnobservedMs: Math.max(
        0,
        Date.parse(receipt.endedAt) - Date.parse(samples.at(-1).capturedAt),
      ),
      root: samples[0].processes[0],
    },
    p50Ms: durations[Math.ceil(durations.length * 0.5) - 1],
    p95Ms: durations[Math.ceil(durations.length * 0.95) - 1],
    historicalCases: report.firstFailures.map((f) => ({
      file: f.file,
      title: f.title,
      durationMs: r.cases.find((c) => c.file === f.file && c.title === f.title)
        ?.attempts[0]?.duration,
    })),
  });
}
const result = {
  sourceReport: reportPath.replaceAll("\\", "/"),
  evidenceChecks: checks,
  historical: {
    stats: report.stats,
    tests: report.tests,
    attempts: report.attempts,
    actualRetries: report.actualRetries,
    nodeExecutable: report.config.argv[0],
    playwright: report.config.version,
    workers: report.config.workers,
    actualWorkers: report.config.metadata.actualWorkers,
    webServer: report.config.webServer,
    firstFailures: report.firstFailures,
    commonExecutionOverlap: {
      start: new Date(overlapStart).toISOString(),
      end: new Date(overlapEnd).toISOString(),
      durationMs: overlapEnd - overlapStart,
      activeWorkers: active.length,
      cases: active.map((r) => ({
        file: r.file,
        title: r.title,
        status: r.status,
        durationMs: r.duration,
        workerIndex: r.workerIndex,
      })),
    },
  },
  matrix: rows,
  conclusion:
    "UNKNOWN: clustered execution is consistent with shared scheduling pressure, but historical CPU/memory/step/trace telemetry and exact Edge version are absent. No causal attribution from later PASS or timeout-cleanup session errors.",
};
const index = process.argv.indexOf("--out");
if (index < 0)
  throw new Error(
    "Usage: node scripts/diagnostics/analyze-concurrency-history.mjs --out <new-file.json>",
  );
writeFileSync(process.argv[index + 1], JSON.stringify(result, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify(
    {
      verifiedArtifacts: checks.length,
      firstFailures: report.firstFailures.length,
      actualRetries: report.actualRetries,
      commonExecutionOverlap: result.historical.commonExecutionOverlap,
      matrix: rows.map(({ worker, durationMs, resources }) => ({
        worker,
        durationMs,
        ...resources,
      })),
    },
    null,
    2,
  ),
);
