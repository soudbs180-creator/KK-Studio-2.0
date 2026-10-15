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
        `test("local synthetic probe", () => { ${failure ? 'throw new Error("synthetic expected failure")' : ""} });\n`,
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
