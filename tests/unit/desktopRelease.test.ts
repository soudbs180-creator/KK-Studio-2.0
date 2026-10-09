import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  inspectDesktopRelease,
  runDesktopRelease,
} from "../../scripts/windows/desktop-release.mjs";

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
  assert.equal(inspectDesktopRelease(root).reason, "stale");
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
    /did not produce a current executable/,
  );
  assert.equal(launched, false);
});

test("current desktop release launches without another rebuild", (t) => {
  const { root, executable } = fixture(t);
  fs.utimesSync(executable, new Date(3000), new Date(3000));
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

for (const input of [
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
    assert.equal(release.reason, "stale");
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
      process.env.WINDIR ?? "C:\\Windows",
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
