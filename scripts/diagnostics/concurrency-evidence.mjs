import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export function createDiagnosticConfig(base, { root, dir, reportPath }) {
  return {
    ...base,
    testDir: join(root, "tests/browser"),
    outputDir: join(dir, "test-output"),
    use: { ...base.use, trace: "on" },
    webServer: { ...base.webServer, cwd: root },
    reporter: [
      ["list"],
      [join(root, "scripts/diagnostics/concurrency-reporter.mjs")],
      ["json", { outputFile: reportPath }],
    ],
  };
}
export function experimentFailed(receipt) {
  return (
    receipt.exit.code !== 0 ||
    Boolean(receipt.parseError) ||
    !receipt.report ||
    Boolean(receipt.report.actualRetries) ||
    Boolean(receipt.report.firstFailures.length) ||
    !receipt.resourceSummary?.samples ||
    Boolean(receipt.resourceSummary.samplingErrors) ||
    !receipt.samplerExit ||
    receipt.samplerExit.code !== 0 ||
    Boolean(receipt.samplerExit.signal) ||
    Boolean(receipt.samplerExit.endedBeforeRunner) ||
    Boolean(receipt.samplerExit.forcedKill)
  );
}

export function decodeEvidenceJson(bytes) {
  return JSON.parse(bytes.toString().replace(/^\uFEFF/, ""));
}

export function prepareOutput(path) {
  mkdirSync(dirname(path), { recursive: true });
  mkdirSync(path); // Exclusive creation: never replace a prior experiment.
}

export function validateOptions(workers, rounds, port) {
  if (port !== undefined && port !== "1423")
    throw new Error("Diagnostics require the supported default port 1423.");
  if (!workers.length || workers.some((n) => !Number.isSafeInteger(n) || n < 1))
    throw new Error("workers must be positive integers.");
  if (!Number.isSafeInteger(rounds) || rounds < 1)
    throw new Error("rounds must be a positive integer.");
}

export function summarizeReport(report) {
  const cases = [];
  function walk(suites) {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests) {
          cases.push({
            file: spec.file,
            line: spec.line,
            title: spec.title,
            status: test.status,
            attempts: test.results.map((result) => ({
              status: result.status,
              retry: result.retry,
              workerIndex: result.workerIndex,
              startTime: result.startTime,
              duration: result.duration,
              errors: result.errors ?? [],
            })),
          });
        }
      }
      walk(suite.suites ?? []);
    }
  }
  walk(report.suites);
  return {
    tests: cases.length,
    attempts: cases.reduce((sum, c) => sum + c.attempts.length, 0),
    actualRetries: cases.flatMap((c) => c.attempts).filter((r) => r.retry > 0)
      .length,
    firstFailures: cases
      .filter(
        (c) =>
          c.attempts[0] &&
          c.attempts[0].status !== "passed" &&
          c.attempts[0].status !== "skipped",
      )
      .map((c) => ({
        file: c.file,
        line: c.line,
        title: c.title,
        ...c.attempts[0],
      })),
    cases,
    stats: report.stats,
    config: report.config,
  };
}

export function summarizeResources(samples) {
  const valid = samples.filter((s) => !s.error && Array.isArray(s.processes));
  const peakWorkingSetBytes = Math.max(
    0,
    ...valid.map((s) =>
      s.processes.reduce((sum, p) => sum + p.workingSetBytes, 0),
    ),
  );
  const free = valid
    .map((s) => s.freePhysicalMemoryBytes)
    .filter(Number.isFinite);
  return {
    samples: samples.length,
    samplingErrors: samples.filter((s) => s.error).length,
    peakProcesses: Math.max(0, ...valid.map((s) => s.processes.length)),
    peakWorkingSetBytes,
    peakWorkingSetGB: peakWorkingSetBytes / 1e9,
    peakWorkingSetGiB: peakWorkingSetBytes / 2 ** 30,
    minimumFreePhysicalMemoryBytes: free.length ? Math.min(...free) : null,
    maxSampleGapMs: Math.max(
      0,
      ...samples
        .slice(1)
        .map(
          (s, i) =>
            Date.parse(s.capturedAt) - Date.parse(samples[i].capturedAt),
        ),
    ),
  };
}
