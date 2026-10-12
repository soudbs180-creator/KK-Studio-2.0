import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectVersionConsistency } from "../../scripts/check-version-consistency.mjs";

function fixtureRoot() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "kk-version-consistency-"),
  );
  const write = (relative: string, value: string) => {
    const filename = path.join(root, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, value);
  };
  const version = "2.1.13";
  write(
    "config/platform-versions.json",
    JSON.stringify({
      schemaVersion: 1,
      desktop: version,
      web: version,
      mobile: "2.1.1",
    }),
  );
  write("VERSION", `${version}\n`);
  write(
    "package.json",
    JSON.stringify({
      name: "kk-studio",
      version,
      dependencies: { "@tauri-apps/api": "^2.11.1" },
    }),
  );
  write(
    "package-lock.json",
    JSON.stringify({
      lockfileVersion: 3,
      version,
      packages: {
        "": { name: "kk-studio", version },
        "node_modules/@tauri-apps/api": { version: "2.11.1" },
      },
    }),
  );
  write(
    "src-tauri/Cargo.toml",
    `[package]\nname = "kk-studio"\nversion = "${version}"\n`,
  );
  write(
    "src-tauri/Cargo.lock",
    `[[package]]\nname = "kk-studio"\nversion = "${version}"\n`,
  );
  write("src-tauri/tauri.conf.json", JSON.stringify({ version }));
  write(
    "vendor/canvas-agent/package.json",
    JSON.stringify({ name: "canvas-agent", version: "0.6.0" }),
  );
  write(
    "vendor/canvas-agent/package-lock.json",
    JSON.stringify({
      lockfileVersion: 3,
      packages: { "": { name: "canvas-agent", version: "0.6.0" } },
    }),
  );
  return { root, write };
}

test("version consistency accepts synchronized platform and nested package metadata", () => {
  const { root } = fixtureRoot();
  const report = inspectVersionConsistency(root, { checkRuntime: false });
  assert.deepEqual(report.errors, []);
});

test("version consistency catches nested lock drift and active source literals", () => {
  const { root, write } = fixtureRoot();
  write(
    "vendor/canvas-agent/package-lock.json",
    JSON.stringify({
      lockfileVersion: 3,
      packages: { "": { name: "canvas-agent", version: "0.6.1" } },
    }),
  );
  write("src/version-display.ts", 'export const stale = "2.1.12";\n');
  const report = inspectVersionConsistency(root, { checkRuntime: false });
  assert.match(report.errors.join("\n"), /canvas-agent.*differs/);
  assert.deepEqual(report.hardcodedVersions, [
    { path: "src/version-display.ts", line: 1, value: "2.1.12" },
  ]);
});
