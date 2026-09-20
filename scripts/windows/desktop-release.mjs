import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RELEASE_EXECUTABLE = path.join(
  "src-tauri",
  "target",
  "release",
  "kk-studio.exe",
);

const RELEASE_INPUTS = [
  "src",
  "public",
  "index.html",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "vite.config.ts",
  path.join("src-tauri", "src"),
  path.join("src-tauri", "Cargo.toml"),
  path.join("src-tauri", "Cargo.lock"),
  path.join("src-tauri", "tauri.conf.json"),
];

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
  const reason =
    releaseMtimeMs === null
      ? "missing"
      : newestInput.mtimeMs > releaseMtimeMs
        ? "stale"
        : "current";

  return {
    releaseExePath,
    releaseMtimeMs,
    newestInputPath: newestInput.path,
    newestInputMtimeMs:
      newestInput.mtimeMs === Number.NEGATIVE_INFINITY
        ? null
        : newestInput.mtimeMs,
    needsBuild: reason !== "current",
    reason,
  };
}

export function ensureDesktopRelease(projectRoot, buildRelease) {
  const before = inspectDesktopRelease(projectRoot);
  if (!before.needsBuild) return { ...before, rebuilt: false };

  buildRelease(projectRoot);
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

function resolveNpmCliPath() {
  const candidates = [
    process.env.npm_execpath,
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

function buildDesktopRelease(projectRoot) {
  const result = spawnSync(
    process.execPath,
    [resolveNpmCliPath(), "run", "tauri", "build", "--", "--no-bundle"],
    { cwd: projectRoot, stdio: "inherit" },
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
    if (initial.reason === "stale") {
      console.log(
        `[KK Studio] Desktop release is older than ${initial.newestInputPath}; rebuilding...`,
      );
    } else if (initial.reason === "missing") {
      console.log("[KK Studio] Desktop release is missing; building...");
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
