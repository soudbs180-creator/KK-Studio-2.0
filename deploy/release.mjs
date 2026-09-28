#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  cp,
  copyFile,
  mkdir,
  readFile,
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
  deploy    (--dist <dist> | --archive <tar.gz>) --host <host> --user <user> --path <remote-root> --release <id> [--apply]

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
  const archiveHashPath = `${archivePath}.sha256`;
  const archiveSha256 = await sha256(archivePath);
  await writeFile(
    archiveHashPath,
    `${archiveSha256}  ${path.basename(archivePath)}\n`,
    "utf8",
  );
  await copyFile(
    files.manifestPath,
    path.join(out, `kk-studio-web-${release}.manifest.json`),
  );
  await copyFile(
    files.hashesPath,
    path.join(out, `kk-studio-web-${release}.manifest.sha256`),
  );
  return { ...files, archivePath, archiveHashPath, archiveSha256, manifest };
}

async function verifiedArchive(archiveArgument, release) {
  const archivePath = path.resolve(archiveArgument);
  const archiveName = `kk-studio-web-${release}.tar.gz`;
  if (path.basename(archivePath) !== archiveName) {
    fail(`archive name must be ${archiveName}`);
  }
  const archiveHashPath = `${archivePath}.sha256`;
  const hashLine = await readFile(archiveHashPath, "utf8").catch(() =>
    fail(`archive SHA-256 sidecar is missing: ${archiveHashPath}`),
  );
  const match = /^([a-f0-9]{64})  ([^\r\n]+)\r?\n?$/.exec(hashLine);
  if (!match || match[2] !== archiveName) {
    fail("archive SHA-256 sidecar has an invalid name or format");
  }
  if ((await sha256(archivePath)) !== match[1]) {
    fail("archive SHA-256 mismatch");
  }
  return {
    archivePath,
    archiveHashPath,
    archiveSha256: match[1],
    manifest: { release, files: null },
  };
}

function remoteCommand(root, release, archiveName, stage, expectedSha256) {
  const activateScript = path.posix.join(stage, `activate-${release}.sh`);
  const archive = path.posix.join(stage, archiveName);
  const sidecar = `${archive}.sha256`;
  return [
    "set -eu",
    `test -f ${quotePosix(activateScript)}`,
    `(cd ${quotePosix(stage)} && sha256sum -c ${quotePosix(`${archiveName}.sha256`)})`,
    `sh ${quotePosix(activateScript)} ${quotePosix(root)} ${quotePosix(release)} ${quotePosix(archive)} ${quotePosix(expectedSha256)}`,
    `if ! { rm -f -- ${quotePosix(archive)} ${quotePosix(sidecar)} ${quotePosix(activateScript)} && rmdir -- ${quotePosix(stage)}; }; then echo 'activated, but staging cleanup failed' >&2; fi`,
  ].join("\n");
}

function requireRemoteRoot(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value === "/" ||
    path.posix.normalize(value) !== value ||
    /[\u0000-\u001f]/.test(value)
  ) {
    fail("remote root must be a non-root absolute POSIX path without aliases");
  }
  return value;
}

function remotePrepareCommand(root, stage) {
  const incoming = path.posix.join(root, "incoming");
  const releases = path.posix.join(root, "releases");
  return [
    "set -eu",
    `test -d ${quotePosix(root)}`,
    `test ! -L ${quotePosix(root)}`,
    `test ! -L ${quotePosix(incoming)}`,
    `test ! -L ${quotePosix(releases)}`,
    `mkdir -p ${quotePosix(incoming)} ${quotePosix(releases)}`,
    `test -d ${quotePosix(incoming)} && test -d ${quotePosix(releases)}`,
    `mkdir -m 700 ${quotePosix(stage)}`,
  ].join("\n");
}

function formatCommand(executable, argv) {
  return [executable, ...argv].map(quotePosix).join(" ");
}

async function deploy(args) {
  const release = requireReleaseId(args.release);
  if (args.archive && args.dist) {
    fail("deploy accepts either --archive or --dist, not both");
  }
  const host = args.host;
  const user = args.user;
  if (!host || !user || !args.path) {
    fail("deploy requires --host, --user, and --path");
  }
  const remoteRoot = requireRemoteRoot(args.path);
  const invocationId = randomBytes(12).toString("hex");
  const packaged = args.archive
    ? await verifiedArchive(args.archive, release)
    : await packageRelease({
        ...args,
        out: path.join(
          path.resolve(args.out ?? DEFAULT_OUTPUT),
          `.deploy-${release}-${invocationId}`,
        ),
      });
  const archiveName = path.basename(packaged.archivePath);
  const remote = `${user}@${host}`;
  const stage = path.posix.join(
    remoteRoot,
    "incoming",
    `${release}-${invocationId}`,
  );
  const remoteIncoming = `${remote}:${stage}/`;
  const scriptPath = path.join(SCRIPT_DIR, "remote-activate.sh");
  const commands = [
    formatCommand("ssh", [remote, remotePrepareCommand(remoteRoot, stage)]),
    formatCommand("scp", [packaged.archivePath, remoteIncoming]),
    formatCommand("scp", [packaged.archiveHashPath, remoteIncoming]),
    formatCommand("scp", [
      scriptPath,
      `${remote}:${path.posix.join(stage, `activate-${release}.sh`)}`,
    ]),
    formatCommand("ssh", [
      remote,
      remoteCommand(
        remoteRoot,
        release,
        archiveName,
        stage,
        packaged.archiveSha256,
      ),
    ]),
  ];
  if (args.dryRun) {
    return { ...packaged, dryRun: true, commands };
  }
  const operations = [
    ["ssh", [remote, remotePrepareCommand(remoteRoot, stage)]],
    ["scp", [packaged.archivePath, remoteIncoming]],
    ["scp", [packaged.archiveHashPath, remoteIncoming]],
    [
      "scp",
      [
        scriptPath,
        `${remote}:${path.posix.join(stage, `activate-${release}.sh`)}`,
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
    [
      remote,
      remoteCommand(
        remoteRoot,
        release,
        archiveName,
        stage,
        packaged.archiveSha256,
      ),
    ],
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
        archiveHash: result.archiveHashPath,
        files: result.manifest.files?.length ?? null,
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

export { buildManifest, deploy, packageRelease, parseArgs, quotePosix };
