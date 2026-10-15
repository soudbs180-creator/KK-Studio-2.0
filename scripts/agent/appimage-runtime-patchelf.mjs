import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fingerprintDesktopInputs } from "../windows/desktop-release-identity.mjs";

const modulePath = fileURLToPath(import.meta.url);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function unsafeSegment(name) {
  return Array.from(name).some(
    (character) => character.charCodeAt(0) < 32 || "/\\:".includes(character),
  );
}

// Tauri's official linuxdeploy build recursively rewrites ELF files in usr/lib:
// https://github.com/linuxdeploy/linuxdeploy/blob/659c9db374666be3f29432316a859221eac28e53/src/core/appdir.cpp#L815
// Its supported PATCHELF override lets the producer preserve our opaque runtime:
// https://github.com/linuxdeploy/linuxdeploy/blob/659c9db374666be3f29432316a859221eac28e53/src/core/elf_file.cpp#L41
// Package verification still independently requires every original resource hash.

export function fileIdentity(file) {
  const stat = fs.lstatSync(file);
  assert(
    stat.isFile() && !stat.isSymbolicLink(),
    "Expected an unlinked regular file",
  );
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const descriptor = fs.openSync(file, "r");
  try {
    let length;
    while ((length = fs.readSync(descriptor, buffer, 0, buffer.length, null)))
      hash.update(buffer.subarray(0, length));
  } finally {
    fs.closeSync(descriptor);
  }
  return {
    size: stat.size,
    sha256: hash.digest("hex"),
    mode: stat.mode & 0o777,
  };
}

export function safeProductName(name) {
  assert(
    typeof name === "string" &&
      name &&
      name !== "." &&
      name !== ".." &&
      !unsafeSegment(name),
    "AppImage productName must be one safe path segment",
  );
  return name;
}

function relativeParts(relative) {
  assert(
    typeof relative === "string" && relative.length > 0,
    "Missing resource path",
  );
  const parts = relative.split("/");
  assert(
    parts.every(
      (part) => part && part !== "." && part !== ".." && !unsafeSegment(part),
    ),
    "Unsafe resource path",
  );
  return parts;
}

export function containedPath(directory, relative, directoryOnly = false) {
  assert.equal(
    fs.realpathSync(directory),
    directory,
    "Resource root must be canonical",
  );
  assert(
    !fs.lstatSync(directory).isSymbolicLink(),
    "Resource root must not be linked",
  );
  let current = directory;
  for (const part of relativeParts(relative)) {
    current = path.join(current, part);
    assert(
      !fs.lstatSync(current).isSymbolicLink(),
      "Resource path must not contain symbolic links",
    );
  }
  assert(
    fs.statSync(current)[directoryOnly ? "isDirectory" : "isFile"](),
    "Resource type mismatch",
  );
  assert.equal(
    fs.realpathSync(current),
    current,
    "Resource must stay in its canonical root",
  );
  return current;
}

export function validateHost(
  host = { platform: process.platform, arch: process.arch },
) {
  assert.equal(
    host.platform,
    "linux",
    "AppImage protection requires a Linux host",
  );
  assert(
    ["x64", "arm64"].includes(host.arch),
    "Unsupported AppImage host architecture",
  );
}

export function cliValues(args, name, shortName, variadic = false) {
  const values = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") break;
    if (arg === name || arg === shortName) {
      if (!variadic) {
        assert(args[index + 1], `Missing ${name} value`);
        values.push(args[++index]);
      } else {
        while (args[index + 1] && !args[index + 1].startsWith("-"))
          values.push(args[++index]);
      }
    } else if (arg.startsWith(name + "=") || arg.startsWith(shortName + "=")) {
      values.push(arg.slice(arg.indexOf("=") + 1));
    }
  }
  return values;
}

export function shouldProtectAppImage(args, platform, targets = "all") {
  if (
    platform !== "linux" ||
    [
      "--no-bundle",
      "--no-default-features",
      "--debug",
      "-d",
      "--help",
      "-h",
      "--version",
      "-V",
    ].some((flag) => args.includes(flag))
  )
    return false;
  if (args.some((arg) => arg.includes("native-e2e"))) return false;
  const values = cliValues(args, "--bundles", "-b", true).flatMap((value) =>
    value.split(","),
  );
  const specified = args.some(
    (arg) =>
      arg === "--bundles" ||
      arg === "-b" ||
      arg.startsWith("--bundles=") ||
      arg.startsWith("-b="),
  );
  const selected = specified ? values : targets;
  const bundles = Array.isArray(selected)
    ? selected
    : String(selected).split(",");
  return bundles.some((bundle) => ["appimage", "all"].includes(bundle));
}

export function sourceSnapshot(root) {
  return {
    sourceHead: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    inputSha256: fingerprintDesktopInputs(root),
  };
}

export function matchSource(before, after) {
  assert.equal(
    after.sourceHead,
    before.sourceHead,
    "AppImage source HEAD changed",
  );
  assert.equal(
    after.inputSha256,
    before.inputSha256,
    "AppImage source inputs changed",
  );
}

function checkIdentity(actual, expected, message) {
  for (const field of ["size", "sha256", "mode"])
    assert.equal(actual[field], expected[field], `${message}: ${field}`);
}

function readRuntime(root, host) {
  const sourceRuntime = containedPath(root, "src-tauri/agent-runtime", true);
  const manifestPath = containedPath(sourceRuntime, "runtime-manifest.json");
  const manifest = fileIdentity(manifestPath);
  assert(
    manifest.size <= 4 * 1024 * 1024,
    "Runtime manifest exceeds its bound",
  );
  const value = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(
      fs.readFileSync(manifestPath),
    ),
  );
  assert.equal(value.schemaVersion, 1, "Unknown runtime manifest schema");
  assert.equal(value.platform, host.platform, "Runtime platform mismatch");
  assert.equal(value.arch, host.arch, "Runtime architecture mismatch");
  assert.equal(
    value.nodeExecutable ?? "node",
    "node",
    "Runtime Node entry point mismatch",
  );
  assert(/^v?24\.\d+\.\d+$/.test(value.node), "Runtime Node version mismatch");
  assert(
    Array.isArray(value.files) &&
      value.files.length > 0 &&
      value.files.length <= 20000,
    "Invalid runtime file list",
  );
  const seen = new Set();
  const resources = value.files.map((file) => {
    relativeParts(file.path);
    assert(!seen.has(file.path), "Duplicate manifested runtime file");
    seen.add(file.path);
    assert(
      Number.isSafeInteger(file.size) &&
        file.size >= 0 &&
        file.size <= 512 * 1024 * 1024 &&
        /^[a-f0-9]{64}$/.test(file.sha256),
      "Invalid runtime file identity",
    );
    const actual = fileIdentity(containedPath(sourceRuntime, file.path));
    assert.equal(actual.size, file.size, "Original runtime size changed");
    assert.equal(actual.sha256, file.sha256, "Original runtime digest changed");
    return { path: file.path, ...actual };
  });
  for (const required of [
    "node",
    "desktop-entry.mjs",
    "unix-guardian.mjs",
    "agent/dist/index.js",
  ])
    assert(seen.has(required), "Missing runtime entry point");
  return { sourceRuntime, manifest, resources };
}

export function resolvePatchelf(env) {
  assert(
    env.PATCHELF === undefined,
    "Existing PATCHELF configuration must not be replaced",
  );
  for (const directory of (env.PATH ?? "").split(path.delimiter)) {
    if (!path.isAbsolute(directory)) continue;
    const candidate = path.join(directory, "patchelf");
    if (!fs.existsSync(candidate)) continue;
    assert(
      !fs.lstatSync(candidate).isSymbolicLink(),
      "Real patchelf must not be a symbolic link",
    );
    const file = fs.realpathSync(candidate);
    const identity = fileIdentity(file);
    assert(identity.mode & 0o111, "Real patchelf must be executable");
    assert(
      !(identity.mode & 0o022),
      "Real patchelf must not be writable by another group or user",
    );
    assert(
      [0, process.getuid()].includes(fs.statSync(file).uid),
      "Real patchelf must belong to the system or current builder",
    );
    const version = spawnSync(file, ["--version"], {
      encoding: "utf8",
      shell: false,
      timeout: 5000,
      maxBuffer: 65536,
    });
    assert(
      version.status === 0 && /^patchelf \d+\.\d+/.test(version.stdout),
      "PATH executable is not the real patchelf tool",
    );
    return { path: file, ...identity, version: version.stdout.trim() };
  }
  throw new Error("A trusted absolute patchelf executable is required in PATH");
}

function assertRootFence(policy) {
  assert.equal(fs.realpathSync(policy.root), policy.root, "Build root changed");
  safeProductName(policy.productName);
  assert.equal(
    policy.sourceRuntime,
    path.join(policy.root, "src-tauri/agent-runtime"),
    "Runtime source escapes build root",
  );
  const target = policy.target ?? "";
  assert(
    !target || /^[a-z0-9_]+-unknown-linux-(?:gnu|musl)$/.test(target),
    "Unsafe AppImage target triple",
  );
  assert.equal(
    policy.appDir,
    path.join(
      policy.root,
      "src-tauri/target",
      target,
      "release/bundle/appimage",
      `${policy.productName}.AppDir`,
    ),
    "AppDir escapes the declared release build",
  );
}

function verifiedRuntimeFile(policy, file) {
  assertRootFence(policy);
  const runtimePath = path
    .relative(
      policy.root,
      path.join(policy.appDir, "usr/lib", policy.productName, "agent-runtime"),
    )
    .split(path.sep)
    .join("/");
  const base = containedPath(policy.root, runtimePath, true);
  const absolute = path.resolve(file);
  if (!absolute.startsWith(base + path.sep)) return undefined;
  const relative = path.relative(base, absolute).split(path.sep).join("/");
  const expected = policy.resources.find((entry) => entry.path === relative);
  assert(expected, "Unmanifested file inside protected runtime");
  checkIdentity(
    fileIdentity(containedPath(policy.sourceRuntime, relative)),
    expected,
    "Original runtime changed after preparation",
  );
  checkIdentity(
    fileIdentity(containedPath(base, relative)),
    expected,
    "Packaged runtime changed before protection",
  );
  return expected;
}

export function runPatchelfOperation(policy, args, delegatePrefix = []) {
  assertRootFence(policy);
  assert(
    Array.isArray(args) && args.every((arg) => typeof arg === "string"),
    "Invalid patchelf arguments",
  );
  const expected =
    args.length > 1 ? verifiedRuntimeFile(policy, args.at(-1)) : undefined;
  if (expected) {
    assert(
      (args.length === 3 && args[0] === "--set-rpath") ||
        (args.length === 2 && args[0] === "--print-rpath"),
      "Unsupported operation inside protected runtime",
    );
    if (args[0] === "--set-rpath") {
      fs.appendFileSync(
        policy.log,
        JSON.stringify({
          action: "preserved-rpath",
          requestedRpath: args[1],
          ...expected,
        }) + "\n",
        { mode: 0o600 },
      );
      return {
        status: 0,
        signal: null,
        stdout: "",
        stderr: `Preserved original manifested Agent bytes: ${expected.path}\n`,
      };
    }
  }
  checkIdentity(
    fileIdentity(policy.realTool.path),
    policy.realTool,
    "Real patchelf executable changed",
  );
  return spawnSync(policy.realTool.path, [...delegatePrefix, ...args], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 1024 * 1024,
  });
}

export function createPatchelfSession(
  root,
  productName,
  env = process.env,
  target = "",
  invocation = {},
) {
  const host = { platform: process.platform, arch: process.arch };
  validateHost(host);
  root = fs.realpathSync(root);
  productName = safeProductName(productName);
  const realTool = resolvePatchelf(env);
  const runtime = readRuntime(root, host);
  const before = sourceSnapshot(root);
  const version = invocation.configuration?.version;
  assert(
    typeof version === "string" && /^\d+\.\d+\.\d+$/.test(version),
    "AppImage policy requires the effective source version",
  );
  assert(
    path.isAbsolute(process.execPath) &&
      !/[\s]/.test(process.execPath) &&
      process.execPath.length < 200,
    "Node path cannot form a safe executable adapter",
  );
  if (target)
    assert.equal(
      target.split("-")[0],
      host.arch === "x64" ? "x86_64" : "aarch64",
      "Cross-architecture AppImage runtime is unsupported",
    );
  const policy = {
    schemaVersion: 1,
    runId: randomUUID(),
    host,
    root,
    productName,
    realTool,
    target,
    version,
    invocationSha256: digest(JSON.stringify(invocation)),
    ...runtime,
    before,
    appDir: path.join(
      root,
      "src-tauri/target",
      target,
      "release/bundle/appimage",
      `${productName}.AppDir`,
    ),
  };
  assertRootFence(policy);
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), `kk-appimage-patchelf-${policy.runId}-`),
  );
  fs.chmodSync(directory, 0o700);
  try {
    policy.log = path.join(directory, "preserved.ndjson");
    const configuration = path.join(directory, "policy.json");
    const bytes = JSON.stringify(policy);
    fs.writeFileSync(configuration, bytes, { flag: "wx", mode: 0o600 });
    const adapter = path.join(directory, "patchelf.mjs");
    fs.writeFileSync(
      adapter,
      `#!${process.execPath}\nimport { adapterMain } from ${JSON.stringify(pathToFileURL(modulePath).href)};\nprocess.exitCode = adapterMain(${JSON.stringify(configuration)}, ${JSON.stringify(digest(bytes))}, process.argv.slice(2));\n`,
      { flag: "wx", mode: 0o700 },
    );
    return { policy, directory, adapter };
  } catch (error) {
    removeOwnedSession({ directory });
    throw error;
  }
}

export function removeOwnedSession(session) {
  const canonical = fs.realpathSync(session.directory);
  assert.equal(
    canonical,
    session.directory,
    "Adapter cleanup directory changed",
  );
  assert.equal(
    path.dirname(canonical),
    fs.realpathSync(os.tmpdir()),
    "Adapter cleanup escapes OS temporary root",
  );
  assert(
    path.basename(canonical).startsWith("kk-appimage-patchelf-"),
    "Adapter cleanup ownership mismatch",
  );
  fs.rmSync(canonical, { recursive: true });
}

export function sessionEnvironment(session, env) {
  assert(
    env.PATCHELF === undefined,
    "Existing PATCHELF configuration must not be replaced",
  );
  return { ...env, PATCHELF: session.adapter };
}

export function withPatchelfSession(session, env, build) {
  let status = 1;
  try {
    status = build(sessionEnvironment(session, env));
    return status;
  } finally {
    finishPatchelfSession(session, status);
  }
}

export function adapterMain(configuration, expectedHash, args) {
  try {
    validateHost();
    const directory = fs.realpathSync(path.dirname(configuration));
    assert.equal(
      path.dirname(directory),
      fs.realpathSync(os.tmpdir()),
      "Adapter configuration escapes owned temporary root",
    );
    assert(
      path.basename(directory).startsWith("kk-appimage-patchelf-") &&
        (fs.statSync(directory).mode & 0o777) === 0o700,
      "Invalid private adapter directory",
    );
    assert.equal(
      fs.statSync(directory).uid,
      process.getuid(),
      "Adapter directory owner mismatch",
    );
    const file = containedPath(directory, "policy.json");
    assert.equal(configuration, file, "Adapter configuration path changed");
    assert.equal(
      fs.statSync(file).mode & 0o777,
      0o600,
      "Adapter configuration must be private",
    );
    assert(
      fs.statSync(file).size <= 8 * 1024 * 1024,
      "Adapter configuration exceeds its bound",
    );
    const bytes = fs.readFileSync(file);
    assert.equal(digest(bytes), expectedHash, "Adapter configuration changed");
    const policy = JSON.parse(bytes);
    assert.equal(policy.schemaVersion, 1, "Unknown adapter schema");
    assert.deepEqual(
      policy.host,
      { platform: process.platform, arch: process.arch },
      "Adapter host changed",
    );
    assert.equal(
      policy.log,
      path.join(directory, "preserved.ndjson"),
      "Adapter log escapes owned directory",
    );
    checkIdentity(
      fileIdentity(path.join(policy.sourceRuntime, "runtime-manifest.json")),
      policy.manifest,
      "Original runtime manifest changed",
    );
    const result = runPatchelfOperation(policy, args);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) throw result.error;
    return result.status ?? 1;
  } catch (error) {
    console.error(`AppImage runtime protection failed: ${error.message}`);
    return 1;
  }
}

export function finishPatchelfSession(session, buildStatus) {
  const { policy, directory } = session;
  const report = {
    schemaVersion: 1,
    runId: policy.runId,
    scope:
      "Production AppImage packaging policy: preserve manifested Agent bytes; delegate application/GTK RPATH operations",
    before: policy.before,
    manifest: policy.manifest,
    realTool: policy.realTool,
    version: policy.version,
    host: policy.host,
    invocationSha256: policy.invocationSha256,
    buildStatus,
    passed: false,
  };
  try {
    report.after = sourceSnapshot(policy.root);
    matchSource(policy.before, report.after);
    assert.equal(buildStatus, 0, "Tauri AppImage build failed");
    const manifest = containedPath(
      policy.appDir,
      `usr/lib/${policy.productName}/agent-runtime/runtime-manifest.json`,
    );
    checkIdentity(
      fileIdentity(manifest),
      policy.manifest,
      "AppDir runtime manifest changed",
    );
    for (const resource of policy.resources)
      assert(
        verifiedRuntimeFile(
          policy,
          path.join(path.dirname(manifest), resource.path),
        ),
        "Missing protected AppDir resource",
      );
    report.files = policy.resources;
    assert(
      /^\d+\.\d+\.\d+$/.test(policy.version),
      "Invalid bound AppImage source version",
    );
    const packageArch = { x64: "amd64", arm64: "aarch64" }[policy.host.arch];
    assert(packageArch, "Unknown bound AppImage architecture");
    const packageName = `${policy.productName}_${policy.version}_${packageArch}.AppImage`;
    const packageFile = containedPath(path.dirname(policy.appDir), packageName);
    const packageIdentity = fileIdentity(packageFile);
    assert(packageIdentity.size > 0, "Final AppImage must be nonempty");
    report.package = {
      path: path.relative(policy.root, packageFile),
      ...packageIdentity,
    };
    report.passed = true;
  } catch (error) {
    report.failure = error.message;
    throw error;
  } finally {
    try {
      report.preserved = fs.existsSync(policy.log)
        ? fs
            .readFileSync(policy.log, "utf8")
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line))
        : [];
      const output = path.join(policy.root, ".tmp/appimage-runtime-patchelf");
      fs.mkdirSync(output, { recursive: true });
      fs.writeFileSync(
        path.join(output, `${policy.runId}.json`),
        JSON.stringify(report, null, 2) + "\n",
        { flag: "wx" },
      );
    } finally {
      removeOwnedSession({ directory });
    }
  }
  return report;
}
