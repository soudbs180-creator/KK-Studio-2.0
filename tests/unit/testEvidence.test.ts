import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { allocateTestEvidenceRun } from "../../scripts/testing/test-evidence.mjs";

const repository = process.cwd();
const configUrl = pathToFileURL(path.join(repository, "playwright.config.ts"));
const testModule = path.join(repository, "node_modules/@playwright/test");
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
  windowsHide: true,
}).trim();

for (const failure of [false, true]) {
  test(`a ${failure ? "failed" : "successful"} Playwright run preserves historical receipts, screenshots and reports`, async () => {
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
    await writeFile(
      path.join(fixture, "probe.spec.ts"),
      `import { test } from ${JSON.stringify(testModule)};\n` +
        `import { writeFileSync } from "node:fs";\n` +
        `test("local synthetic probe", ({}, info) => { writeFileSync(info.outputPath("probe.txt"), "current artifact"); ${failure ? 'throw new Error("synthetic expected failure")' : ""} });\n`,
    );
    await writeFile(
      path.join(fixture, "fixture.config.mjs"),
      `import config from ${JSON.stringify(configUrl.href)};\n` +
        `export default {...config, testDir: ${JSON.stringify(fixture)}, testMatch: "probe.spec.ts", webServer: undefined, workers: 1, retries: 0};\n`,
    );
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
        encoding: "utf8",
        windowsHide: true,
        timeout: 30_000,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, failure ? 1 : 0, result.stdout + result.stderr);
    if (failure) assert.match(result.stdout, /synthetic expected failure/);
    for (const [file, contents] of originals) {
      assert(existsSync(file), `Historical evidence was deleted: ${file}`);
      assert.equal(await readFile(file, "utf8"), contents);
    }
    const runsRoot = path.join(fixture, "test-results/browser");
    const reports = (await readdir(runsRoot))
      .map((run) => path.join(runsRoot, run, "browser-results.json"))
      .filter((file) => existsSync(file));
    assert.equal(reports.length, 1);
    assert.equal(
      (await readdir(runsRoot)).length,
      1,
      "Workers must share the runner's evidence directory",
    );
    const artifacts = path.join(path.dirname(reports[0]), "artifacts");
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
    const report = JSON.parse(await readFile(reports[0], "utf8"));
    assert.equal(report.stats.expected, failure ? 0 : 1);
    assert.equal(report.stats.unexpected, failure ? 1 : 0);
    assert.equal(report.config.metadata.sourceHead, sourceHead);
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
