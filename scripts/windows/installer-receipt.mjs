import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inspectDesktopRelease } from "./desktop-release.mjs";

export async function fileIdentity(filename) {
  const bytes = await fs.readFile(filename);
  return {
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function checkIdentity(filename, expected) {
  const actual = await fileIdentity(filename);
  if (actual.size !== expected.size || actual.sha256 !== expected.sha256) {
    throw new Error(`File verification failed: ${path.basename(filename)}`);
  }
}

function containedFile(root, relative) {
  if (
    typeof relative !== "string" ||
    !relative ||
    relative.includes("\\") ||
    relative
      .split("/")
      .some((part) => !part || part === "." || part === "..") ||
    relative.includes(":") ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Invalid receipt file path");
  }
  return path.join(root, relative);
}

async function checkRegularFile(root, relative) {
  const filename = containedFile(root, relative);
  let current = root;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    if ((await fs.lstat(current)).isSymbolicLink()) {
      throw new Error("Receipt files must not be symbolic links");
    }
  }
  if (!(await fs.stat(filename)).isFile()) {
    throw new Error("Receipt entry is not a regular file");
  }
  return filename;
}

export async function verifyInstaller(receipt, releaseDirectory) {
  const filename = await checkRegularFile(
    releaseDirectory,
    receipt.installer.path,
  );
  await checkIdentity(filename, receipt.installer);
  return filename;
}

export async function verifyInstalledFiles(receipt, installDirectory) {
  for (const file of receipt.installedFiles) {
    await checkIdentity(
      await checkRegularFile(installDirectory, file.path),
      file,
    );
  }
  return receipt.installedFiles.length;
}

export async function assertInstallerFresh(installer, inputs) {
  const installerTime = (await fs.stat(installer)).mtimeMs;
  for (const input of inputs) {
    if ((await fs.stat(input)).mtimeMs > installerTime) {
      throw new Error(`Installer is older than input: ${path.basename(input)}`);
    }
  }
}

export async function writeInstallerReceipt({ root, installer, output }) {
  if (process.platform !== "win32" || process.arch !== "x64") {
    throw new Error("Installer receipts require Windows x64");
  }
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  if (git("status", "--porcelain", "--untracked-files=normal")) {
    throw new Error(
      "Commit source changes before creating an installer receipt",
    );
  }
  const versions = JSON.parse(
    await fs.readFile(path.join(root, "config/platform-versions.json"), "utf8"),
  );
  if (inspectDesktopRelease(root).needsBuild) {
    throw new Error(
      "Desktop executable is missing or older than source inputs",
    );
  }
  const exe = path.join(root, "src-tauri/target/release/kk-studio.exe");
  const runtimeRoot = path.join(root, "src-tauri/agent-runtime");
  const runtimeManifestPath = path.join(runtimeRoot, "runtime-manifest.json");
  const runtimeManifest = JSON.parse(
    await fs.readFile(runtimeManifestPath, "utf8"),
  );
  if (runtimeManifest.platform !== "win32" || runtimeManifest.arch !== "x64") {
    throw new Error("Agent runtime does not match the installer platform");
  }
  await verifyInstalledFiles(
    { installedFiles: runtimeManifest.files },
    runtimeRoot,
  );
  await assertInstallerFresh(installer, [
    exe,
    path.join(root, "src-tauri/tauri.installer.conf.json"),
    runtimeManifestPath,
    ...runtimeManifest.files.map((file) =>
      containedFile(runtimeRoot, file.path),
    ),
  ]);
  const installedFiles = [
    { path: "kk-studio.exe", ...(await fileIdentity(exe)) },
    {
      path: "agent-runtime/runtime-manifest.json",
      ...(await fileIdentity(runtimeManifestPath)),
    },
    ...runtimeManifest.files.map((file) => ({
      ...file,
      path: `agent-runtime/${file.path}`,
    })),
  ];
  const installerName = path.basename(installer);
  const receipt = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    commit: git("rev-parse", "HEAD"),
    sourceTree: git("rev-parse", "HEAD^{tree}"),
    versions,
    platform: "windows-x64",
    installer: { path: installerName, ...(await fileIdentity(installer)) },
    installerConfig: await fileIdentity(
      path.join(root, "src-tauri/tauri.installer.conf.json"),
    ),
    installedFiles,
    signing: "NOT VERIFIED; inspect Authenticode before formal distribution",
    acceptance: "Receipt is file identity only; see installer runtime evidence",
  };
  await fs.mkdir(output, { recursive: false });
  await fs.copyFile(installer, path.join(output, installerName));
  await fs.writeFile(
    path.join(output, "installer-receipt.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  await fs.writeFile(
    path.join(output, "SHA256SUMS.txt"),
    `${receipt.installer.sha256}  ${installerName}\n`,
  );
  await verifyInstaller(receipt, output);
  return receipt;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [installer, output] = process.argv.slice(2);
  if (!installer || !output) {
    throw new Error(
      "Usage: installer-receipt.mjs <installer.exe> <new-output-dir>",
    );
  }
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const receipt = await writeInstallerReceipt({
    root,
    installer: path.resolve(installer),
    output: path.resolve(output),
  });
  console.log(
    `Installer receipt: ${receipt.commit.slice(0, 7)}, ${receipt.installedFiles.length} installed files`,
  );
}
