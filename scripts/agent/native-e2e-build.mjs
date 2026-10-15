import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fingerprintDesktopInputs } from "../windows/desktop-release-identity.mjs";

const root = process.cwd();
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trimEnd();
const dirt = git("status", "--porcelain").split("\n").filter(Boolean);
assert(
  dirt.every((line) =>
    /^src-tauri\/gen\/schemas\/[a-zA-Z-]+\.json$/.test(line.slice(3)),
  ),
  "Commit all source changes before building Native evidence",
);
const before = fingerprintDesktopInputs(root);
const sourceHead = git("rev-parse", "HEAD");
const runtimeManifest = path.join(
  root,
  "src-tauri/agent-runtime/runtime-manifest.json",
);
const runtimeManifestSha256 = createHash("sha256")
  .update(fs.readFileSync(runtimeManifest))
  .digest("hex");
const result = spawnSync(
  "cargo",
  [
    "build",
    "--release",
    "--features",
    "native-e2e",
    "--locked",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--target-dir",
    "src-tauri/target/native-e2e",
  ],
  { stdio: "inherit" },
);
assert.equal(result.status, 0, "Native evidence build failed");
assert.equal(
  fingerprintDesktopInputs(root),
  before,
  "Source inputs changed during build",
);
assert.equal(git("rev-parse", "HEAD"), sourceHead, "HEAD changed during build");
assert.equal(
  createHash("sha256").update(fs.readFileSync(runtimeManifest)).digest("hex"),
  runtimeManifestSha256,
  "Packaged Agent resources changed during Native evidence build",
);
const directory = path.join(root, "src-tauri/target/native-e2e/release");
const executable = path.join(
  directory,
  process.platform === "win32" ? "kk-studio.exe" : "kk-studio",
);
fs.writeFileSync(
  path.join(directory, "native-e2e.build-receipt.json"),
  JSON.stringify(
    {
      sourceHead,
      inputSha256: before,
      runtimeManifestSha256,
      executableSha256: createHash("sha256")
        .update(fs.readFileSync(executable))
        .digest("hex"),
      platform: process.platform,
      arch: process.arch,
      feature: "native-e2e",
      generatedDocuments: dirt,
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
