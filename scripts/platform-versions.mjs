import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const platforms = ["desktop", "web", "mobile"];
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const root = fileURLToPath(new URL("..", import.meta.url));

function readText(projectRoot, relativePath) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function versionInRustFile(source, fileKind) {
  const pattern =
    fileKind === "manifest"
      ? /(^\[package\]\r?\nname = "kk-studio"\r?\nversion = ")([^"]+)(")/m
      : /(^\[\[package\]\]\r?\nname = "kk-studio"\r?\nversion = ")([^"]+)(")/m;
  const match = source.match(pattern);
  if (!match)
    throw new Error(`Cannot locate kk-studio version in Cargo ${fileKind}`);
  return { pattern, version: match[2] };
}

function inputs(projectRoot) {
  const paths = {
    versions: "config/platform-versions.json",
    package: "package.json",
    lock: "package-lock.json",
    cargo: "src-tauri/Cargo.toml",
    cargoLock: "src-tauri/Cargo.lock",
    tauri: "src-tauri/tauri.conf.json",
  };
  const texts = Object.fromEntries(
    Object.entries(paths).map(([key, path]) => [
      key,
      readText(projectRoot, path),
    ]),
  );
  return {
    paths,
    texts,
    versions: JSON.parse(texts.versions),
    package: JSON.parse(texts.package),
    lock: JSON.parse(texts.lock),
    tauri: JSON.parse(texts.tauri),
    cargo: versionInRustFile(texts.cargo, "manifest"),
    cargoLock: versionInRustFile(texts.cargoLock, "lock"),
  };
}

function errorsFor(data) {
  const errors = [];
  if (data.versions.schemaVersion !== 1)
    errors.push("config/platform-versions.json: unsupported schemaVersion");
  for (const platform of platforms) {
    if (!versionPattern.test(data.versions[platform] ?? "")) {
      errors.push(`config/platform-versions.json: invalid ${platform} version`);
    }
  }
  const expectedWeb = data.versions.web;
  const expectedDesktop = data.versions.desktop;
  for (const [file, actual, expected] of [
    ["package.json", data.package.version, expectedWeb],
    ["package-lock.json", data.lock.version, expectedWeb],
    [
      "package-lock.json root package",
      data.lock.packages?.[""]?.version,
      expectedWeb,
    ],
    ["src-tauri/Cargo.toml", data.cargo.version, expectedDesktop],
    ["src-tauri/Cargo.lock", data.cargoLock.version, expectedDesktop],
    ["src-tauri/tauri.conf.json", data.tauri.version, expectedDesktop],
  ]) {
    if (actual !== expected)
      errors.push(`${file}: ${actual ?? "missing"} differs from ${expected}`);
  }
  return errors;
}

export function checkVersions(projectRoot = root) {
  return errorsFor(inputs(projectRoot));
}

export function nextVersion(version, kind = "patch") {
  const match = version.match(versionPattern);
  if (!match) throw new Error(`Invalid version: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (![major, minor, patch].every(Number.isSafeInteger))
    throw new Error(`Invalid version: ${version}`);
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (kind === "major") return `${major + 1}.0.0`;
  throw new Error(`Invalid version kind: ${kind}`);
}

export function bumpVersions(projectRoot, selectedPlatforms, kind = "patch") {
  if (
    !Array.isArray(selectedPlatforms) ||
    selectedPlatforms.length === 0 ||
    selectedPlatforms.some((platform) => !platforms.includes(platform)) ||
    new Set(selectedPlatforms).size !== selectedPlatforms.length
  ) {
    throw new Error(
      "Invalid platform selection: choose unique desktop, web, or mobile values",
    );
  }
  if (!["patch", "minor", "major"].includes(kind))
    throw new Error(`Invalid version kind: ${kind}`);
  const data = inputs(projectRoot);
  const errors = errorsFor(data);
  if (errors.length > 0)
    throw new Error(`Inconsistent platform versions:\n${errors.join("\n")}`);
  const updates = new Map();
  for (const platform of selectedPlatforms)
    data.versions[platform] = nextVersion(data.versions[platform], kind);
  updates.set(
    data.paths.versions,
    JSON.stringify(data.versions, null, 2) + "\n",
  );
  if (selectedPlatforms.includes("web")) {
    data.package.version = data.versions.web;
    data.lock.version = data.versions.web;
    data.lock.packages[""].version = data.versions.web;
    updates.set(
      data.paths.package,
      JSON.stringify(data.package, null, 2) + "\n",
    );
    updates.set(data.paths.lock, JSON.stringify(data.lock, null, 2) + "\n");
  }
  if (selectedPlatforms.includes("desktop")) {
    data.tauri.version = data.versions.desktop;
    updates.set(data.paths.tauri, JSON.stringify(data.tauri, null, 2) + "\n");
    updates.set(
      data.paths.cargo,
      data.texts.cargo.replace(
        data.cargo.pattern,
        (_, start, _old, end) => `${start}${data.versions.desktop}${end}`,
      ),
    );
    updates.set(
      data.paths.cargoLock,
      data.texts.cargoLock.replace(
        data.cargoLock.pattern,
        (_, start, _old, end) => `${start}${data.versions.desktop}${end}`,
      ),
    );
  }
  for (const [path, content] of updates)
    writeFileSync(join(projectRoot, path), content);
  return Object.fromEntries(
    platforms.map((platform) => [platform, data.versions[platform]]),
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (command === "check" && args.length === 0) {
      const errors = checkVersions();
      if (errors.length) throw new Error(errors.join("\n"));
      process.stdout.write("Platform versions are consistent.\n");
    } else if (command === "bump") {
      let selected;
      let kind = "patch";
      for (let index = 0; index < args.length; index += 2) {
        const option = args[index];
        const value = args[index + 1];
        if (!value) throw new Error(`Missing value for ${option}`);
        if (option === "--platform") selected = value.split(",");
        else if (option === "--kind") kind = value;
        else throw new Error(`Unknown option: ${option}`);
      }
      process.stdout.write(
        JSON.stringify(bumpVersions(root, selected, kind)) + "\n",
      );
    } else {
      throw new Error(
        "Usage: node scripts/platform-versions.mjs check | bump --platform desktop,web,mobile [--kind patch|minor|major]",
      );
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
