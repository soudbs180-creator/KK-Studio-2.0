import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
assert.equal(
  process.platform,
  "win32",
  "This probe requires protected Windows Edge",
);
const configUrl = pathToFileURL(path.join(root, "playwright.config.ts"));
const testModule = path.join(root, "node_modules/@playwright/test");
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
  windowsHide: true,
}).trim();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const rows = [];
for (const failure of [false, true]) {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "kk-evidence-png-"));
  const results = path.join(fixture, "test-results");
  const historical = path.join(results, "runtime/assets-desktop.png");
  mkdirSync(path.dirname(historical), { recursive: true });
  const originals = [
    [historical, Buffer.from("historical synthetic PNG bytes")],
    [
      path.join(results, "browser-results.json"),
      Buffer.from('{"historical":true}\n'),
    ],
  ];
  for (const [file, bytes] of originals) writeFileSync(file, bytes);
  writeFileSync(
    path.join(fixture, "probe.spec.ts"),
    `import { test } from ${JSON.stringify(testModule)};\n` +
      `test("local PNG probe", async ({ page }, info) => { await page.setContent("<p>Owned evidence probe</p>"); await page.screenshot({path: info.outputPath("runtime/assets-desktop.png")}); ${failure ? 'throw new Error("expected fixture failure after PNG")' : ""} });\n`,
  );
  writeFileSync(
    path.join(fixture, "fixture.config.mjs"),
    `import config from ${JSON.stringify(configUrl.href)};\n` +
      `if (!config.use.launchOptions?.args?.some(a => a.includes("msWindowTabManagerPublic"))) throw new Error("Protected Edge is required before this probe");\n` +
      `export default {...config, testDir:${JSON.stringify(fixture)}, testMatch:"probe.spec.ts", webServer:undefined, workers:1, retries:0};\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config",
      path.join(fixture, "fixture.config.mjs"),
    ],
    { cwd: fixture, encoding: "utf8", windowsHide: true, timeout: 60_000 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, failure ? 1 : 0, result.stdout + result.stderr);
  if (failure)
    assert.match(result.stdout, /expected fixture failure after PNG/);
  for (const [file, bytes] of originals)
    assert.deepEqual(readFileSync(file), bytes);
  const runs = path.join(results, "browser");
  const runNames = readdirSync(runs);
  assert.equal(runNames.length, 1, "Runner and worker must share one run");
  const run = path.join(runs, runNames[0]);
  const report = JSON.parse(
    readFileSync(path.join(run, "browser-results.json"), "utf8"),
  );
  assert.equal(report.stats.unexpected, failure ? 1 : 0);
  assert.equal(report.config.metadata.sourceHead, sourceHead);
  const artifacts = path.join(run, "artifacts");
  assert(existsSync(artifacts));
  const pngs = readdirSync(artifacts, { recursive: true }).filter((file) =>
    file.endsWith("assets-desktop.png"),
  );
  assert.equal(pngs.length, 1);
  const png = path.join(artifacts, pngs[0]);
  assert.equal(
    readFileSync(png).subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
  );
  rows.push({
    fixture,
    expectedFixtureFailure: failure,
    exitCode: result.status,
    oldFiles: originals.map(([file, bytes]) => ({
      file,
      sha256: sha256(bytes),
    })),
    png,
    pngSha256: sha256(readFileSync(png)),
    report: path.join(run, "browser-results.json"),
  });
}
console.log(JSON.stringify({ passed: true, sourceHead, rows }, null, 2));
