import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  existsSync,
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

function fixture(withMobile = false) {
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
  writeFileSync(join(root, "VERSION"), "2.1.9\n");
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
  if (withMobile) {
    mkdirSync(join(root, "mobile"));
    writeFileSync(
      join(root, "mobile/package.json"),
      JSON.stringify({
        name: "@kk-studio/mobile",
        version: "2.1.9",
        dependencies: { expo: "~57.0.28" },
      }) + "\n",
    );
    writeFileSync(
      join(root, "mobile/package-lock.json"),
      JSON.stringify({
        version: "2.1.9",
        packages: {
          "": { version: "2.1.9", dependencies: { expo: "~57.0.28" } },
          "node_modules/expo": { version: "57.0.28" },
        },
      }) + "\n",
    );
    writeFileSync(
      join(root, "mobile/app.json"),
      JSON.stringify({
        expo: {
          version: "2.1.9",
          scheme: "kkstudio-mobile",
          android: { package: "com.kkstudio.mobile" },
          ios: { bundleIdentifier: "com.kkstudio.mobile" },
          extra: { storageNamespace: "kk-mobile-creation-v1" },
        },
      }) + "\n",
    );
  }
  return root;
}

test("patch ten remains a three-segment version; major and minor reset lower segments", () => {
  assert.equal(nextVersion("2.1.9", "patch"), "2.1.10");
  assert.equal(nextVersion("2.1.9", "minor"), "2.2.0");
  assert.equal(nextVersion("2.1.9", "major"), "3.0.0");
  assert.throws(() => nextVersion("2.1.09", "patch"), /version/i);
});

test("desktop bump updates only desktop metadata and leaves Web and Mobile untouched", () => {
  const root = fixture(true);
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
    assert.equal(readFileSync(join(root, "VERSION"), "utf8"), "2.1.9\n");
    assert.equal(checkVersions(root).length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Web and Mobile can advance independently without changing dependency versions", () => {
  const root = fixture(true);
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
    assert.equal(readFileSync(join(root, "VERSION"), "utf8"), "2.1.10\n");
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

test("an implemented Mobile package checks all four version mirrors and refuses a bump on drift", () => {
  const root = fixture(true);
  try {
    assert.deepEqual(checkVersions(root), []);
    for (const [file, field, description] of [
      ["mobile/package.json", ["version"], "mobile/package.json"],
      ["mobile/package-lock.json", ["version"], "mobile/package-lock.json"],
      [
        "mobile/package-lock.json",
        ["packages", "", "version"],
        "mobile/package-lock.json root package",
      ],
      ["mobile/app.json", ["expo", "version"], "mobile/app.json expo"],
    ] as const) {
      const path = join(root, file),
        original = readFileSync(path, "utf8");
      const before = readFileSync(
        join(root, "config/platform-versions.json"),
        "utf8",
      );
      const data = JSON.parse(original);
      let target = data;
      for (const key of field.slice(0, -1)) target = target[key];
      target[field.at(-1)!] = "2.1.8";
      writeFileSync(path, JSON.stringify(data));
      assert.deepEqual(checkVersions(root), [
        `${description}: 2.1.8 differs from 2.1.9`,
      ]);
      assert.throws(() => bumpVersions(root, ["mobile"]), /Inconsistent/);
      assert.equal(
        readFileSync(join(root, "config/platform-versions.json"), "utf8"),
        before,
      );
      writeFileSync(path, original);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Mobile-only bump synchronizes its real package, lock and Expo versions while preserving dependencies and storage identifiers", () => {
  const root = fixture(true);
  try {
    const read = (file: string) =>
      JSON.parse(readFileSync(join(root, file), "utf8"));
    const pkg = read("mobile/package.json"),
      lock = read("mobile/package-lock.json"),
      app = read("mobile/app.json");
    const result = bumpVersions(root, ["mobile"]);
    assert.deepEqual(result, {
      desktop: "2.1.9",
      web: "2.1.9",
      mobile: "2.1.10",
    });
    assert.deepEqual(read("mobile/package.json"), {
      ...pkg,
      version: "2.1.10",
    });
    assert.deepEqual(read("mobile/package-lock.json"), {
      ...lock,
      version: "2.1.10",
      packages: {
        ...lock.packages,
        "": { ...lock.packages[""], version: "2.1.10" },
      },
    });
    assert.deepEqual(read("mobile/app.json"), {
      ...app,
      expo: { ...app.expo, version: "2.1.10" },
    });
    assert.equal(read("package.json").version, "2.1.9");
    assert.equal(readFileSync(join(root, "VERSION"), "utf8"), "2.1.9\n");
    assert.match(
      readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8"),
      /version = "2\.1\.9"/,
    );
    assert.deepEqual(checkVersions(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("planning-only Mobile metadata still advances without creating a Mobile project", () => {
  const root = fixture();
  try {
    bumpVersions(root, ["mobile"]);
    assert.equal(existsSync(join(root, "mobile")), false);
    assert.deepEqual(checkVersions(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a partial Mobile package fails closed instead of being mistaken for a planning-only project", () => {
  const root = fixture();
  try {
    mkdirSync(join(root, "mobile"));
    writeFileSync(
      join(root, "mobile/app.json"),
      '{"expo":{"version":"2.1.9"}}',
    );
    const before = readFileSync(
      join(root, "config/platform-versions.json"),
      "utf8",
    );
    assert.throws(() => checkVersions(root), /ENOENT/);
    assert.throws(() => bumpVersions(root, ["mobile"]), /ENOENT/);
    assert.equal(
      readFileSync(join(root, "config/platform-versions.json"), "utf8"),
      before,
    );
    assert.equal(existsSync(join(root, "mobile/package.json")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
