import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RELEASE_EXECUTABLE,
  RELEASE_INPUTS,
  fingerprintDesktopInputs,
  hashDesktopExecutable,
  readDesktopReleaseReceipt,
  writeDesktopReleaseReceipt,
} from "./desktop-release-identity.mjs";

function findNewestFile(candidatePath, current) {
  if (!fs.existsSync(candidatePath)) return current;
  const stats = fs.lstatSync(candidatePath);
  if (stats.isSymbolicLink()) return current;
  if (stats.isFile()) {
    return stats.mtimeMs > current.mtimeMs
      ? { path: candidatePath, mtimeMs: stats.mtimeMs }
      : current;
  }
  if (!stats.isDirectory()) return current;
  return fs
    .readdirSync(candidatePath)
    .reduce(
      (newest, entry) =>
        findNewestFile(path.join(candidatePath, entry), newest),
      current,
    );
}

export function inspectDesktopRelease(projectRoot) {
  const releaseExePath = path.join(projectRoot, RELEASE_EXECUTABLE);
  const releaseMtimeMs = fs.existsSync(releaseExePath)
    ? fs.statSync(releaseExePath).mtimeMs
    : null;
  const newestInput = RELEASE_INPUTS.reduce(
    (newest, relativePath) =>
      findNewestFile(path.join(projectRoot, relativePath), newest),
    { path: null, mtimeMs: Number.NEGATIVE_INFINITY },
  );
  const inputSha256 = fingerprintDesktopInputs(projectRoot);
  const executableSha256 = hashDesktopExecutable(projectRoot);
  const receipt = readDesktopReleaseReceipt(projectRoot);
  const configuredDesktopVersion = readJson(
    path.join(projectRoot, "config", "platform-versions.json"),
  )?.desktop;
  const reason =
    releaseMtimeMs === null
      ? "missing"
      : !receipt ||
          receipt.inputSha256 !== inputSha256 ||
          receipt.executableSha256 !== executableSha256 ||
          (configuredDesktopVersion &&
            receipt.desktopVersion !== configuredDesktopVersion)
        ? "unverified"
        : "current";

  return {
    releaseExePath,
    releaseMtimeMs,
    newestInputPath: newestInput.path,
    newestInputMtimeMs:
      newestInput.mtimeMs === Number.NEGATIVE_INFINITY
        ? null
        : newestInput.mtimeMs,
    inputSha256,
    executableSha256,
    desktopVersion: configuredDesktopVersion ?? null,
    receiptPath: path.join(
      projectRoot,
      "src-tauri",
      "target",
      "release",
      "kk-studio.build-receipt.json",
    ),
    needsBuild: reason !== "current",
    reason,
  };
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function isLinkedPath(filePath, projectRoot) {
  try {
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) return true;
    const absolute = path.resolve(
      fs.realpathSync.native(projectRoot),
      path.relative(path.resolve(projectRoot), path.resolve(filePath)),
    );
    const resolved = path.resolve(fs.realpathSync.native(filePath));
    return process.platform === "win32"
      ? resolved.toLowerCase() !== absolute.toLowerCase()
      : resolved !== absolute;
  } catch {
    return false;
  }
}

export function inspectDesktopDependencies(projectRoot) {
  const lockfile = readJson(path.join(projectRoot, "package-lock.json"));
  if (!lockfile?.packages) {
    return {
      needsInstall: true,
      mismatches: [
        {
          name: "package-lock.json",
          expected: "valid packages",
          actual: "missing or invalid",
        },
      ],
    };
  }

  const nodeModulesPath = path.join(projectRoot, "node_modules");
  if (isLinkedPath(nodeModulesPath, projectRoot)) {
    return {
      needsInstall: true,
      mismatches: [
        {
          name: "node_modules",
          expected: "local directory",
          actual: "linked directory",
        },
      ],
    };
  }

  const mismatches = Object.entries(lockfile.packages).flatMap(
    ([packagePath, lockEntry]) => {
      if (!packagePath.startsWith("node_modules/") || !lockEntry?.version) {
        return [];
      }
      const packageRoot = path.join(projectRoot, ...packagePath.split("/"));
      const name = packagePath.slice("node_modules/".length);
      const expected = lockEntry.version;
      if (!fs.existsSync(packageRoot) && lockEntry.optional) return [];
      if (isLinkedPath(packageRoot, projectRoot)) {
        return [{ name, expected, actual: "linked package" }];
      }
      const installed = readJson(path.join(packageRoot, "package.json"));
      const actual = installed?.version ?? null;
      if (actual === expected) return [];
      return [{ name, expected, actual }];
    },
  );
  return { needsInstall: mismatches.length > 0, mismatches };
}

export function ensureDesktopRelease(projectRoot, buildRelease) {
  const beforeRelease = inspectDesktopRelease(projectRoot);
  const dependencyState = inspectDesktopDependencies(projectRoot);
  const before = {
    ...beforeRelease,
    needsBuild: beforeRelease.needsBuild || dependencyState.needsInstall,
  };
  if (!before.needsBuild) return { ...before, rebuilt: false };

  buildRelease(projectRoot);
  const afterBuild = inspectDesktopRelease(projectRoot);
  const replaced =
    beforeRelease.releaseMtimeMs === null ||
    afterBuild.releaseMtimeMs > beforeRelease.releaseMtimeMs ||
    afterBuild.executableSha256 !== beforeRelease.executableSha256;
  if (
    afterBuild.releaseMtimeMs === null ||
    !replaced ||
    inspectDesktopDependencies(projectRoot).needsInstall
  ) {
    throw new Error(
      "Desktop release build did not produce a replaced executable with aligned dependencies.",
    );
  }
  writeDesktopReleaseReceipt(projectRoot);
  const after = inspectDesktopRelease(projectRoot);
  if (after.needsBuild) {
    throw new Error(
      "Desktop release build did not produce a current executable.",
    );
  }
  return { ...after, rebuilt: true };
}

export function runDesktopRelease(
  projectRoot,
  { buildRelease, launchRelease },
) {
  const release = ensureDesktopRelease(projectRoot, buildRelease);
  launchRelease(release.releaseExePath);
  return release;
}

function resolveNpmCliPath(projectRoot) {
  const candidates = [
    process.env.npm_execpath,
    path.join(projectRoot, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ].filter(Boolean);
  const npmCliPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!npmCliPath) {
    throw new Error("npm CLI was not found beside the active Node.js runtime.");
  }
  return npmCliPath;
}

function installDesktopDependencies(projectRoot) {
  const nodeModulesPath = path.join(projectRoot, "node_modules");
  if (isLinkedPath(nodeModulesPath)) {
    throw new Error(
      "Desktop dependency repair requires a local node_modules directory; linked dependencies must be repaired in their owner checkout.",
    );
  }
  const result = spawnSync(
    process.execPath,
    [
      resolveNpmCliPath(projectRoot),
      "ci",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: projectRoot, stdio: "inherit", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Desktop dependency repair failed with exit code ${result.status}.`,
    );
  }
  const after = inspectDesktopDependencies(projectRoot);
  if (after.needsInstall) {
    throw new Error(
      "Desktop dependency repair completed but node_modules is still out of sync with package-lock.json.",
    );
  }
}

function buildDesktopRelease(projectRoot) {
  const dependencies = inspectDesktopDependencies(projectRoot);
  if (dependencies.needsInstall) {
    console.log(
      `[KK Studio] Repairing desktop dependencies from package-lock.json: ${dependencies.mismatches
        .map(
          ({ name, expected, actual }) =>
            `${name} ${actual ?? "missing"} -> ${expected}`,
        )
        .join(", ")}`,
    );
    installDesktopDependencies(projectRoot);
  }
  const result = spawnSync(
    process.execPath,
    [
      resolveNpmCliPath(projectRoot),
      "run",
      "client:build:agent",
      "--",
      "--no-bundle",
    ],
    { cwd: projectRoot, stdio: "inherit", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Desktop release build failed with exit code ${result.status}.`,
    );
  }
}

function launchDesktopRelease(executablePath, projectRoot) {
  const child = spawn(executablePath, [], {
    cwd: projectRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

function isMainModule() {
  return (
    path.resolve(fileURLToPath(import.meta.url)) ===
    path.resolve(process.argv[1] ?? "")
  );
}

if (isMainModule()) {
  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
  try {
    const initial = inspectDesktopRelease(projectRoot);
    if (initial.reason === "missing") {
      console.log("[KK Studio] Desktop release is missing; building...");
    } else if (initial.reason === "unverified") {
      console.log(
        "[KK Studio] Desktop release identity is unverified; rebuilding before launch...",
      );
    }
    const result = runDesktopRelease(projectRoot, {
      buildRelease: buildDesktopRelease,
      launchRelease: (executablePath) =>
        launchDesktopRelease(executablePath, projectRoot),
    });
    console.log(
      `[KK Studio] Launched ${result.rebuilt ? "rebuilt" : "current"} desktop release.`,
    );
  } catch (error) {
    console.error(
      `[KK Studio] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
