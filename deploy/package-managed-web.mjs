#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SECRET =
  /(^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx)|id_rsa(?:\..*)?|credentials(?:\..*)?|secrets?(?:\..*)?)$/i;

async function digest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function copyStatic(source, target, relative = "") {
  const info = await lstat(source);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error("dist must be an ordinary directory");
  await mkdir(target);
  for (const entry of (await readdir(source)).sort()) {
    const name = relative ? `${relative}/${entry}` : entry;
    if (/[\\\u0000-\u001f\u007f]/.test(name) || SECRET.test(name))
      throw new Error(`Unsafe static path: ${name}`);
    const from = path.join(source, entry);
    const to = path.join(target, entry);
    const child = await lstat(from);
    if (child.isDirectory() && !child.isSymbolicLink())
      await copyStatic(from, to, name);
    else if (child.isFile() && child.nlink === 1) await copyFile(from, to);
    else throw new Error(`Unsupported static entry: ${name}`);
  }
}

async function records(directory, relative = "dist") {
  const result = [];
  for (const entry of (await readdir(directory)).sort()) {
    const file = path.join(directory, entry);
    const info = await lstat(file);
    const name = `${relative}/${entry}`;
    if (info.isDirectory()) result.push(...(await records(file, name)));
    else
      result.push({ path: name, bytes: info.size, sha256: await digest(file) });
  }
  return result;
}

export async function packageManagedWeb({
  dist,
  out,
  releaseId,
  sourceCommit,
  webVersion,
}) {
  if (
    !ID.test(releaseId ?? "") ||
    !/^[a-f0-9]{40}$/.test(sourceCommit ?? "") ||
    !/^\d+\.\d+\.\d+$/.test(webVersion ?? "")
  )
    throw new Error("Invalid release identity");
  if (!dist || !out) throw new Error("dist and out are required");
  const stage = await mkdtemp(path.join(tmpdir(), "kk-managed-package-"));
  try {
    await copyStatic(path.resolve(dist), path.join(stage, "dist"));
    const identity = {
      schemaVersion: 1,
      kind: "kk-studio-managed-web",
      releaseId,
      sourceCommit,
      webVersion,
    };
    await writeFile(
      path.join(stage, "dist", "build-info.json"),
      `${JSON.stringify(identity)}\n`,
    );
    const files = await records(path.join(stage, "dist"));
    if (!files.some((file) => file.path === "dist/index.html"))
      throw new Error("dist must contain index.html");
    const manifest = { ...identity, files };
    await writeFile(
      path.join(stage, "manifest.json"),
      `${JSON.stringify(manifest)}\n`,
    );
    const archive = path.resolve(out);
    await mkdir(path.dirname(archive), { recursive: true });
    const tar = spawnSync(
      process.platform === "win32" ? "tar.exe" : "tar",
      ["-czf", archive, "-C", stage, "manifest.json", "dist"],
      { encoding: "utf8" },
    );
    if (tar.error || tar.status !== 0)
      throw new Error(`tar failed: ${tar.error?.message ?? tar.stderr}`);
    return { archive, sha256: await digest(archive), manifest };
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const options = {};
  try {
    for (let index = 2; index < process.argv.length; index += 2) {
      const key = {
        "--dist": "dist",
        "--out": "out",
        "--release-id": "releaseId",
        "--source-commit": "sourceCommit",
        "--web-version": "webVersion",
      }[process.argv[index]];
      if (!key || !process.argv[index + 1] || options[key])
        throw new Error(
          "Expected --dist --out --release-id --source-commit --web-version",
        );
      options[key] = process.argv[index + 1];
    }
    const result = await packageManagedWeb(options);
    console.log(
      JSON.stringify({ archive: result.archive, sha256: result.sha256 }),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
