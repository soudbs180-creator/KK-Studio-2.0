import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkVersions } from "./platform-versions.mjs";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const appVersionPattern = /(?<![\w])\d+\.\d+\.\d+(?![\w])/g;
const sourceRoots = ["src", "src-tauri/src", "scripts/windows"];
const sourceExclusions =
  /(^|\/)(?:tests?|[^/]*_tests\.rs|docs|vendor|node_modules|dist|target)(\/|$)/i;

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function packageLockVersion(root, relativePath) {
  const lock = readJson(root, relativePath);
  const rootPackage = lock?.packages?.[""];
  return {
    name: rootPackage?.name,
    version: rootPackage?.version,
  };
}

function findPackageLocks(root) {
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (
        [
          "node_modules",
          ".git",
          ".worktrees",
          ".tmp",
          "dist",
          "target",
          "build",
        ].includes(entry.name)
      )
        continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name === "package-lock.json") {
        result.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
    }
  };
  visit(root);
  return result.sort();
}

function trackedFiles(root) {
  try {
    return execFileSync("git", ["-C", root, "ls-files", "-z"], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\0")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function sourceFiles(root) {
  const tracked = trackedFiles(root);
  if (tracked.length > 0) return tracked;
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (
        ["node_modules", ".git", "dist", "target", ".tmp"].includes(entry.name)
      )
        continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) result.push(path.relative(root, absolute));
    }
  };
  for (const sourceRoot of sourceRoots) {
    const absolute = path.join(root, sourceRoot);
    if (fs.existsSync(absolute)) visit(absolute);
  }
  return result;
}

function scanHardcodedAppVersions(root, versions) {
  const appMajorMinor = new Set(
    Object.values(versions)
      .filter((version) => typeof version === "string")
      .map((version) => version.split(".").slice(0, 2).join(".")),
  );
  const findings = [];
  for (const relativePath of sourceFiles(root)) {
    const normalized = relativePath.split(path.sep).join("/");
    if (!sourceRoots.some((prefix) => normalized.startsWith(`${prefix}/`)))
      continue;
    if (sourceExclusions.test(normalized)) continue;
    let source;
    try {
      source = fs.readFileSync(path.join(root, relativePath), "utf8");
    } catch {
      continue;
    }
    for (const match of source.matchAll(appVersionPattern)) {
      const value = match[0];
      if (!appMajorMinor.has(value.split(".").slice(0, 2).join("."))) continue;
      const line = source.slice(0, match.index).split("\n").length;
      findings.push({ path: normalized, line, value });
    }
  }
  return findings;
}

/**
 * CHANGELOG 顶部已发布版本落后于平台版本时给出漂移警告。
 * 存量欠账（2.1.0 vs 2.1.13）清理前只警告不阻断；清零后可升为 errors。
 */
function checkChangelogDrift(root, versions) {
  const findings = [];
  const changelogPath = path.join(root, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) return findings;
  let source;
  try {
    source = fs.readFileSync(changelogPath, "utf8");
  } catch {
    return findings;
  }
  const heading = source
    .split("\n")
    .map((line) => line.match(/^##\s+(\d+\.\d+\.\d+)\b/))
    .find(Boolean);
  const appVersion = versions?.desktop;
  if (!heading || typeof appVersion !== "string") return findings;
  const changelogVersion = heading[1];
  if (changelogVersion !== appVersion) {
    findings.push({ path: "CHANGELOG.md", changelogVersion, appVersion });
  }
  return findings;
}

function checkNestedPackageLocks(root, errors) {
  for (const lockPath of findPackageLocks(root)) {
    if (lockPath === "package-lock.json") continue;
    const packagePath = path.join(path.dirname(lockPath), "package.json");
    if (!fs.existsSync(path.join(root, packagePath))) continue;
    try {
      const packageJson = readJson(root, packagePath);
      const lockRoot = packageLockVersion(root, lockPath);
      if (lockRoot.name !== undefined && lockRoot.name !== packageJson.name) {
        errors.push(
          `${packagePath}: package name ${packageJson.name ?? "missing"} differs from ${lockPath} root ${lockRoot.name}`,
        );
      }
      if (lockRoot.version !== packageJson.version) {
        errors.push(
          `${packagePath}: version ${packageJson.version ?? "missing"} differs from ${lockPath} root ${lockRoot.version ?? "missing"}`,
        );
      }
    } catch (error) {
      errors.push(
        `${lockPath}: cannot parse package contract (${error.message})`,
      );
    }
  }
}

function checkRootDependencyLocks(root, errors) {
  const packageJson = readJson(root, "package.json");
  const lock = readJson(root, "package-lock.json");
  const declared = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  for (const name of [
    "@tauri-apps/api",
    "@tauri-apps/plugin-dialog",
    "@tauri-apps/cli",
  ]) {
    if (!declared[name]) continue;
    const entry = lock?.packages?.[`node_modules/${name}`];
    if (!entry?.version) {
      errors.push(`package-lock.json: missing locked ${name}`);
    }
  }
}

function checkRuntimeGuards(root, errors) {
  const contracts = [
    [
      "scripts/windows/desktop-release-identity.mjs",
      /fingerprintDesktopInputs[\s\S]*RELEASE_RECEIPT/,
      "content fingerprint and receipt",
    ],
    [
      "scripts/windows/desktop-release.mjs",
      /inspectDesktopRelease[\s\S]*needsInstall[\s\S]*buildRelease/,
      "dependency and release identity gate",
    ],
    [
      "scripts/windows/installer-receipt.mjs",
      /inspectDesktopRelease[\s\S]*checkIdentity/,
      "installer identity gate",
    ],
    [
      "src/runtime/appInfo.ts",
      /platform-versions\.json/,
      "runtime version source",
    ],
  ];
  for (const [relativePath, pattern, label] of contracts) {
    const filename = path.join(root, relativePath);
    if (!fs.existsSync(filename)) {
      errors.push(`${relativePath}: missing required ${label}`);
      continue;
    }
    const source = fs.readFileSync(filename, "utf8");
    if (!pattern.test(source)) errors.push(`${relativePath}: missing ${label}`);
  }
}

export function inspectVersionConsistency(
  root = repositoryRoot,
  { checkRuntime = true, scanSource = true } = {},
) {
  const errors = [];
  let versions = {};
  try {
    errors.push(...checkVersions(root));
    versions = readJson(root, "config/platform-versions.json");
  } catch (error) {
    errors.push(`platform version inputs: ${error.message}`);
  }
  try {
    checkRootDependencyLocks(root, errors);
  } catch (error) {
    errors.push(`root dependency contract: ${error.message}`);
  }
  checkNestedPackageLocks(root, errors);
  if (checkRuntime) checkRuntimeGuards(root, errors);
  const hardcodedVersions = scanSource
    ? scanHardcodedAppVersions(root, versions)
    : [];
  const changelogDrift = checkChangelogDrift(root, versions);
  return { errors, hardcodedVersions, changelogDrift };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const report = inspectVersionConsistency();
  for (const error of report.errors) process.stderr.write(`ERROR ${error}\n`);
  for (const finding of report.hardcodedVersions) {
    process.stderr.write(
      `WARN ${finding.path}:${finding.line} contains application version ${finding.value}; import the platform version source instead.\n`,
    );
  }
  for (const finding of report.changelogDrift) {
    process.stderr.write(
      `WARN ${finding.path}: top released version ${finding.changelogVersion} is behind platform version ${finding.appVersion}; record pending changes under Unreleased and cut a release entry.\n`,
    );
  }
  if (report.errors.length > 0) process.exitCode = 1;
  else {
    process.stdout.write(
      `Version consistency passed (${report.hardcodedVersions.length} hardcoded-version warning(s), ${report.changelogDrift.length} changelog drift warning(s)).\n`,
    );
  }
}
