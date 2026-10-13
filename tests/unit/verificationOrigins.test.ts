import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const configUrl = pathToFileURL(join(process.cwd(), "playwright.config.ts"));

function loadConfig(port: string | undefined) {
  const env = { ...process.env };
  if (port === undefined) delete env.KK_TEST_PORT;
  else env.KK_TEST_PORT = port;
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `const config = (await import(${JSON.stringify(configUrl.href)})).default; console.log(JSON.stringify({ baseURL: config.use.baseURL, url: config.webServer.url, command: config.webServer.command, reuseExistingServer: config.webServer.reuseExistingServer, channel: config.use.channel }));`,
    ],
    { env, encoding: "utf8", windowsHide: true, timeout: 15_000 },
  );
}

test("unsupported production ports are rejected before browser startup", () => {
  for (const port of ["1431", "1421", "", "1423 --host 0.0.0.0"]) {
    const result = loadConfig(port);
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0, `KK_TEST_PORT=${port} must be rejected`);
    assert.match(result.stderr, /fixed port 1423/);
  }
});

test("default and explicit production ports resolve to the exact supported origin", () => {
  for (const port of [undefined, "1423"]) {
    const result = loadConfig(port);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      baseURL: "http://127.0.0.1:1423",
      url: "http://127.0.0.1:1423",
      command:
        "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort",
      reuseExistingServer: false,
      channel: "msedge",
    });
  }
});
