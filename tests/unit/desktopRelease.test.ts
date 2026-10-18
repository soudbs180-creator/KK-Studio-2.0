import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  inspectDesktopDependencies,
  inspectDesktopRelease,
  runDesktopRelease,
} from "../../scripts/windows/desktop-release.mjs";
import {
  fingerprintDesktopInputs,
  writeDesktopReleaseReceipt,
} from "../../scripts/windows/desktop-release-identity.mjs";

function fixture(t: { after: (cleanup: () => void) => void }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-desktop-release-"));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("kk-desktop-release-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const source = path.join(root, "src", "App.tsx");
  const executable = path.join(
    root,
    "src-tauri",
    "target",
    "release",
    "kk-studio.exe",
  );
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.mkdirSync(path.dirname(executable), { recursive: true });
  fs.writeFileSync(source, "current source");
  fs.writeFileSync(executable, "previous release");
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({
      packages: {
        "node_modules/@tauri-apps/api": { version: "2.11.1" },
        "node_modules/@tauri-apps/plugin-dialog": { version: "2.7.3" },
        "node_modules/@tauri-apps/cli": { version: "2.11.4" },
      },
    }),
  );
  fs.mkdirSync(path.join(root, "config"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "config/platform-versions.json"),
    JSON.stringify({ desktop: "2.1.13" }),
  );
  fs.utimesSync(
    path.join(root, "config/platform-versions.json"),
    new Date(500),
    new Date(500),
  );
  fs.utimesSync(
    path.join(root, "package-lock.json"),
    new Date(500),
    new Date(500),
  );
  for (const [name, version] of [
    ["@tauri-apps/api", "2.11.1"],
    ["@tauri-apps/plugin-dialog", "2.7.3"],
    ["@tauri-apps/cli", "2.11.4"],
  ]) {
    const packageRoot = path.join(root, "node_modules", name);
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name, version }),
    );
  }
  fs.utimesSync(executable, new Date(1000), new Date(1000));
  fs.utimesSync(source, new Date(2000), new Date(2000));
  return { root, source, executable };
}

function processDiagnostic(
  phase: string,
  result: ReturnType<typeof spawnSync>,
  startedAt: number,
  context: {
    command: string;
    args: string[];
    cwd: string;
    checkerReceipt: string;
  },
) {
  const error = result.error as NodeJS.ErrnoException | undefined;
  const diagnostic = JSON.stringify({
    phase,
    command: context.command,
    args: context.args,
    cwd: context.cwd,
    parentNode: { executable: process.execPath, version: process.version },
    elapsedMs: Math.round(performance.now() - startedAt),
    pid: result.pid,
    status: result.status,
    signal: result.signal,
    error: error
      ? {
          name: error.name,
          message: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
        }
      : null,
    stdout: result.stdout,
    stderr: result.stderr,
    checker: fs.existsSync(context.checkerReceipt)
      ? fs.readFileSync(context.checkerReceipt, "utf8")
      : null,
  });
  console.log(`Windows entry fixture: ${diagnostic}`);
  return diagnostic;
}

test("stale desktop release is rebuilt before it can launch", (t) => {
  const { root, executable } = fixture(t);
  assert.equal(inspectDesktopRelease(root).reason, "unverified");
  const result = runDesktopRelease(root, {
    buildRelease: () => {
      fs.writeFileSync(executable, "current release");
      fs.utimesSync(executable, new Date(3000), new Date(3000));
    },
    launchRelease: (file: string) => {
      assert.equal(fs.readFileSync(file, "utf8"), "current release");
    },
  });
  assert.equal(result.rebuilt, true);
  assert.equal(result.needsBuild, false);
});

test("failed desktop rebuild cannot launch the previous release", (t) => {
  const { root } = fixture(t);
  let launched = false;
  assert.throws(
    () =>
      runDesktopRelease(root, {
        buildRelease: () => {
          throw new Error("compiler failed");
        },
        launchRelease: () => {
          launched = true;
        },
      }),
    /compiler failed/,
  );
  assert.equal(launched, false);
});

test("a build that leaves the executable stale cannot launch it", (t) => {
  const { root } = fixture(t);
  let launched = false;
  assert.throws(
    () =>
      runDesktopRelease(root, {
        buildRelease: () => {},
        launchRelease: () => {
          launched = true;
        },
      }),
    /did not produce a (replaced executable|current executable)/,
  );
  assert.equal(launched, false);
});

test("current desktop release launches without another rebuild", (t) => {
  const { root, executable } = fixture(t);
  fs.utimesSync(executable, new Date(3000), new Date(3000));
  writeDesktopReleaseReceipt(root);
  let launched = "";
  const result = runDesktopRelease(root, {
    buildRelease: () => {
      assert.fail("current release must not rebuild");
    },
    launchRelease: (file: string) => {
      launched = file;
    },
  });
  assert.equal(launched, executable);
  assert.equal(result.rebuilt, false);
});

test("desktop launch rebuilds when input content changes without a newer mtime", (t) => {
  const { root, executable, source } = fixture(t);
  fs.utimesSync(executable, new Date(3000), new Date(3000));
  writeDesktopReleaseReceipt(root);
  const originalMtime = fs.statSync(source).mtimeMs;
  fs.writeFileSync(source, "changed source with preserved timestamp");
  fs.utimesSync(source, originalMtime / 1000, originalMtime / 1000);
  let rebuilt = false;
  const result = runDesktopRelease(root, {
    buildRelease: () => {
      rebuilt = true;
      fs.writeFileSync(executable, "rebuilt release");
      fs.utimesSync(executable, new Date(4000), new Date(4000));
    },
    launchRelease: () => {},
  });
  assert.equal(rebuilt, true);
  assert.equal(result.rebuilt, true);
});

test("packaged Gemini bridge content participates in desktop release identity", (t) => {
  const { root } = fixture(t);
  const bridge = path.join(root, "scripts", "gemini-bridge.mjs");
  fs.mkdirSync(path.dirname(bridge), { recursive: true });
  fs.writeFileSync(bridge, "original bridge");
  fs.utimesSync(bridge, new Date(500), new Date(500));
  const original = fingerprintDesktopInputs(root);
  fs.writeFileSync(bridge, "changed bridge");
  fs.utimesSync(bridge, new Date(500), new Date(500));
  assert.notEqual(fingerprintDesktopInputs(root), original);
});

test("desktop launch rebuilds when a tracked input is deleted", (t) => {
  const { root, executable, source } = fixture(t);
  fs.utimesSync(executable, new Date(3000), new Date(3000));
  writeDesktopReleaseReceipt(root);
  fs.rmSync(source);
  let rebuilt = false;
  const result = runDesktopRelease(root, {
    buildRelease: () => {
      rebuilt = true;
      fs.writeFileSync(executable, "rebuilt after deletion");
      fs.utimesSync(executable, new Date(4000), new Date(4000));
    },
    launchRelease: () => {},
  });
  assert.equal(rebuilt, true);
  assert.equal(result.rebuilt, true);
});

test("desktop launch rejects a missing receipt until a build replaces the executable", (t) => {
  const { root, executable } = fixture(t);
  fs.utimesSync(executable, new Date(3000), new Date(3000));
  let rebuilt = false;
  const result = runDesktopRelease(root, {
    buildRelease: () => {
      rebuilt = true;
      fs.writeFileSync(executable, "rebuilt without prior receipt");
      fs.utimesSync(executable, new Date(4000), new Date(4000));
    },
    launchRelease: () => {},
  });
  assert.equal(rebuilt, true);
  assert.equal(result.rebuilt, true);
  assert.equal(inspectDesktopRelease(root).reason, "current");
});

test("desktop launch does not treat a missing lockfile as aligned", (t) => {
  const { root, executable } = fixture(t);
  fs.utimesSync(executable, new Date(3000), new Date(3000));
  writeDesktopReleaseReceipt(root);
  fs.rmSync(path.join(root, "package-lock.json"));
  let launched = false;
  assert.throws(
    () =>
      runDesktopRelease(root, {
        buildRelease: () => {},
        launchRelease: () => {
          launched = true;
        },
      }),
    /valid package-lock.json/,
  );
  assert.equal(launched, false);
});

test("desktop dependencies do not treat a linked node_modules directory as aligned", (t) => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "kk-desktop-linked-deps-"),
  );
  const target = fs.mkdtempSync(
    path.join(os.tmpdir(), "kk-desktop-linked-target-"),
  );
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(target, { recursive: true, force: true });
  });
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({
      packages: {
        "node_modules/@tauri-apps/api": { version: "2.11.1" },
        "node_modules/@tauri-apps/plugin-dialog": { version: "2.7.3" },
        "node_modules/@tauri-apps/cli": { version: "2.11.4" },
      },
    }),
  );
  try {
    fs.symlinkSync(target, path.join(root, "node_modules"), "junction");
  } catch (error) {
    t.skip(`junction creation unavailable: ${error}`);
    return;
  }
  assert.equal(inspectDesktopDependencies(root).needsInstall, true);
  assert.match(
    inspectDesktopDependencies(root).mismatches[0].actual,
    /linked directory/,
  );
});

test("desktop release identity rejects linked runtime inputs", (t) => {
  const { root } = fixture(t);
  const target = path.join(path.dirname(root), "kk-desktop-input-target.txt");
  fs.writeFileSync(target, "outside input");
  t.after(() => fs.rmSync(target, { force: true }));
  try {
    fs.symlinkSync(target, path.join(root, "src", "linked.ts"), "file");
  } catch (error) {
    t.skip(`symbolic link creation unavailable: ${error}`);
    return;
  }
  assert.throws(
    () => inspectDesktopRelease(root),
    /cannot be verified through a symbolic link/,
  );
});

test("desktop release fingerprint changes when a tracked input changes", (t) => {
  const { root, source } = fixture(t);
  const original = fingerprintDesktopInputs(root);
  fs.writeFileSync(source, "another source");
  assert.notEqual(fingerprintDesktopInputs(root), original);
});

test("desktop release fingerprint ignores package scripts but tracks runtime metadata", (t) => {
  const { root } = fixture(t);
  const manifest = path.join(root, "package.json");
  fs.writeFileSync(
    manifest,
    JSON.stringify({
      scripts: { build: "old" },
      dependencies: { runtime: "1.0.0" },
      type: "module",
    }),
  );
  const original = fingerprintDesktopInputs(root);
  fs.writeFileSync(
    manifest,
    JSON.stringify({
      scripts: { build: "new" },
      dependencies: { runtime: "1.0.0" },
      type: "module",
    }),
  );
  assert.equal(fingerprintDesktopInputs(root), original);
  fs.writeFileSync(
    manifest,
    JSON.stringify({
      scripts: { build: "new" },
      dependencies: { runtime: "2.0.0" },
      type: "module",
    }),
  );
  assert.notEqual(fingerprintDesktopInputs(root), original);
});

test("desktop launch detects node_modules drift from the lockfile", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-desktop-deps-"));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("kk-desktop-deps-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({
      packages: {
        "": {},
        "node_modules/@tauri-apps/api": { version: "2.11.1" },
        "node_modules/@tauri-apps/plugin-dialog": { version: "2.7.3" },
        "node_modules/@tauri-apps/cli": { version: "2.11.4" },
      },
    }),
  );
  for (const [name, version] of [
    ["@tauri-apps/api", "2.12.1"],
    ["@tauri-apps/plugin-dialog", "2.8.1"],
    ["@tauri-apps/cli", "2.12.1"],
  ]) {
    const packageRoot = path.join(root, "node_modules", name);
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name, version }),
    );
  }
  const inspection = inspectDesktopDependencies(root);
  assert.equal(inspection.needsInstall, true);
  assert.deepEqual(
    inspection.mismatches.map(({ name, expected, actual }) => ({
      name,
      expected,
      actual,
    })),
    [
      { name: "@tauri-apps/api", expected: "2.11.1", actual: "2.12.1" },
      {
        name: "@tauri-apps/plugin-dialog",
        expected: "2.7.3",
        actual: "2.8.1",
      },
      { name: "@tauri-apps/cli", expected: "2.11.4", actual: "2.12.1" },
    ],
  );
});

test("desktop dependency inspection catches non-toolchain lockfile drift", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-desktop-deps-all-"));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({
      packages: {
        "": {},
        "node_modules/runtime-only": { version: "1.0.0" },
      },
    }),
  );
  const packageRoot = path.join(root, "node_modules/runtime-only");
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify({ name: "runtime-only", version: "2.0.0" }),
  );
  assert.deepEqual(inspectDesktopDependencies(root), {
    needsInstall: true,
    mismatches: [{ name: "runtime-only", expected: "1.0.0", actual: "2.0.0" }],
  });
});

test("desktop launch rebuilds when dependencies drift even if the release is current", (t) => {
  const { root, executable } = fixture(t);
  fs.utimesSync(executable, new Date(3000), new Date(3000));
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({
      packages: {
        "node_modules/@tauri-apps/api": { version: "2.11.1" },
        "node_modules/@tauri-apps/plugin-dialog": { version: "2.7.3" },
        "node_modules/@tauri-apps/cli": { version: "2.11.4" },
      },
    }),
  );
  fs.utimesSync(
    path.join(root, "package-lock.json"),
    new Date(2000),
    new Date(2000),
  );
  writeDesktopReleaseReceipt(root);
  for (const [name, version] of [
    ["@tauri-apps/api", "2.12.1"],
    ["@tauri-apps/plugin-dialog", "2.8.1"],
    ["@tauri-apps/cli", "2.12.1"],
  ]) {
    const packageRoot = path.join(root, "node_modules", name);
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name, version }),
    );
  }
  let rebuilt = false;
  const result = runDesktopRelease(root, {
    buildRelease: () => {
      rebuilt = true;
      fs.writeFileSync(executable, "rebuilt after dependency repair");
      fs.utimesSync(executable, new Date(4000), new Date(4000));
      for (const [name, version] of [
        ["@tauri-apps/api", "2.11.1"],
        ["@tauri-apps/plugin-dialog", "2.7.3"],
        ["@tauri-apps/cli", "2.11.4"],
      ]) {
        fs.writeFileSync(
          path.join(root, "node_modules", name, "package.json"),
          JSON.stringify({ name, version }),
        );
      }
    },
    launchRelease: () => {},
  });
  assert.equal(rebuilt, true);
  assert.equal(result.rebuilt, true);
});

test("desktop launch accepts node_modules aligned with the lockfile", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-desktop-deps-"));
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("kk-desktop-deps-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  fs.writeFileSync(
    path.join(root, "package-lock.json"),
    JSON.stringify({
      packages: {
        "": {},
        "node_modules/@tauri-apps/api": { version: "2.11.1" },
        "node_modules/@tauri-apps/plugin-dialog": { version: "2.7.3" },
        "node_modules/@tauri-apps/cli": { version: "2.11.4" },
      },
    }),
  );
  for (const [name, version] of [
    ["@tauri-apps/api", "2.11.1"],
    ["@tauri-apps/plugin-dialog", "2.7.3"],
    ["@tauri-apps/cli", "2.11.4"],
  ]) {
    const packageRoot = path.join(root, "node_modules", name);
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name, version }),
    );
  }
  assert.deepEqual(inspectDesktopDependencies(root), {
    needsInstall: false,
    mismatches: [],
  });
});

for (const input of [
  "dist/index.css",
  "vendor/canvas-agent/src/index.ts",
  "vendor/canvas-agent/agent-instructions.md",
  "scripts/agent/desktop-entry.mjs",
  "config/platform-versions.json",
  "src-tauri/build.rs",
  "src-tauri/tauri.agent.conf.json",
  "src-tauri/capabilities/default.json",
]) {
  test(`desktop launch detects a newer runtime input: ${input}`, (t) => {
    const { root, executable } = fixture(t);
    fs.utimesSync(executable, new Date(3000), new Date(3000));
    const changed = path.join(root, input);
    fs.mkdirSync(path.dirname(changed), { recursive: true });
    fs.writeFileSync(changed, "newer runtime input");
    fs.utimesSync(changed, new Date(4000), new Date(4000));
    const release = inspectDesktopRelease(root);
    assert.equal(release.reason, "unverified");
    assert.equal(release.newestInputPath, changed);
  });
}

test(
  "Windows entry checks freshness even when an executable already exists",
  {
    skip: process.platform !== "win32",
  },
  (t) => {
    const { root, executable } = fixture(t);
    const checkerReceipt = path.join(root, "freshness-checked.txt");
    const compiler = path.join(
      process.env.WINDIR ?? "C:/Windows",
      "Microsoft.NET",
      "Framework64",
      "v4.0.30319",
      "csc.exe",
    );
    const stub = path.join(root, "ReleaseStub.cs");
    fs.writeFileSync(
      stub,
      'class ReleaseStub { static void Main() { System.IO.File.WriteAllText("previous-release-started.txt", "old"); } }',
    );
    const compilerArguments = [
      "/nologo",
      "/target:winexe",
      `/out:${executable}`,
      stub,
    ];
    const compilationStartedAt = performance.now();
    const compiled = spawnSync(compiler, compilerArguments, {
      windowsHide: true,
      encoding: "utf8",
    });
    const compilationDiagnostic = processDiagnostic(
      "compile-existing-executable",
      compiled,
      compilationStartedAt,
      {
        command: compiler,
        args: compilerArguments,
        cwd: process.cwd(),
        checkerReceipt,
      },
    );
    assert.equal(compiled.error, undefined, compilationDiagnostic);
    assert.equal(compiled.status, 0, compilationDiagnostic);
    fs.mkdirSync(path.join(root, "scripts", "windows"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "scripts", "windows", "desktop-release.mjs"),
      'import fs from "node:fs"; fs.writeFileSync("freshness-checked.txt", JSON.stringify({phase:"freshness-success",node:process.execPath,version:process.version}));',
    );
    fs.copyFileSync(
      new URL("../../start-kk-studio.bat", import.meta.url),
      path.join(root, "start-kk-studio.bat"),
    );
    const launcherCommand = process.env.ComSpec ?? "cmd.exe";
    const launcherArguments = ["/d", "/c", "start-kk-studio.bat"];
    const launchStartedAt = performance.now();
    const started = spawnSync(launcherCommand, launcherArguments, {
      cwd: root,
      windowsHide: true,
      encoding: "utf8",
      input: "\r\n",
      timeout: 10000,
    });
    const launchDiagnostic = processDiagnostic(
      "freshness-success",
      started,
      launchStartedAt,
      {
        command: launcherCommand,
        args: launcherArguments,
        cwd: root,
        checkerReceipt,
      },
    );
    assert.equal(started.error, undefined, launchDiagnostic);
    assert.equal(started.status, 0, launchDiagnostic);
    assert.equal(
      fs.existsSync(path.join(root, "freshness-checked.txt")),
      true,
      "existing release must pass through the freshness checker",
    );
    assert.equal(
      fs.existsSync(path.join(root, "previous-release-started.txt")),
      false,
    );

    fs.writeFileSync(
      path.join(root, "scripts", "windows", "desktop-release.mjs"),
      'import fs from "node:fs"; fs.writeFileSync("freshness-checked.txt", JSON.stringify({phase:"freshness-rejected",node:process.execPath,version:process.version})); process.exitCode = 23;',
    );
    const rejectionStartedAt = performance.now();
    const failed = spawnSync(launcherCommand, launcherArguments, {
      cwd: root,
      windowsHide: true,
      encoding: "utf8",
      input: "\r\n",
      timeout: 10000,
    });
    const rejectionDiagnostic = processDiagnostic(
      "freshness-rejected",
      failed,
      rejectionStartedAt,
      {
        command: launcherCommand,
        args: launcherArguments,
        cwd: root,
        checkerReceipt,
      },
    );
    assert.equal(failed.error, undefined, rejectionDiagnostic);
    assert.equal(failed.status, 1, rejectionDiagnostic);
    assert.equal(
      fs.existsSync(path.join(root, "previous-release-started.txt")),
      false,
      "failed checker must not fall back to the existing executable",
    );
  },
);
