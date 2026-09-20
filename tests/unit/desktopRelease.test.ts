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

test(
  "Windows entry checks freshness even when an executable already exists",
  {
    skip: process.platform !== "win32",
  },
  (t) => {
    const { root, executable } = fixture(t);
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
    const compiled = spawnSync(
      compiler,
      ["/nologo", "/target:winexe", `/out:${executable}`, stub],
      { windowsHide: true, encoding: "utf8" },
    );
    assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
    fs.mkdirSync(path.join(root, "scripts", "windows"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "scripts", "windows", "desktop-release.mjs"),
      'import fs from "node:fs"; fs.writeFileSync("freshness-checked.txt", "checked");',
    );
    fs.copyFileSync(
      new URL("../../start-kk-studio.bat", import.meta.url),
      path.join(root, "start-kk-studio.bat"),
    );
    const started = spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", "start-kk-studio.bat"],
      {
        cwd: root,
        windowsHide: true,
        encoding: "utf8",
        input: "\r\n",
        timeout: 10000,
      },
    );
    assert.equal(started.status, 0, started.stdout + started.stderr);
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
      "process.exitCode = 23;",
    );
    const failed = spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", "start-kk-studio.bat"],
      {
        cwd: root,
        windowsHide: true,
        encoding: "utf8",
        input: "\r\n",
        timeout: 10000,
      },
    );
    assert.equal(failed.status, 1, failed.stdout + failed.stderr);
    assert.equal(
      fs.existsSync(path.join(root, "previous-release-started.txt")),
      false,
      "failed checker must not fall back to the existing executable",
    );
  },
);
