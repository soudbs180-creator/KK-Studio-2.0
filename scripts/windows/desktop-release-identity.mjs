import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const RELEASE_EXECUTABLE = path.join(
  "src-tauri",
  "target",
  "release",
  "kk-studio.exe",
);

export const RELEASE_RECEIPT = path.join(
  "src-tauri",
  "target",
  "release",
  "kk-studio.build-receipt.json",
);

export const RELEASE_INPUTS = [
  "src",
  path.join("packages", "creation-contracts"),
  "public",
  "dist",
  "index.html",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "vite.config.ts",
  path.join("config", "platform-versions.json"),
  path.join("vendor", "canvas-agent", "src"),
  path.join("vendor", "canvas-agent", "agent-instructions.md"),
  path.join("vendor", "canvas-agent", "package.json"),
  path.join("vendor", "canvas-agent", "package-lock.json"),
  path.join("vendor", "canvas-agent", "tsconfig.json"),
  path.join("scripts", "agent"),
  path.join("scripts", "gemini-bridge.mjs"),
  path.join("src-tauri", "src"),
  path.join("src-tauri", "build.rs"),
  path.join("src-tauri", "capabilities"),
  path.join("src-tauri", "icons"),
  path.join("src-tauri", "Cargo.toml"),
  path.join("src-tauri", "Cargo.lock"),
  path.join("src-tauri", "tauri.conf.json"),
  path.join("src-tauri", "tauri.agent.conf.json"),
];

const RECEIPT_SCHEMA_VERSION = 1;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function configuredDesktopVersion(projectRoot) {
  try {
    const config = JSON.parse(
      fs.readFileSync(
        path.join(projectRoot, "config", "platform-versions.json"),
        "utf8",
      ),
    );
    return typeof config.desktop === "string" ? config.desktop : null;
  } catch {
    return null;
  }
}

function normalizedPath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function appendInputEntries(projectRoot, relativePath, entries) {
  const absolutePath = path.join(projectRoot, relativePath);
  let stats;
  try {
    stats = fs.lstatSync(absolutePath);
  } catch {
    entries.push(`missing\0${normalizedPath(relativePath)}`);
    return;
  }

  const normalized = normalizedPath(relativePath);
  if (stats.isSymbolicLink()) {
    throw new Error(
      `Desktop release input cannot be verified through a symbolic link: ${normalized}`,
    );
  }
  if (stats.isFile()) {
    if (path.basename(relativePath) === "package.json") {
      const manifest = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
      const runtimeManifest = {
        type: manifest.type,
        main: manifest.main,
        module: manifest.module,
        exports: manifest.exports,
        bin: manifest.bin,
        files: manifest.files,
        engines: manifest.engines,
        dependencies: manifest.dependencies,
        devDependencies: manifest.devDependencies,
        optionalDependencies: manifest.optionalDependencies,
        peerDependencies: manifest.peerDependencies,
        bundledDependencies: manifest.bundledDependencies,
      };
      entries.push(
        `manifest\0${normalized}\0${sha256(JSON.stringify(runtimeManifest))}`,
      );
      return;
    }
    entries.push(
      `file\0${normalized}\0${sha256(fs.readFileSync(absolutePath))}`,
    );
    return;
  }
  if (!stats.isDirectory()) {
    entries.push(`other\0${normalized}\0${stats.mode}`);
    return;
  }

  entries.push(`directory\0${normalized}`);
  for (const entry of fs.readdirSync(absolutePath).sort()) {
    if (
      normalized === "packages/creation-contracts" &&
      !entry.endsWith(".ts") &&
      ![
        "package.json",
        "package-lock.json",
        "plugin-manifest.schema.json",
        "tsconfig.json",
      ].includes(entry)
    ) {
      continue;
    }
    appendInputEntries(projectRoot, path.join(relativePath, entry), entries);
  }
}

export function fingerprintDesktopInputs(projectRoot) {
  const entries = [];
  for (const relativePath of RELEASE_INPUTS) {
    appendInputEntries(projectRoot, relativePath, entries);
  }
  return sha256(entries.join("\n"));
}

export function hashDesktopExecutable(projectRoot) {
  const executablePath = path.join(projectRoot, RELEASE_EXECUTABLE);
  try {
    return sha256(fs.readFileSync(executablePath));
  } catch {
    return null;
  }
}

export function readDesktopReleaseReceipt(projectRoot) {
  const receiptPath = path.join(projectRoot, RELEASE_RECEIPT);
  try {
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    if (
      receipt?.schemaVersion !== RECEIPT_SCHEMA_VERSION ||
      !SHA256_PATTERN.test(receipt.inputSha256 ?? "") ||
      !SHA256_PATTERN.test(receipt.executableSha256 ?? "") ||
      (receipt.desktopVersion !== undefined &&
        !SEMVER_PATTERN.test(receipt.desktopVersion)) ||
      receipt.executableRelativePath !== normalizedPath(RELEASE_EXECUTABLE)
    ) {
      return null;
    }
    return receipt;
  } catch {
    return null;
  }
}

export function writeDesktopReleaseReceipt(projectRoot) {
  const executableSha256 = hashDesktopExecutable(projectRoot);
  if (!executableSha256) {
    throw new Error(
      "Cannot record desktop release identity without an executable.",
    );
  }
  const receiptPath = path.join(projectRoot, RELEASE_RECEIPT);
  const desktopVersion = configuredDesktopVersion(projectRoot);
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        schemaVersion: RECEIPT_SCHEMA_VERSION,
        executableRelativePath: normalizedPath(RELEASE_EXECUTABLE),
        ...(desktopVersion ? { desktopVersion } : {}),
        inputSha256: fingerprintDesktopInputs(projectRoot),
        executableSha256,
      },
      null,
      2,
    )}\n`,
  );
  return receiptPath;
}
