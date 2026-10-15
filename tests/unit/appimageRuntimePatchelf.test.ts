import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { buildDesktop } from "../../scripts/agent/build-desktop.mjs";
import {
  fileIdentity,
  cliValues,
  matchSource,
  resolvePatchelf,
  runPatchelfOperation,
  safeProductName,
  sessionEnvironment,
  shouldProtectAppImage,
  sourceSnapshot,
  validateHost,
  withPatchelfSession,
} from "../../scripts/agent/appimage-runtime-patchelf.mjs";

const digest = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const nodeIdentity = {
  path: fs.realpathSync(process.execPath),
  ...fileIdentity(fs.realpathSync(process.execPath)),
};

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-patchelf-test-"));
  const sourceRuntime = path.join(root, "src-tauri/agent-runtime");
  const appDir = path.join(
    root,
    "src-tauri/target/release/bundle/appimage/KK Studio.AppDir",
  );
  const runtime = path.join(appDir, "usr/lib/KK Studio/agent-runtime");
  fs.mkdirSync(sourceRuntime, { recursive: true });
  fs.mkdirSync(runtime, { recursive: true });
  const bytes = "synthetic-public-node-runtime";
  fs.writeFileSync(path.join(sourceRuntime, "node"), bytes);
  fs.writeFileSync(path.join(runtime, "node"), bytes);
  const script = path.join(root, "real-tool.mjs");
  fs.writeFileSync(
    script,
    `import fs from 'node:fs'; const args=process.argv.slice(2); fs.writeFileSync(${JSON.stringify(path.join(root, "delegated.json"))}, JSON.stringify(args)); if(args[0]==='--set-rpath')fs.appendFileSync(args.at(-1),'changed-by-real-tool'); else process.stdout.write('original-rpath');`,
  );
  const policy = {
    root,
    appDir,
    sourceRuntime,
    productName: "KK Studio",
    version: "2.1.18",
    host: { platform: "linux", arch: "x64" },
    realTool: nodeIdentity,
    resources: [
      {
        path: "node",
        size: Buffer.byteLength(bytes),
        sha256: digest(bytes),
        mode: fs.statSync(path.join(sourceRuntime, "node")).mode & 0o777,
      },
    ],
    log: path.join(root, "preserved.ndjson"),
  };
  return { root, policy, script, runtime, bytes };
}

test("manifested original runtime bytes survive a real delegated RPATH mutation", () => {
  const f = fixture();
  try {
    const node = path.join(f.runtime, "node");
    const result = runPatchelfOperation(
      f.policy,
      ["--set-rpath", "$ORIGIN", node],
      [f.script],
    );
    assert.equal(result.status, 0);
    assert.equal(fs.readFileSync(node, "utf8"), f.bytes);
    assert.equal(fs.existsSync(path.join(f.root, "delegated.json")), false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("print-rpath and ordinary application mutations execute the real delegate with literal argv", () => {
  const f = fixture();
  try {
    const node = path.join(f.runtime, "node");
    const printed = runPatchelfOperation(
      f.policy,
      ["--print-rpath", node],
      [f.script],
    );
    assert.equal(printed.status, 0);
    assert.equal(printed.stdout, "original-rpath");
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(f.root, "delegated.json"), "utf8")),
      ["--print-rpath", node],
    );
    assert.equal(fs.readFileSync(node, "utf8"), f.bytes);
    const application = path.join(f.policy.appDir, "usr/bin/kk-studio");
    fs.mkdirSync(path.dirname(application), { recursive: true });
    fs.writeFileSync(application, "synthetic-native-executable");
    const args = ["--set-rpath", "$ORIGIN/../lib:space ' literal", application];
    assert.equal(runPatchelfOperation(f.policy, args, [f.script]).status, 0);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(f.root, "delegated.json"), "utf8")),
      args,
    );
    assert.equal(
      fs.readFileSync(application, "utf8"),
      "synthetic-native-executablechanged-by-real-tool",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("already changed packaged or original bytes fail before any delegate is run", () => {
  for (const changed of ["packaged", "original"]) {
    const f = fixture();
    try {
      const node = path.join(f.runtime, "node");
      const edited =
        changed === "packaged"
          ? node
          : path.join(f.policy.sourceRuntime, "node");
      fs.writeFileSync(edited, "X" + f.bytes.slice(1));
      assert.throws(
        () =>
          runPatchelfOperation(
            f.policy,
            ["--set-rpath", "$ORIGIN", node],
            [f.script],
          ),
        /changed.*sha256/,
      );
      assert.equal(fs.existsSync(path.join(f.root, "delegated.json")), false);
      assert.equal(fs.readFileSync(edited, "utf8"), "X" + f.bytes.slice(1));
    } finally {
      fs.rmSync(f.root, { recursive: true, force: true });
    }
  }
});

test("linked resource parents, unmanifested files and unknown protected operations are rejected", () => {
  const f = fixture();
  try {
    const node = path.join(f.runtime, "node");
    for (const args of [
      ["--remove-rpath", node],
      ["--set-rpath", "value", "extra", node],
    ])
      assert.throws(
        () => runPatchelfOperation(f.policy, args, [f.script]),
        /Unsupported operation/,
      );
    const extra = path.join(f.runtime, "unlisted");
    fs.writeFileSync(extra, "unlisted bytes");
    assert.throws(
      () =>
        runPatchelfOperation(
          f.policy,
          ["--set-rpath", "value", extra],
          [f.script],
        ),
      /Unmanifested/,
    );
    const original = f.runtime + "-original";
    fs.renameSync(f.runtime, original);
    fs.symlinkSync(
      original,
      f.runtime,
      process.platform === "win32" ? "junction" : "dir",
    );
    assert.throws(
      () =>
        runPatchelfOperation(
          f.policy,
          ["--set-rpath", "value", node],
          [f.script],
        ),
      /symbolic links/,
    );
    assert.equal(fs.existsSync(path.join(f.root, "delegated.json")), false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("root fences reject an undeclared AppDir and source fences reject HEAD or input changes", () => {
  const f = fixture();
  try {
    assert.throws(
      () =>
        runPatchelfOperation(
          { ...f.policy, appDir: f.root },
          ["--print-rpath", path.join(f.runtime, "node")],
          [f.script],
        ),
      /AppDir escapes/,
    );
    assert.throws(
      () =>
        runPatchelfOperation(
          { ...f.policy, sourceRuntime: f.root },
          ["--print-rpath", path.join(f.runtime, "node")],
          [f.script],
        ),
      /source escapes/,
    );
    const before = { sourceHead: "before", inputSha256: "same" };
    assert.throws(
      () => matchSource(before, { ...before, sourceHead: "changed" }),
      /HEAD changed/,
    );
    assert.throws(
      () => matchSource(before, { ...before, inputSha256: "changed" }),
      /inputs changed/,
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("only native default Linux AppImage builds enable the producer policy", () => {
  assert.equal(shouldProtectAppImage([], "linux"), true);
  assert.equal(
    shouldProtectAppImage(["--bundles", "appimage,deb"], "linux"),
    true,
  );
  assert.equal(shouldProtectAppImage(["--bundles=appimage"], "linux"), true);
  assert.equal(
    shouldProtectAppImage(["-b", "deb", "appimage", "--verbose"], "linux"),
    true,
  );
  assert.deepEqual(
    cliValues(["-t", "x86_64-unknown-linux-gnu"], "--target", "-t"),
    ["x86_64-unknown-linux-gnu"],
  );
  assert.deepEqual(
    cliValues(["-c", "one.json", "--config=two.json"], "--config", "-c"),
    ["one.json", "two.json"],
  );
  for (const args of [
    ["--no-bundle"],
    ["-b", "deb"],
    ["--features", "native-e2e"],
    ["--no-default-features"],
    ["--debug"],
    ["--help"],
  ])
    assert.equal(shouldProtectAppImage(args, "linux"), false);
  for (const platform of ["win32", "darwin"])
    assert.equal(shouldProtectAppImage([], platform), false);
  assert.equal(shouldProtectAppImage(["--bundles"], "linux"), false);
  assert.throws(() => cliValues(["--target"], "--target", "-t"), /Missing/);
  assert.throws(
    () => validateHost({ platform: "win32", arch: "x64" }),
    /Linux/,
  );
  assert.throws(
    () => validateHost({ platform: "linux", arch: "ia32" }),
    /architecture/,
  );
  for (const name of [
    "",
    "..",
    "../KK",
    "KK/Studio",
    "KK\\Studio",
    "KK\0Studio",
  ])
    assert.throws(() => safeProductName(name), /safe path segment/);
});

test("existing PATCHELF is preserved and child environment never mutates the parent", () => {
  const env = { PATH: "synthetic-absolute-path", KEEP: "unchanged" };
  const child = sessionEnvironment({ adapter: "/owned/patchelf" }, env);
  assert.equal(child.PATCHELF, "/owned/patchelf");
  assert.deepEqual(env, { PATH: "synthetic-absolute-path", KEEP: "unchanged" });
  for (const PATCHELF of ["", "/some/existing/patchelf"]) {
    assert.throws(
      () =>
        sessionEnvironment(
          { adapter: "/owned/patchelf" },
          { ...env, PATCHELF },
        ),
      /must not be replaced/,
    );
    assert.throws(
      () => resolvePatchelf({ ...env, PATCHELF }),
      /must not be replaced/,
    );
  }
});

test("a failed real delegate leaves its bytes unchanged and the policy temp directory is cleaned", () => {
  const f = fixture();
  const directory = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "kk-appimage-patchelf-"),
  );
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: f.root });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Synthetic",
        "-c",
        "user.email=synthetic@example.invalid",
        "commit",
        "--allow-empty",
        "--quiet",
        "-m",
        "fixture",
      ],
      { cwd: f.root },
    );
    const policy = {
      ...f.policy,
      runId: "synthetic-run",
      before: sourceSnapshot(f.root),
      manifest: { size: 0, sha256: digest(""), mode: 0 },
      log: path.join(directory, "preserved.ndjson"),
    };
    const session = {
      policy,
      directory,
      adapter: path.join(directory, "patchelf.mjs"),
    };
    const env = { PATH: "original" };
    assert.throws(
      () =>
        withPatchelfSession(session, env, (childEnv: { PATCHELF: string }) => {
          assert.equal(childEnv.PATCHELF, session.adapter);
          const failed = runPatchelfOperation(
            f.policy,
            ["--version"],
            ["-e", "process.exit(7)", "--"],
          );
          assert.equal(failed.status, 7);
          return failed.status;
        }),
      /Tauri AppImage build failed/,
    );
    assert.equal(fs.existsSync(directory), false);
    assert.deepEqual(env, { PATH: "original" });
    const receipt = JSON.parse(
      fs.readFileSync(
        path.join(f.root, ".tmp/appimage-runtime-patchelf/synthetic-run.json"),
        "utf8",
      ),
    );
    assert.equal(receipt.passed, false);
    assert.equal(receipt.buildStatus, 7);
    assert.deepEqual(receipt.before, receipt.after);
    assert.equal(
      fs.readFileSync(path.join(f.runtime, "node"), "utf8"),
      f.bytes,
    );
  } finally {
    if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true });
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("no-bundle CLI preserves literal build argv and existing environment in a real subprocess", () => {
  const f = fixture();
  try {
    const cli = path.join(f.root, "node_modules/@tauri-apps/cli/tauri.js");
    fs.mkdirSync(path.dirname(cli), { recursive: true });
    fs.writeFileSync(
      path.join(f.root, "src-tauri/tauri.conf.json"),
      JSON.stringify({
        productName: "KK Studio",
        bundle: { active: true, targets: "all" },
      }),
    );
    const saved = path.join(f.root, "cli-result.json");
    fs.writeFileSync(
      cli,
      `const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(saved)},JSON.stringify({args:process.argv.slice(2),patchelf:process.env.PATCHELF}));`,
    );
    const args = [
      "--no-bundle",
      "--target",
      "literal target space",
      "--verbose",
    ];
    const env = { ...process.env, PATCHELF: "existing custom tool" };
    assert.equal(buildDesktop(args, f.root, env), 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(saved, "utf8")), {
      args: ["build", ...args],
      patchelf: "existing custom tool",
    });
    assert.equal(env.PATCHELF, "existing custom tool");
    assert.equal(
      fs.existsSync(path.join(f.root, ".tmp/appimage-runtime-patchelf")),
      false,
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("final producer hashes the actual package and rejects late stripping or source changes", () => {
  for (const mutation of ["none", "late-strip", "source"]) {
    const f = fixture();
    const directory = fs.mkdtempSync(
      path.join(fs.realpathSync(os.tmpdir()), "kk-appimage-patchelf-"),
    );
    try {
      execFileSync("git", ["init", "--quiet"], { cwd: f.root });
      execFileSync(
        "git",
        [
          "-c",
          "user.name=Synthetic",
          "-c",
          "user.email=synthetic@example.invalid",
          "commit",
          "--allow-empty",
          "--quiet",
          "-m",
          "fixture",
        ],
        { cwd: f.root },
      );
      const manifest = JSON.stringify({
        schemaVersion: 1,
        files: f.policy.resources,
      });
      fs.writeFileSync(
        path.join(f.policy.sourceRuntime, "runtime-manifest.json"),
        manifest,
      );
      fs.writeFileSync(path.join(f.runtime, "runtime-manifest.json"), manifest);
      const packagePath = path.join(
        path.dirname(f.policy.appDir),
        "KK Studio_2.1.18_amd64.AppImage",
      );
      fs.writeFileSync(packagePath, "synthetic-package-container");
      const oldPackage = path.join(
        path.dirname(f.policy.appDir),
        "KK Studio_2.1.17_amd64.AppImage",
      );
      fs.writeFileSync(oldPackage, "old-version-exact-bytes");
      const policy = {
        ...f.policy,
        runId: `synthetic-${mutation}`,
        manifest: fileIdentity(
          path.join(f.policy.sourceRuntime, "runtime-manifest.json"),
        ),
        before: sourceSnapshot(f.root),
        log: path.join(directory, "preserved.ndjson"),
      };
      const run = () =>
        withPatchelfSession(
          { policy, directory, adapter: path.join(directory, "patchelf.mjs") },
          {},
          () => {
            runPatchelfOperation(
              policy,
              ["--set-rpath", "$ORIGIN", path.join(f.runtime, "node")],
              [f.script],
            );
            if (mutation === "late-strip")
              fs.appendFileSync(
                path.join(f.runtime, "node"),
                "late-tool-mutation",
              );
            if (mutation === "source") {
              fs.mkdirSync(path.join(f.root, "src"));
              fs.writeFileSync(
                path.join(f.root, "src/changed.ts"),
                "changed source",
              );
            }
            return 0;
          },
        );
      if (mutation === "none") assert.equal(run(), 0);
      else assert.throws(run, /changed/);
      assert.equal(fs.existsSync(directory), false);
      const report = JSON.parse(
        fs.readFileSync(
          path.join(
            f.root,
            `.tmp/appimage-runtime-patchelf/${policy.runId}.json`,
          ),
          "utf8",
        ),
      );
      assert.equal(report.passed, mutation === "none");
      assert.equal(report.preserved.length, 1);
      assert.equal(
        fs.readFileSync(oldPackage, "utf8"),
        "old-version-exact-bytes",
      );
      if (mutation === "none") {
        assert.equal(
          report.package.sha256,
          digest("synthetic-package-container"),
        );
        assert.equal(report.package.path, path.relative(f.root, packagePath));
        assert.equal(report.files[0].sha256, digest(f.bytes));
        assert.deepEqual(report.before, report.after);
      }
    } finally {
      if (fs.existsSync(directory)) fs.rmSync(directory, { recursive: true });
      fs.rmSync(f.root, { recursive: true, force: true });
    }
  }
});
