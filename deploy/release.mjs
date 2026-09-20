#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  cp,
  copyFile,
  mkdir,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIST = path.resolve(SCRIPT_DIR, "..", "dist");
const DEFAULT_OUTPUT = path.resolve(SCRIPT_DIR, "..", ".tmp", "deploy");
const RELEASE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SENSITIVE_PATTERN =
  /(^|[\\/])(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx)|id_rsa(?:\..*)?|credentials(?:\..*)?|secrets?(?:\..*)?)$/i;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const args = { command: argv[0] ?? "help", dryRun: true };
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--apply") {
      args.dryRun = false;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (!token.startsWith("--")) fail(`Unexpected argument: ${token}`);
    const [key, inlineValue] = token.slice(2).split("=", 2);
    const value = inlineValue ?? argv[++index];
    if (!value) fail(`Missing value for --${key}`);
    args[key] = value;
  }
  return args;
}

function usage() {
  return `KK Studio static web release helper

Commands:
  manifest  --dist <dist> --out <directory> --release <id>
  package   --dist <dist> --out <directory> --release <id>
  deploy    --dist <dist> --host <host> --user <user> --path <remote-root> --release <id> [--apply]

The default is dry-run. Only deploy --apply uses ssh/scp. This package contains
the browser static prototype only; it never starts a provider or generation gateway.
`;
}

function requireReleaseId(value) {
  if (!value || !RELEASE_ID_PATTERN.test(value)) {
    fail("release must match [A-Za-z0-9][A-Za-z0-9._-]{0,63}");
  }
  return value;
}

function quotePosix(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

async function listFiles(root, relative = "") {
  const directory = path.join(root, relative);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const next = path.join(relative, entry.name);
    if (SENSITIVE_PATTERN.test(next)) {
      fail(`Refusing to package sensitive-looking file: ${next}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, next)));
    } else if (entry.isFile()) {
      if (/\s/.test(next))
        fail(`Refusing whitespace in packaged path: ${next}`);
      files.push(next.split(path.sep).join("/"));
    } else {
      fail(`Refusing unsupported filesystem entry: ${next}`);
    }
  }
  return files;
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function buildManifest(dist, release) {
  const info = await stat(dist).catch(() => null);
  if (!info?.isDirectory()) fail(`dist directory does not exist: ${dist}`);
  const files = await listFiles(dist);
  if (!files.includes("index.html")) fail("dist must contain index.html");
  const records = [];
  for (const relativePath of files) {
    const absolutePath = path.join(dist, relativePath);
    records.push({
      path: relativePath,
      bytes: (await stat(absolutePath)).size,
      sha256: await sha256(absolutePath),
    });
  }
  return {
    schemaVersion: 1,
    kind: "kk-studio-web-static-prototype",
    release,
    files: records,
  };
}

async function writeManifestFiles(dist, outDirectory, release, manifest) {
  const releaseDirectory = path.join(outDirectory, release);
  await rm(releaseDirectory, { recursive: true, force: true });
  await mkdir(releaseDirectory, { recursive: true });
  await cp(dist, releaseDirectory, { recursive: true, force: false });
  const manifestPath = path.join(releaseDirectory, "manifest.json");
  const hashesPath = path.join(releaseDirectory, "manifest.sha256");
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    hashesPath,
    `${manifest.files.map((file) => `${file.sha256}  ${file.path}`).join("\n")}\n`,
    "utf8",
  );
  return { releaseDirectory, manifestPath, hashesPath };
}

function tarArchive(releaseDirectory, outputPath) {
  const tar = process.platform === "win32" ? "tar.exe" : "tar";
  const result = spawnSync(
    tar,
    ["-czf", outputPath, "-C", releaseDirectory, "."],
    { encoding: "utf8", stdio: "pipe" },
  );
  if (result.error) fail(`tar was not available: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`tar failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
}

async function packageRelease(args) {
  const dist = path.resolve(args.dist ?? DEFAULT_DIST);
  const out = path.resolve(args.out ?? DEFAULT_OUTPUT);
  const release = requireReleaseId(args.release ?? "local-dry-run");
  const manifest = await buildManifest(dist, release);
  const files = await writeManifestFiles(dist, out, release, manifest);
  const archivePath = path.join(out, `kk-studio-web-${release}.tar.gz`);
  tarArchive(files.releaseDirectory, archivePath);
  await copyFile(
    files.manifestPath,
    path.join(out, `kk-studio-web-${release}.manifest.json`),
  );
  await copyFile(
    files.hashesPath,
    path.join(out, `kk-studio-web-${release}.manifest.sha256`),
  );
  return { ...files, archivePath, manifest };
}

function remoteCommand(root, release, archiveName) {
  const activateScript = path.posix.join(
    root,
    "incoming",
    `activate-${release}.sh`,
  );
  return [
    "set -eu",
    `test -f ${quotePosix(activateScript)}`,
    `sh ${quotePosix(activateScript)} ${quotePosix(root)} ${quotePosix(release)} ${quotePosix(path.posix.join(root, "incoming", archiveName))}`,
  ].join("\n");
}

function formatCommand(executable, argv) {
  return [executable, ...argv].map(quotePosix).join(" ");
}

async function deploy(args) {
  const release = requireReleaseId(args.release);
  const host = args.host;
  const user = args.user;
  const root = args.path;
  if (!host || !user || !root) {
    fail("deploy requires --host, --user, and --path");
  }
  const packaged = await packageRelease(args);
  const archiveName = path.basename(packaged.archivePath);
  const remote = `${user}@${host}`;
  const remoteRoot = root.replaceAll("\\", "/").replace(/\/$/, "");
  const remoteIncomingPath = path.posix.join(remoteRoot, "incoming");
  const remoteIncoming = `${remote}:${remoteIncomingPath}/`;
  const scriptPath = path.join(SCRIPT_DIR, "remote-activate.sh");
  const commands = [
    formatCommand("ssh", [
      remote,
      `mkdir -p ${quotePosix(path.posix.join(remoteRoot, "incoming"))} ${quotePosix(path.posix.join(remoteRoot, "releases"))}`,
    ]),
    formatCommand("scp", [packaged.archivePath, remoteIncoming]),
    formatCommand("scp", [
      scriptPath,
      `${remote}:${path.posix.join(remoteRoot, "incoming", `activate-${release}.sh`)}`,
    ]),
    formatCommand("ssh", [
      remote,
      remoteCommand(remoteRoot, release, archiveName),
    ]),
  ];
  if (args.dryRun) {
    return { ...packaged, dryRun: true, commands };
  }
  const operations = [
    [
      "ssh",
      [
        remote,
        `mkdir -p ${quotePosix(path.posix.join(remoteRoot, "incoming"))} ${quotePosix(path.posix.join(remoteRoot, "releases"))}`,
      ],
    ],
    ["scp", [packaged.archivePath, `${remote}:${remoteIncomingPath}/`]],
    [
      "scp",
      [
        scriptPath,
        `${remote}:${path.posix.join(remoteRoot, "incoming", `activate-${release}.sh`)}`,
      ],
    ],
  ];
  for (const [executable, argv] of operations) {
    const result = spawnSync(executable, argv, {
      stdio: "inherit",
      shell: false,
    });
    if (result.status !== 0)
      fail(`${executable} failed with exit code ${result.status}`);
  }
  const result = spawnSync(
    "ssh",
    [remote, remoteCommand(remoteRoot, release, archiveName)],
    {
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.status !== 0)
    fail(`remote activation failed with exit code ${result.status}`);
  return { ...packaged, dryRun: false, commands };
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.command === "help" || args.command === "--help") {
    console.log(usage());
    return;
  }
  if (args.command === "manifest") {
    const manifest = await buildManifest(
      path.resolve(args.dist ?? DEFAULT_DIST),
      requireReleaseId(args.release ?? "local-dry-run"),
    );
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  const result =
    args.command === "package"
      ? await packageRelease(args)
      : args.command === "deploy"
        ? await deploy(args)
        : fail(`Unknown command: ${args.command}`);
  console.log(
    JSON.stringify(
      {
        release: result.manifest.release,
        archive: result.archivePath,
        files: result.manifest.files.length,
        dryRun: result.dryRun ?? false,
        commands: result.commands,
      },
      null,
      2,
    ),
  );
}

if (
  path.resolve(fileURLToPath(import.meta.url)) ===
  path.resolve(process.argv[1] ?? "")
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export { buildManifest, packageRelease, parseArgs, quotePosix };
