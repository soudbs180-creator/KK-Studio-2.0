import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import ts from "typescript";
import { allocateTestEvidenceRun } from "../../scripts/testing/test-evidence.mjs";

const repository = process.cwd();
const configUrl = pathToFileURL(path.join(repository, "playwright.config.ts"));
const testModule = path.join(repository, "node_modules/@playwright/test");
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
  windowsHide: true,
}).trim();

for (const [scenario, expectedExit] of [
  ["successful", 0],
  ["failed", 1],
  ["cancelled", 130],
  ["reporter-failed", 1],
  ["polluted-parent", 0],
  ["mixed-case-parent", 0],
] as const) {
  test(`a ${scenario} Playwright run preserves historical receipts, screenshots and reports`, async () => {
    const failure = scenario === "failed";
    const cancelled = scenario === "cancelled";
    const reporterFailed = scenario === "reporter-failed";
    const fixture = await mkdtemp(path.join(os.tmpdir(), "kk-evidence-"));
    const historical = path.join(
      fixture,
      "test-results/development-plugins/old-run",
    );
    await mkdir(historical, { recursive: true });
    const originals = [
      [path.join(historical, "receipt.json"), '{"oldRun":"preserve"}\n'],
      [path.join(historical, "plugins.png"), "synthetic-old-image-bytes"],
      [
        path.join(fixture, "test-results/browser-results.json"),
        '{"historicalReport":true}\n',
      ],
    ];
    for (const [file, contents] of originals) await writeFile(file, contents);
    // Keep the fixture's absolute Playwright import independent of its parent package.
    await writeFile(path.join(fixture, "package.json"), '{"type":"commonjs"}');
    await writeFile(
      path.join(fixture, "probe.spec.ts"),
      `import { test } from ${JSON.stringify(testModule)};\n` +
        `import { mkdirSync, writeFileSync } from "node:fs";\n` +
        `import path from "node:path";\n` +
        `test("local synthetic probe", async ({}, info) => { writeFileSync(info.outputPath("probe.txt"), "current artifact"); ${failure ? 'throw new Error("synthetic expected failure");' : ""} ${reporterFailed ? 'mkdirSync(path.join(info.project.outputDir, "..", "browser-results.json"));' : ""} ${cancelled ? 'console.log("KK_EVIDENCE_CANCEL_READY"); await new Promise(resolve => setTimeout(resolve, 60000));' : ""} });\n`,
    );
    const cancelReporter = path.join(fixture, "cancel-reporter.mjs");
    // Inject the runner's SIGINT event without sending an OS signal.
    if (cancelled)
      await writeFile(
        cancelReporter,
        `import { writeFileSync } from "node:fs";\n` +
          `export default class { cancelled = false; onStdOut(chunk) { if (!this.cancelled && String(chunk).includes("KK_EVIDENCE_CANCEL_READY")) this.cancelled = process.emit("SIGINT"); } onEnd(result) { writeFileSync(${JSON.stringify(path.join(fixture, "cancel-status.json"))}, JSON.stringify({status: result.status, injected: this.cancelled})); } }\n`,
      );
    await writeFile(
      path.join(fixture, "fixture.config.mjs"),
      `import config from ${JSON.stringify(configUrl.href)};\n` +
        `export default {...config, testDir: ${JSON.stringify(fixture)}, testMatch: "probe.spec.ts", webServer: undefined, workers: 1, retries: 0, ${cancelled ? `reporter: [...config.reporter, [${JSON.stringify(cancelReporter)}]],` : ""}};\n`,
    );
    const processEnvironment = { ...process.env };
    const parentEnvironment = {
      ...processEnvironment,
      ...(scenario === "polluted-parent"
        ? {
            PLAYWRIGHT_JSON_OUTPUT_FILE: originals[2][0],
            KK_BROWSER_EVIDENCE_RUN: historical,
            TEST_WORKER_INDEX: "99",
            KK_TEST_PORT: "1437",
          }
        : {}),
      ...(scenario === "mixed-case-parent"
        ? {
            playwright_json_output_file: originals[2][0],
            kK_bRoWsEr_EvIdEnCe_RuN: historical,
            tEsT_wOrKeR_iNdEx: "99",
            kK_tEsT_pOrT: "1423",
          }
        : {}),
    };
    const parentSnapshot = { ...parentEnvironment };
    const childEnvironment: NodeJS.ProcessEnv = { ...parentEnvironment };
    for (const key of Object.keys(childEnvironment))
      if (
        [
          "PLAYWRIGHT_JSON_OUTPUT_FILE",
          "KK_BROWSER_EVIDENCE_RUN",
          "TEST_WORKER_INDEX",
          "KK_TEST_PORT",
        ].includes(key.toUpperCase())
      )
        delete childEnvironment[key];
    const result = spawnSync(
      process.execPath,
      [
        path.join(repository, "node_modules/@playwright/test/cli.js"),
        "test",
        "--config",
        path.join(fixture, "fixture.config.mjs"),
      ],
      {
        cwd: fixture,
        env: childEnvironment,
        encoding: "utf8",
        windowsHide: true,
        timeout: 30_000,
      },
    );
    await writeFile(path.join(fixture, "stdout.log"), result.stdout ?? "");
    await writeFile(path.join(fixture, "stderr.log"), result.stderr ?? "");
    await writeFile(
      path.join(fixture, "run-result.json"),
      JSON.stringify({
        scenario,
        sourceHead,
        status: result.status,
        signal: result.signal,
        error: result.error?.message,
      }),
    );
    console.log(`Retained ${scenario} evidence: ${fixture}`);
    assert(
      isDeepStrictEqual({ ...process.env }, processEnvironment),
      "The parent process environment must stay unchanged",
    );
    assert(
      isDeepStrictEqual(parentEnvironment, parentSnapshot),
      "Preparing the child environment must not mutate its parent",
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, expectedExit, result.stdout + result.stderr);
    if (failure) assert.match(result.stdout, /synthetic expected failure/);
    const sha256 = (bytes: Uint8Array | string) =>
      createHash("sha256").update(bytes).digest("hex");
    const oldFiles = [];
    for (const [file, contents] of originals) {
      assert(existsSync(file), `Historical evidence was deleted: ${file}`);
      const bytes = await readFile(file);
      assert.deepEqual(bytes, Buffer.from(contents));
      assert.equal(sha256(bytes), sha256(contents));
      oldFiles.push({
        file,
        beforeSha256: sha256(contents),
        afterSha256: sha256(bytes),
      });
    }
    const runsRoot = path.join(fixture, "test-results/browser");
    const runs = await readdir(runsRoot);
    assert.equal(
      runs.length,
      1,
      "Workers must share the runner's evidence directory",
    );
    const reportFile = path.join(runsRoot, runs[0], "browser-results.json");
    const artifacts = path.join(runsRoot, runs[0], "artifacts");
    assert(
      existsSync(artifacts),
      "Worker artifacts must stay with the JSON report",
    );
    const probe = (await readdir(artifacts, { recursive: true })).find((file) =>
      file.endsWith("probe.txt"),
    );
    assert(probe, "The real worker must write its artifact in the current run");
    assert.equal(
      await readFile(path.join(artifacts, probe), "utf8"),
      "current artifact",
    );
    if (reporterFailed) {
      assert((await stat(reportFile)).isDirectory());
      assert.match(result.stdout + result.stderr, /EISDIR|EPERM/);
      assert((result.stdout + result.stderr).includes(reportFile));
      assert.match(result.stdout, /1 passed/);
    } else {
      const report = JSON.parse(await readFile(reportFile, "utf8"));
      assert.equal(report.stats.expected, failure || cancelled ? 0 : 1);
      assert.equal(report.stats.unexpected, failure ? 1 : 0);
      assert.equal(report.config.metadata.sourceHead, sourceHead);
      if (cancelled) {
        assert.equal(
          report.suites[0].specs[0].tests[0].results[0].status,
          "interrupted",
        );
        assert.deepEqual(
          JSON.parse(
            await readFile(path.join(fixture, "cancel-status.json"), "utf8"),
          ),
          { status: "interrupted", injected: true },
        );
      }
    }
    await writeFile(
      path.join(fixture, "preservation.json"),
      JSON.stringify({ scenario, sourceHead, oldFiles, reportFile, artifacts }),
    );
  });
}

test("new runs have separate artifact and report locations without reusing a previous run", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "kk-evidence-runs-"));
  const first = allocateTestEvidenceRun("browser", { rootDir });
  await writeFile(first.reportFile, "old report");
  const second = allocateTestEvidenceRun("browser", { rootDir });
  assert.notEqual(first.directory, second.directory);
  assert.notEqual(first.artifactsDir, second.artifactsDir);
  assert.notEqual(first.reportFile, second.reportFile);
  assert.equal(await readFile(first.reportFile, "utf8"), "old report");
});

test("explicit output rejects existing directories, files and links before modifying evidence", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "kk-evidence-reject-"));
  const directory = path.join(rootDir, "existing");
  await mkdir(directory);
  const receipt = path.join(directory, "receipt.json");
  await writeFile(receipt, "old receipt");
  const file = path.join(rootDir, "existing-file");
  await writeFile(file, "old file");
  const link = path.join(rootDir, "existing-link");
  await symlink(directory, link, "junction");
  for (const output of [directory, file, link]) {
    assert.throws(
      () =>
        allocateTestEvidenceRun("development-plugins", { directory: output }),
      { code: "EEXIST" },
    );
  }
  assert.equal(await readFile(receipt, "utf8"), "old receipt");
  assert.equal(await readFile(file, "utf8"), "old file");
});

test("suite names cannot escape the evidence directory", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "kk-evidence-suite-"));
  for (const suite of ["../old", "", "browser/../../old"]) {
    assert.throws(() => allocateTestEvidenceRun(suite, { rootDir }));
  }
  assert.deepEqual(await readdir(rootDir), []);
});

function screenshotPathViolations(file: string, contents: string): string[] {
  const violations: string[] = [];
  const source = ts.createSourceFile(
    file,
    contents,
    ts.ScriptTarget.Latest,
    true,
  );
  const reject = (node: ts.Node) => {
    const { line } = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    violations.push(
      file +
        ":" +
        (line + 1) +
        " must use an inline screenshot path calling testInfo.outputPath()",
    );
  };
  const inspect = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "screenshot"
    ) {
      const options = node.arguments[0];
      if (options && !ts.isObjectLiteralExpression(options)) reject(options);
      else if (options && ts.isObjectLiteralExpression(options)) {
        for (const property of options.properties) {
          if (ts.isSpreadAssignment(property)) {
            reject(property);
            continue;
          }
          if (ts.isComputedPropertyName(property.name)) {
            reject(property);
            continue;
          }
          const name =
            ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
              ? property.name.text
              : undefined;
          if (name !== "path") continue;
          if (!ts.isPropertyAssignment(property)) {
            reject(property);
            continue;
          }
          const value = property.initializer;
          if (!(
            ts.isCallExpression(value) &&
            ts.isPropertyAccessExpression(value.expression) &&
            value.expression.name.text === "outputPath"
          ))
            reject(property);
        }
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(source);
  return violations;
}

test("browser screenshot paths belong to the current test output directory", async () => {
  const browserTests = path.join(repository, "tests/browser");
  const violations: string[] = [];
  for (const file of await readdir(browserTests)) {
    if (!file.endsWith(".ts")) continue;
    violations.push(
      ...screenshotPathViolations(
        file,
        await readFile(path.join(browserTests, file), "utf8"),
      ),
    );
  }
  assert.deepEqual(violations, []);
});

test("screenshot guard rejects quoted, conditional and uninspectable paths", () => {
  const options = [
    '{"path":"test-results/runtime/old.png"}',
    '{path: condition ? test.info().outputPath("safe.png") : "test-results/runtime/old.png"}',
    "options",
    "{path}",
    "{...options}",
    '{["path"]:"test-results/runtime/old.png"}',
    '{get path(){return "test-results/runtime/old.png"}}',
  ];
  assert.deepEqual(
    options.map(
      (value) =>
        screenshotPathViolations("probe.ts", `page.screenshot(${value})`)
          .length,
    ),
    [1, 1, 1, 1, 1, 1, 1],
  );
  assert.deepEqual(
    screenshotPathViolations(
      "probe.ts",
      'page.screenshot({"path":test.info().outputPath("safe.png")})',
    ),
    [],
  );
});
