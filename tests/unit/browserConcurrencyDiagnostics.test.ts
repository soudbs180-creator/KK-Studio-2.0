import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import {
  prepareOutput,
  validateOptions,
  summarizeReport,
  summarizeResources,
  decodeEvidenceJson,
  createDiagnosticConfig,
  experimentFailed,
} from "../../scripts/diagnostics/concurrency-evidence.mjs";

test("temporary config launches relative service command from the source repository", () => {
  const root = mkdtempSync(join(tmpdir(), "kk-concurrency-cwd-"));
  try {
    writeFileSync(join(root, "service.cjs"), 'console.log("source-service")');
    const base = {
      timeout: 30000,
      use: { channel: "msedge" },
      webServer: { command: "node service.cjs", reuseExistingServer: false },
    };
    const config = createDiagnosticConfig(base, {
      root,
      dir: join(root, "evidence"),
      reportPath: join(root, "results.json"),
    });
    assert.equal(config.timeout, 30000);
    assert.equal(config.webServer.command, base.webServer.command);
    assert.equal(config.webServer.cwd, root);
    assert.equal(
      execFileSync(process.execPath, ["service.cjs"], {
        cwd: config.webServer.cwd,
        encoding: "utf8",
      }).trim(),
      "source-service",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("sampler abnormal or early exit prevents PASS despite successful tests", () => {
  const receipt = {
    exit: { code: 0 },
    report: { tests: 9, actualRetries: 0, firstFailures: [] },
    resourceSummary: { samples: 1, samplingErrors: 0 },
    samplerExit: {
      code: 0,
      signal: null,
      endedBeforeRunner: false,
      forcedKill: false,
    },
  };
  assert.equal(experimentFailed(receipt), false);
  for (const bad of [
    { code: 1 },
    { code: 0, endedBeforeRunner: true },
    { code: null, signal: "SIGTERM", forcedKill: true },
  ])
    assert.equal(
      experimentFailed({
        ...receipt,
        samplerExit: { ...receipt.samplerExit, ...bad },
      }),
      true,
    );
  assert.equal(
    experimentFailed({
      ...receipt,
      resourceSummary: { samples: 1, samplingErrors: 1 },
    }),
    true,
  );
});

test("Windows UTF-8 BOM receipt is parsed without altering raw bytes", () => {
  const bytes = Buffer.from('\uFEFF{"port":1423}\r\n');
  const original = Buffer.from(bytes);
  assert.deepEqual(decodeEvidenceJson(bytes), { port: 1423 });
  assert.deepEqual(bytes, original);
});

test("diagnostic output refuses an existing directory without changing evidence", () => {
  const dir = mkdtempSync(join(tmpdir(), "kk-concurrency-"));
  try {
    const original = join(dir, "original.json");
    writeFileSync(original, "failure evidence");
    assert.throws(() => prepareOutput(dir), /exist/i);
    assert.equal(readFileSync(original, "utf8"), "failure evidence");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("diagnostic entry rejects unsupported port and invalid worker counts", () => {
  assert.throws(() => validateOptions([1, 12], 2, "1431"), /1423/);
  for (const workers of [[0], [-1], [1.5], [NaN]])
    assert.throws(() => validateOptions(workers, 2, "1423"), /workers/);
  assert.throws(() => validateOptions([1], 0, "1423"), /rounds/);
  assert.doesNotThrow(() => validateOptions([1, 12], 2, undefined));
});

test("report preserves first failure even when retry passes", () => {
  const report = {
    suites: [
      {
        specs: [
          {
            file: "a.spec.ts",
            line: 12,
            title: "contract",
            tests: [
              {
                status: "flaky",
                results: [
                  {
                    retry: 0,
                    status: "timedOut",
                    duration: 30001,
                    startTime: "2026-10-09T01:39:20Z",
                    workerIndex: 2,
                    errors: [{ message: "timeout" }],
                  },
                  {
                    retry: 1,
                    status: "passed",
                    duration: 1000,
                    startTime: "2026-10-09T01:40:00Z",
                    workerIndex: 12,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const result = summarizeReport(report);
  assert.equal(result.tests, 1);
  assert.equal(result.attempts, 2);
  assert.equal(result.actualRetries, 1);
  assert.equal(result.firstFailures[0].status, "timedOut");
  assert.equal(result.firstFailures[0].errors[0].message, "timeout");
});

test("resource summary separates decimal GB and binary GiB", () => {
  const result = summarizeResources([
    {
      capturedAt: "2026-10-09T00:00:00Z",
      processes: [{ workingSetBytes: 10750000000 }],
      freePhysicalMemoryBytes: 16000000000,
    },
    {
      capturedAt: "2026-10-09T00:00:02Z",
      processes: [],
      freePhysicalMemoryBytes: 17000000000,
    },
  ]);
  assert.equal(result.peakWorkingSetGB, 10.75);
  assert.equal(result.peakWorkingSetGiB, 10750000000 / 2 ** 30);
  assert.equal(result.peakProcesses, 1);
  assert.equal(result.maxSampleGapMs, 2000);
});
