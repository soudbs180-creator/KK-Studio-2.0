import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  bumpVersions,
  checkVersions,
  nextVersion,
} from "../../scripts/platform-versions.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "kk-platform-versions-"));
  mkdirSync(join(root, "config"));
  mkdirSync(join(root, "src-tauri"));
  writeFileSync(
    join(root, "config/platform-versions.json"),
    JSON.stringify(
      { schemaVersion: 1, desktop: "2.1.9", web: "2.1.9", mobile: "2.1.9" },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(join(root, "package.json"), '{"version":"2.1.9"}\n');
  writeFileSync(
    join(root, "package-lock.json"),
    '{"version":"2.1.9","packages":{"":{"version":"2.1.9"},"node_modules/example":{"version":"7.2.1"}}}\n',
  );
  writeFileSync(
    join(root, "src-tauri/Cargo.toml"),
    '[package]\nname = "kk-studio"\nversion = "2.1.9"\n',
  );
  writeFileSync(
    join(root, "src-tauri/Cargo.lock"),
    '[[package]]\nname = "example"\nversion = "9.9.9"\n\n[[package]]\nname = "kk-studio"\nversion = "2.1.9"\n',
  );
  writeFileSync(
    join(root, "src-tauri/tauri.conf.json"),
    '{"version":"2.1.9"}\n',
  );
  return root;
}

test("patch ten remains a three-segment version; major and minor reset lower segments", () => {
  assert.equal(nextVersion("2.1.9", "patch"), "2.1.10");
  assert.equal(nextVersion("2.1.9", "minor"), "2.2.0");
  assert.equal(nextVersion("2.1.9", "major"), "3.0.0");
  assert.throws(() => nextVersion("2.1.09", "patch"), /version/i);
});

test("desktop bump updates only desktop metadata and leaves Web and Mobile untouched", () => {
  const root = fixture();
  try {
    bumpVersions(root, ["desktop"], "patch");
    const versions = JSON.parse(
      readFileSync(join(root, "config/platform-versions.json"), "utf8"),
    );
    assert.deepEqual(versions, {
      schemaVersion: 1,
      desktop: "2.1.10",
      web: "2.1.9",
      mobile: "2.1.9",
    });
    assert.match(
      readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8"),
      /version = "2\.1\.10"/,
    );
    assert.match(
      readFileSync(join(root, "src-tauri/Cargo.lock"), "utf8"),
      /name = "kk-studio"\nversion = "2\.1\.10"/,
    );
    assert.equal(
      JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"))
        .version,
      "2.1.10",
    );
    assert.equal(
      JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version,
      "2.1.9",
    );
    assert.equal(checkVersions(root).length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Web and Mobile can advance independently without changing dependency versions", () => {
  const root = fixture();
  try {
    bumpVersions(root, ["web", "mobile"], "patch");
    const versions = JSON.parse(
      readFileSync(join(root, "config/platform-versions.json"), "utf8"),
    );
    const lock = JSON.parse(
      readFileSync(join(root, "package-lock.json"), "utf8"),
    );
    assert.deepEqual(versions, {
      schemaVersion: 1,
      desktop: "2.1.9",
      web: "2.1.10",
      mobile: "2.1.10",
    });
    assert.equal(lock.version, "2.1.10");
    assert.equal(lock.packages[""].version, "2.1.10");
    assert.equal(lock.packages["node_modules/example"].version, "7.2.1");
    assert.equal(checkVersions(root).length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("invalid platform or stale package version fails without partially writing files", () => {
  const root = fixture();
  try {
    const before = readFileSync(
      join(root, "config/platform-versions.json"),
      "utf8",
    );
    assert.throws(
      () => bumpVersions(root, ["desktop", "tablet"], "patch"),
      /platform/i,
    );
    assert.equal(
      readFileSync(join(root, "config/platform-versions.json"), "utf8"),
      before,
    );
    const packagePath = join(root, "package.json");
    writeFileSync(packagePath, '{"version":"2.1.8"}\n');
    assert.match(checkVersions(root).join(" "), /package\.json/);
    assert.throws(() => bumpVersions(root, ["web"], "patch"), /inconsistent/i);
    assert.equal(
      readFileSync(join(root, "config/platform-versions.json"), "utf8"),
      before,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
