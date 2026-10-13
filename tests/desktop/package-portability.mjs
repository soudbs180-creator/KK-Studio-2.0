import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { fingerprintDesktopInputs } from "../../scripts/windows/desktop-release-identity.mjs";

const root = process.cwd();
const output = path.join(root, ".tmp/package-portability");
const markers = [
  "app",
  "providers",
  "profile",
  "memory",
  "projects",
  "conversations",
  "assets",
  "models",
  "comfyui",
  "cache",
  "backups",
  "logs",
  "tasks",
  "tasks/native-host",
];
const ended = (child) => child.exitCode !== null || child.signalCode !== null;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function validateResource(file, seen) {
  assert(file && typeof file.path === "string", "Invalid runtime resource");
  assert(!/[\\:\0]/.test(file.path), "Invalid runtime resource path");
  assert(
    file.path.split("/").every((part) => part && part !== "." && part !== ".."),
    "Invalid runtime resource path",
  );
  assert(!seen.has(file.path), "Duplicate runtime resource");
  assert(
    Number.isSafeInteger(file.size) &&
      file.size >= 0 &&
      file.size <= 512 * 1024 * 1024,
    "Invalid runtime resource size",
  );
  assert(
    typeof file.sha256 === "string" && /^[a-f0-9]{64}$/i.test(file.sha256),
    "Invalid runtime resource digest",
  );
  seen.add(file.path);
}

function validateManifest(value, platform, arch) {
  assert(value && value.schemaVersion === 1, "Invalid runtime manifest");
  assert.equal(value.platform, platform, "Runtime platform mismatch");
  assert.equal(value.arch, arch, "Runtime architecture mismatch");
  assert(
    typeof value.node === "string" && /^v?24\.\d+\.\d+$/.test(value.node),
    "Runtime Node version mismatch",
  );
  assert.equal(
    value.nodeExecutable ?? "node",
    "node",
    "Runtime Node executable mismatch",
  );
  assert(
    Array.isArray(value.files) &&
      value.files.length > 0 &&
      value.files.length <= 20000,
    "Invalid runtime resources",
  );
  const seen = new Set();
  for (const file of value.files) validateResource(file, seen);
  for (const required of [
    "node",
    "desktop-entry.mjs",
    "unix-guardian.mjs",
    "agent/dist/index.js",
  ])
    assert(seen.has(required), "Missing runtime resource entry point");
  return value;
}

async function containedFile(directory, relative) {
  const base = await fs.realpath(directory);
  let file = base;
  for (const part of relative.split("/")) {
    assert(
      part && part !== "." && part !== ".." && !/[\\:\0]/.test(part),
      "Invalid resource path",
    );
    file = path.join(file, part);
    assert(
      !(await fs.lstat(file)).isSymbolicLink(),
      "Resource must not be a symbolic link",
    );
  }
  assert((await fs.stat(file)).isFile(), "Resource must be a regular file");
  assert(
    (await fs.realpath(file)).startsWith(base + path.sep),
    "Resource escapes its package",
  );
  return file;
}

async function identity(file) {
  const stat = await fs.stat(file);
  assert(stat.isFile(), "Expected a regular package file");
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return {
    size: stat.size,
    sha256: digest.digest("hex"),
    mode: stat.mode & 0o777,
  };
}

function command(executable, args, cwd, log, timeout = 120000) {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  log.push({
    command: path.basename(executable),
    args,
    status: result.status,
    signal: result.signal,
    stdout: (result.stdout ?? "").slice(-65536),
    stderr: (result.stderr ?? "").slice(-65536),
  });
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    `${path.basename(executable)} failed: ${(result.stderr ?? "").slice(-2000)}`,
  );
  return result.stdout;
}

function sourceSnapshot() {
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const sourceDirty = git(
    "status",
    "--porcelain",
    "--untracked-files=normal",
  ).trimEnd();
  const dirt = validateDirt(sourceDirty);
  return {
    sourceHead: git("rev-parse", "HEAD").trim(),
    inputSha256: fingerprintDesktopInputs(root),
    sourceDirty,
    generatedDocuments: dirt,
  };
}

function validateDirt(sourceDirty) {
  const dirt = sourceDirty.split("\n").filter(Boolean);
  assert(
    dirt.every((line) =>
      /^src-tauri\/gen\/schemas\/[a-zA-Z-]+\.json$/.test(line.slice(3)),
    ),
    "Actual source dirt blocks default package evidence",
  );
  return dirt;
}

function matchSource(before, after) {
  assert.equal(
    after.sourceHead,
    before.sourceHead,
    "Source HEAD changed during packaging or smoke",
  );
  assert.equal(
    after.inputSha256,
    before.inputSha256,
    "Source inputs changed during packaging or smoke",
  );
}

async function single(directory, suffix) {
  const names = (await fs.readdir(directory)).filter((name) =>
    name.endsWith(suffix),
  );
  assert.equal(
    names.length,
    1,
    `Expected exactly one ${suffix} candidate in ${directory}`,
  );
  const file = path.join(directory, names[0]);
  assert(
    !(await fs.lstat(file)).isSymbolicLink(),
    "Package candidate must not be a link",
  );
  return file;
}

async function candidates() {
  const bundles = path.join(root, "src-tauri/target/release/bundle");
  if (process.platform === "darwin")
    return [
      {
        format: "app",
        file: await single(path.join(bundles, "macos"), ".app"),
      },
      { format: "dmg", file: await single(path.join(bundles, "dmg"), ".dmg") },
    ];
  return [
    {
      format: "appimage",
      file: await single(path.join(bundles, "appimage"), ".AppImage"),
    },
    { format: "deb", file: await single(path.join(bundles, "deb"), ".deb") },
  ];
}

async function unpack(candidate, owned, log) {
  if (candidate.format === "app") {
    const extracted = path.join(owned, path.basename(candidate.file));
    await fs.cp(candidate.file, extracted, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    return { extracted };
  }
  if (candidate.format === "dmg") {
    const mount = path.join(owned, "mount");
    await fs.mkdir(mount);
    candidate.mount = mount;
    command(
      "hdiutil",
      [
        "attach",
        "-readonly",
        "-nobrowse",
        "-mountpoint",
        mount,
        candidate.file,
      ],
      owned,
      log,
    );
    return { extracted: await single(mount, ".app"), mount };
  }
  if (candidate.format === "deb") {
    const extracted = path.join(owned, "deb");
    command("dpkg-deb", ["--info", candidate.file], owned, log);
    const version = command(
      "dpkg-deb",
      ["--field", candidate.file, "Version"],
      owned,
      log,
    ).trim();
    const arch = command(
      "dpkg-deb",
      ["--field", candidate.file, "Architecture"],
      owned,
      log,
    ).trim();
    const versions = JSON.parse(
      await fs.readFile(
        path.join(root, "config/platform-versions.json"),
        "utf8",
      ),
    );
    assert.equal(version, versions.desktop, "Debian package version mismatch");
    assert.equal(
      arch,
      process.arch === "x64" ? "amd64" : "arm64",
      "Debian package architecture mismatch",
    );
    command("dpkg-deb", ["--extract", candidate.file, extracted], owned, log);
    return { extracted };
  }
  command(candidate.file, ["--appimage-extract"], owned, log);
  return { extracted: path.join(owned, "squashfs-root") };
}

function validateProductName(productName) {
  assert(
    typeof productName === "string" &&
      productName.length > 0 &&
      productName !== "." &&
      productName !== ".." &&
      !/[\/\\:\u0000-\u001f]/.test(productName),
    "Product name must be a safe single resource path segment",
  );
  return productName;
}

async function packageLayout(extracted, format, productName) {
  validateProductName(productName);
  assert(
    ["app", "dmg", "appimage", "deb"].includes(format),
    "Unknown default package format",
  );
  const mac = format === "app" || format === "dmg";
  const manifest = await containedFile(
    extracted,
    mac
      ? "Contents/Resources/agent-runtime/runtime-manifest.json"
      : `usr/lib/${productName}/agent-runtime/runtime-manifest.json`,
  );
  const exe = await containedFile(
    extracted,
    mac ? "Contents/MacOS/kk-studio" : "usr/bin/kk-studio",
  );
  return {
    exe,
    launcher:
      format === "appimage" ? await containedFile(extracted, "AppRun") : exe,
    runtime: path.dirname(manifest),
  };
}

async function runtimeProof(directory, expected, log) {
  assert(
    !(await fs.lstat(directory)).isSymbolicLink(),
    "Runtime directory must not be a link",
  );
  const manifestPath = await containedFile(directory, "runtime-manifest.json");
  const manifestIdentity = await identity(manifestPath);
  assert(
    manifestIdentity.size <= 2 * 1024 * 1024,
    "Runtime manifest is oversized",
  );
  assert.equal(
    manifestIdentity.sha256,
    expected.sha256,
    "Package runtime manifest does not match the freshly packaged resources",
  );
  const value = validateManifest(
    JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        await fs.readFile(manifestPath),
      ),
    ),
    process.platform,
    process.arch,
  );
  const files = [];
  for (const file of value.files) {
    const actual = await identity(await containedFile(directory, file.path));
    assert.equal(actual.size, file.size, `Runtime size changed: ${file.path}`);
    assert.equal(
      actual.sha256,
      file.sha256.toLowerCase(),
      `Runtime digest changed: ${file.path}`,
    );
    files.push({ path: file.path, ...actual });
  }
  const node = await containedFile(directory, "node");
  assert((await fs.stat(node)).mode & 0o111, "Packaged Node is not executable");
  const actualNode = JSON.parse(
    command(
      node,
      [
        "-p",
        "JSON.stringify({version:process.version,platform:process.platform,arch:process.arch})",
      ],
      directory,
      log,
      10000,
    ),
  );
  assert.equal(
    actualNode.version.replace(/^v/, ""),
    value.node.replace(/^v/, ""),
    "Actual packaged Node version changed",
  );
  assert.equal(
    actualNode.platform,
    value.platform,
    "Actual packaged Node platform changed",
  );
  assert.equal(
    actualNode.arch,
    value.arch,
    "Actual packaged Node architecture changed",
  );
  return {
    manifest: manifestIdentity,
    platform: value.platform,
    arch: value.arch,
    node: actualNode,
    files,
  };
}

async function awaitExit(child, timeout) {
  const until = Date.now() + timeout;
  while (!ended(child) && Date.now() < until) await delay(100);
  return ended(child);
}

async function stopOwned(child) {
  assert(
    Number.isSafeInteger(child.pid) && child.pid > 0,
    "Missing owned spawn PID",
  );
  if (!ended(child)) child.kill("SIGTERM");
  if (!(await awaitExit(child, 10000))) {
    child.kill("SIGKILL");
    assert(await awaitExit(child, 5000), "Owned package process did not exit");
  }
  return {
    pid: child.pid,
    exitCode: child.exitCode,
    signalCode: child.signalCode,
  };
}

async function storageReady(data) {
  for (const marker of markers) {
    const stat = await fs.lstat(path.join(data, marker)).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (!stat) return false;
    assert(
      stat.isDirectory() && !stat.isSymbolicLink(),
      "App storage marker is not an owned directory",
    );
  }
  return true;
}

async function smoke(executable, owned, log, args = []) {
  const data = path.join(owned, "data");
  assert(
    !(await fs.stat(data).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    })),
    "Smoke storage must start absent",
  );
  const profile = path.join(owned, "profile");
  await fs.mkdir(profile);
  const env = {
    ...process.env,
    HOME: profile,
    XDG_CONFIG_HOME: profile,
    XDG_DATA_HOME: profile,
    XDG_CACHE_HOME: profile,
  };
  delete env.KK_NATIVE_E2E;
  delete env.TAURI_WEBDRIVER_PORT;
  const child = spawn(executable, [...args, "--data-dir", data], {
    cwd: owned,
    stdio: ["ignore", "pipe", "pipe"],
    env,
    windowsHide: true,
  });
  let spawnError;
  child.on("error", (error) => {
    spawnError = error;
  });
  const chunks = [];
  let remaining = 65536;
  const capture = (chunk) => {
    chunks.push(chunk.subarray(0, remaining));
    remaining = Math.max(0, remaining - chunk.length);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  let termination;
  try {
    const until = Date.now() + 30000;
    while (!(await storageReady(data))) {
      if (spawnError) throw spawnError;
      assert(
        !ended(child),
        "Default package exited before Native storage initialization",
      );
      assert(
        Date.now() < until,
        "Default package storage initialization timed out",
      );
      await delay(100);
    }
    await delay(2000);
    assert(
      !ended(child),
      "Default package exited after Native storage initialization",
    );
  } finally {
    if (child.pid) termination = await stopOwned(child);
    log.push({
      defaultProcessLog: Buffer.concat(chunks).toString("utf8"),
      termination,
    });
  }
  return {
    pid: child.pid,
    dataRoot: data,
    markers,
    termination,
    scope:
      "Default package launcher startup and Native storage initialization only; UI, IPC, vault and Agent functionality NOT VERIFIED by this smoke",
  };
}

async function cleanupOwned(owned) {
  const canonical = await fs.realpath(owned);
  assert.equal(
    path.dirname(canonical),
    await fs.realpath(os.tmpdir()),
    "Cleanup must stay in the owned OS temp directory",
  );
  assert(
    path.basename(canonical).startsWith("kk-package-"),
    "Cleanup ownership prefix mismatch",
  );
  await fs.rm(canonical, { recursive: true, force: false });
}

async function verifyCandidate(candidate, expected, report, productName) {
  const owned = await fs.mkdtemp(path.join(os.tmpdir(), "kk-package-"));
  const log = [];
  let unpacked;
  try {
    unpacked = await unpack(candidate, owned, log);
    if (process.platform === "darwin") {
      command(
        "codesign",
        ["--verify", "--deep", "--strict", unpacked.extracted],
        owned,
        log,
      );
      command(
        "codesign",
        ["--display", "--verbose=4", unpacked.extracted],
        owned,
        log,
      );
      assert(
        log.at(-1).stderr.includes("Signature=adhoc"),
        "macOS candidate must have the requested free ad-hoc signature",
      );
    }
    const layout = await packageLayout(
      unpacked.extracted,
      candidate.format,
      productName,
    );
    const executable = await identity(layout.exe);
    assert(
      executable.mode & 0o111,
      "Default package executable is not executable",
    );
    const launcher = await identity(layout.launcher);
    assert(launcher.mode & 0o111, "Default package launcher is not executable");
    const runtime = await runtimeProof(layout.runtime, expected, log);
    const launch = await smoke(layout.launcher, owned, log);
    report.packages.push({
      format: candidate.format,
      packagePath: path.relative(root, candidate.file),
      package:
        candidate.format === "app"
          ? {
              kind: "directory",
              executableSha256: executable.sha256,
              manifestSha256: runtime.manifest.sha256,
            }
          : await identity(candidate.file),
      packagedExecutable: {
        path: path.relative(unpacked.extracted, layout.exe),
        ...executable,
      },
      launcher: {
        path: path.relative(unpacked.extracted, layout.launcher),
        ...launcher,
      },
      runtime,
      launch,
      passed: true,
    });
  } finally {
    try {
      if (candidate.mount)
        command("hdiutil", ["detach", candidate.mount], owned, log);
      await cleanupOwned(owned);
    } finally {
      await fs.writeFile(
        path.join(output, `${candidate.format}.log.json`),
        JSON.stringify(log, null, 2) + "\n",
      );
    }
  }
}

async function main(phase) {
  assert(
    ["darwin", "linux"].includes(process.platform),
    "Package portability runs on native Mac/Linux hosts",
  );
  assert(
    ["prepare", "verify"].includes(phase),
    "Usage: package-portability.mjs prepare|verify|--self-test",
  );
  if (phase === "prepare") {
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(
      path.join(output, "before.json"),
      JSON.stringify(sourceSnapshot(), null, 2) + "\n",
      { flag: "wx" },
    );
    return;
  }
  const before = JSON.parse(
    await fs.readFile(path.join(output, "before.json"), "utf8"),
  );
  const report = {
    createdAt: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    before,
    scope:
      "Default custom-protocol build, no native-e2e feature; bundle marker/signing changes recorded by actual package executable hashes",
    signing:
      process.platform === "darwin"
        ? "Ad-hoc identity '-'; Apple notarization and downloaded Gatekeeper acceptance NOT VERIFIED"
        : "Distribution signing NOT VERIFIED",
    packages: [],
    errors: [],
    passed: false,
  };
  try {
    matchSource(before, sourceSnapshot());
    report.productName = validateProductName(
      JSON.parse(
        await fs.readFile(path.join(root, "src-tauri/tauri.conf.json"), "utf8"),
      ).productName,
    );
    report.rawReleaseExecutable = await identity(
      path.join(root, "src-tauri/target/release/kk-studio"),
    );
    report.rawReleaseExecutableScope =
      "Raw post-bundle build output only; never substituted for each packaged executable";
    const expected = await identity(
      path.join(root, "src-tauri/agent-runtime/runtime-manifest.json"),
    );
    for (const candidate of await candidates())
      await verifyCandidate(candidate, expected, report, report.productName);
    report.passed = true;
  } catch (error) {
    report.errors.push(String(error.stack ?? error));
    process.exitCode = 1;
  } finally {
    try {
      report.after = sourceSnapshot();
      matchSource(before, report.after);
    } catch (error) {
      report.errors.push(String(error.stack ?? error));
      report.passed = false;
      process.exitCode = 1;
    }
    await fs.writeFile(
      path.join(output, "receipt.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        passed: report.passed,
        checks: report.packages.length,
        errors: report.errors,
        output,
      }),
    );
  }
}

function selfTests() {
  const resource = (path) => ({ path, size: 1, sha256: "a".repeat(64) });
  const manifest = () => ({
    schemaVersion: 1,
    platform: "linux",
    arch: "x64",
    node: "v24.20.0",
    nodeExecutable: "node",
    files: [
      "node",
      "desktop-entry.mjs",
      "unix-guardian.mjs",
      "agent/dist/index.js",
    ].map(resource),
  });
  test("accepts the bounded platform-specific runtime manifest", () => {
    assert.equal(validateManifest(manifest(), "linux", "x64").files.length, 4);
  });
  test("rejects mismatched platform, architecture and Node major", () => {
    for (const change of [
      { platform: "darwin" },
      { arch: "arm64" },
      { node: "v22.0.0" },
    ])
      assert.throws(
        () => validateManifest({ ...manifest(), ...change }, "linux", "x64"),
        /runtime/i,
      );
  });
  test("rejects traversal, alternate separators and absolute resources", () => {
    for (const path of [
      "../node",
      "/node",
      "a//node",
      "a/./node",
      "a\\node",
      "C:node",
    ])
      assert.throws(
        () =>
          validateManifest(
            { ...manifest(), files: [...manifest().files, resource(path)] },
            "linux",
            "x64",
          ),
        /resource/i,
      );
  });
  test("rejects duplicates, oversized files, bad hashes and missing entry points", () => {
    const good = manifest();
    for (const files of [
      [...good.files, good.files[0]],
      good.files.slice(1),
      [...good.files, { ...resource("extra"), size: 536870913 }],
      [...good.files, { ...resource("extra"), sha256: "wrong" }],
    ])
      assert.throws(
        () => validateManifest({ ...good, files }, "linux", "x64"),
        /resource/i,
      );
  });
  test("keeps real source dirt blocking and preserves porcelain columns", () => {
    assert.equal(
      validateDirt(
        " M src-tauri/gen/schemas/desktop-schema.json\n?? src-tauri/gen/schemas/linux-schema.json",
      ).length,
      2,
    );
    for (const dirt of [
      " M src-tauri/Cargo.toml",
      "?? src/extra.ts",
      " M src-tauri/gen/schemas/../Cargo.toml",
    ])
      assert.throws(() => validateDirt(dirt), /source dirt/);
  });
  test("rejects source HEAD or input hash changes", () => {
    const before = { sourceHead: "a", inputSha256: "b" };
    matchSource(before, { ...before });
    assert.throws(
      () => matchSource(before, { ...before, sourceHead: "changed" }),
      /HEAD changed/,
    );
    assert.throws(
      () => matchSource(before, { ...before, inputSha256: "changed" }),
      /inputs changed/,
    );
  });
  test("hashes actual contained bytes and rejects linked resource parents", async () => {
    const owned = await fs.mkdtemp(path.join(os.tmpdir(), "kk-package-"));
    try {
      await fs.mkdir(path.join(owned, "real"));
      await fs.writeFile(path.join(owned, "real/file"), "synthetic-resource");
      const file = await containedFile(owned, "real/file");
      assert.equal((await identity(file)).sha256, hash("synthetic-resource"));
      await fs.symlink(
        path.join(owned, "real"),
        path.join(owned, "linked"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await assert.rejects(
        containedFile(owned, "linked/file"),
        /symbolic link/,
      );
      await assert.rejects(containedFile(owned, "../file"), /resource path/);
    } finally {
      await cleanupOwned(owned);
    }
  });
  test("reads actual AppImage and Debian product-name resource layouts", async () => {
    const owned = await fs.mkdtemp(path.join(os.tmpdir(), "kk-package-"));
    try {
      // Tauri's locked Debian generator uses productName for resources; its
      // AppImage generator copies the same usr tree and adds the real AppRun.
      await fs.mkdir(path.join(owned, "usr/bin"), { recursive: true });
      await fs.mkdir(path.join(owned, "usr/lib/KK Studio/agent-runtime"), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(owned, "usr/bin/kk-studio"),
        "synthetic-native-exe",
      );
      await fs.writeFile(
        path.join(
          owned,
          "usr/lib/KK Studio/agent-runtime/runtime-manifest.json",
        ),
        "{}",
      );
      await fs.writeFile(
        path.join(owned, "AppRun"),
        "synthetic-appimage-launcher",
      );
      for (const format of ["appimage", "deb"]) {
        const layout = await packageLayout(owned, format, "KK Studio");
        assert.equal(
          layout.exe,
          path.join(await fs.realpath(owned), "usr/bin/kk-studio"),
        );
        assert.equal(
          layout.runtime,
          path.join(
            await fs.realpath(owned),
            "usr/lib/KK Studio/agent-runtime",
          ),
        );
        assert.equal(
          layout.launcher,
          format === "appimage"
            ? path.join(await fs.realpath(owned), "AppRun")
            : layout.exe,
        );
        if (format === "appimage")
          assert.notEqual(
            (await identity(layout.launcher)).sha256,
            (await identity(layout.exe)).sha256,
          );
      }
      await assert.rejects(packageLayout(owned, "deb", "kk-studio"), /ENOENT/);
      await fs.unlink(path.join(owned, "AppRun"));
      await assert.rejects(
        packageLayout(owned, "appimage", "KK Studio"),
        /ENOENT/,
      );
      assert.equal(
        (await packageLayout(owned, "deb", "KK Studio")).launcher,
        path.join(await fs.realpath(owned), "usr/bin/kk-studio"),
      );
    } finally {
      await cleanupOwned(owned);
    }
  });
  test("rejects unsafe product-name path segments without fallback", () => {
    assert.equal(validateProductName("KK Studio"), "KK Studio");
    for (const name of [
      undefined,
      "",
      ".",
      "..",
      "../KK Studio",
      "KK/Studio",
      "KK\\Studio",
      "C:KK",
      "KK\0Studio",
      "KK\nStudio",
    ])
      assert.throws(
        () => validateProductName(name),
        /single resource path segment/,
      );
  });
  test("keeps the Mac app and dmg layout independent of the host platform", async () => {
    const owned = await fs.mkdtemp(path.join(os.tmpdir(), "kk-package-"));
    try {
      await fs.mkdir(path.join(owned, "Contents/MacOS"), { recursive: true });
      await fs.mkdir(path.join(owned, "Contents/Resources/agent-runtime"), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(owned, "Contents/MacOS/kk-studio"),
        "synthetic-mac-exe",
      );
      await fs.writeFile(
        path.join(
          owned,
          "Contents/Resources/agent-runtime/runtime-manifest.json",
        ),
        "{}",
      );
      for (const format of ["app", "dmg"]) {
        const layout = await packageLayout(owned, format, "KK Studio");
        assert.equal(layout.launcher, layout.exe);
        assert.equal(
          layout.runtime,
          path.join(
            await fs.realpath(owned),
            "Contents/Resources/agent-runtime",
          ),
        );
      }
    } finally {
      await cleanupOwned(owned);
    }
  });
  test("bounded Node fixture exercises owned PID cleanup and absent storage markers", async () => {
    const owned = await fs.mkdtemp(path.join(os.tmpdir(), "kk-package-"));
    const log = [];
    try {
      const code = `const fs=require('node:fs'),path=require('node:path'); const data=process.argv[process.argv.indexOf('--data-dir')+1]; for(const name of ${JSON.stringify(markers)}) fs.mkdirSync(path.join(data,name),{recursive:true}); setInterval(()=>{},1000);`;
      const result = await smoke(process.execPath, owned, log, [
        "-e",
        code,
        "--",
      ]);
      assert(Number.isSafeInteger(result.pid));
      assert(
        result.termination.exitCode !== null ||
          result.termination.signalCode !== null,
      );
      assert.equal(log.length, 1);
    } finally {
      await cleanupOwned(owned);
    }
  });
  test("bounded Node fixture exiting early cannot pass default startup smoke", async () => {
    const owned = await fs.mkdtemp(path.join(os.tmpdir(), "kk-package-"));
    try {
      await assert.rejects(
        smoke(process.execPath, owned, [], ["-e", "process.exit(3)", "--"]),
        /exited before Native storage/,
      );
    } finally {
      await cleanupOwned(owned);
    }
  });
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  if (process.argv.includes("--self-test")) selfTests();
  else await main(process.argv[2]);
}
