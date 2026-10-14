import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as wait } from "node:timers/promises";
import { prepareProductionAgent } from "./production-install.mjs";

const execFileAsync = promisify(execFile);

const ownDirectory = path.dirname(fileURLToPath(import.meta.url));
const excluded =
  /^(node_modules|\.git|\.env(?:\..*)?|auth\.json|logs|sessions|coverage|\.cache)$/;

export async function packageAgentRuntime({
  agent,
  target,
  node,
  nodeLicense = path.join(path.dirname(node), "LICENSE"),
}) {
  if (await fs.stat(target).catch(() => null))
    throw Error("Runtime destination exists");
  const files = [];
  async function copyFile(source, relative) {
    const destination = path.resolve(target, relative);
    if (!destination.startsWith(path.resolve(target) + path.sep))
      throw Error("Invalid runtime path");
    const data = await fs.readFile(source);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, data, {
      mode: (await fs.stat(source)).mode,
    });
    files.push({
      path: relative.replaceAll("\\", "/"),
      size: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
    });
  }
  async function copyTree(source, relative) {
    for (const item of await fs.readdir(source, { withFileTypes: true })) {
      if (excluded.test(item.name)) continue;
      if (item.isSymbolicLink())
        throw Error("Unexpected link in runtime package");
      if (item.isDirectory())
        await copyTree(
          path.join(source, item.name),
          path.join(relative, item.name),
        );
      else if (item.isFile())
        await copyFile(
          path.join(source, item.name),
          path.join(relative, item.name),
        );
    }
  }
  // Preserve npm's physical tree: flattening it can change which version Node
  // resolves when a transitive dependency shadows an ancestor package.
  const dependencyRoot = await fs.realpath(path.join(agent, "node_modules"));
  const installed = new Set();
  async function dependencies(source) {
    const pkg = JSON.parse(
      await fs.readFile(path.join(source, "package.json"), "utf8"),
    );
    const resolver = createRequire(path.join(source, "package.json"));
    const optional = pkg.optionalDependencies || {};
    for (const name of Object.keys({ ...pkg.dependencies, ...optional })) {
      // Accidental development workspace link; no Agent runtime imports it.
      if (name === "kk-studio") continue;
      if (!/^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name))
        throw Error("Invalid dependency name");
      let location;
      for (const search of resolver.resolve.paths(`${name}/package.json`) ||
        []) {
        const candidate = path.join(search, name);
        if (
          await fs.stat(path.join(candidate, "package.json")).catch(() => null)
        ) {
          location = await fs.realpath(candidate);
          break;
        }
      }
      if (!location) {
        if (
          pkg.name === "@openai/codex" &&
          name === "@openai/codex-" + process.platform + "-" + process.arch
        )
          throw Error(
            "Missing Codex runtime dependency: " +
              name +
              ". Repair the isolated Agent production installation before packaging.",
          );
        if (Object.hasOwn(optional, name)) continue;
        throw Error(`Missing production dependency: ${name}`);
      }
      if (!location.startsWith(dependencyRoot + path.sep))
        throw Error(
          `Dependency is outside the isolated npm installation: ${name}`,
        );
      if (installed.has(location)) continue;
      installed.add(location);
      const destination = path.join(
        "agent/node_modules",
        path.relative(dependencyRoot, location),
      );
      await copyTree(location, destination);
      await dependencies(location);
    }
  }
  await copyFile(node, process.platform === "win32" ? "node.exe" : "node");
  await copyFile(nodeLicense, "NODE-LICENSE.txt");
  await copyFile(
    path.join(ownDirectory, "desktop-entry.mjs"),
    "desktop-entry.mjs",
  );
  await copyFile(
    path.join(ownDirectory, "../gemini-bridge.mjs"),
    "gemini-bridge.mjs",
  );
  await copyTree(path.join(agent, "dist"), "agent/dist");
  await copyFile(
    path.join(agent, "agent-instructions.md"),
    "agent/agent-instructions.md",
  );
  await copyFile(
    path.join(ownDirectory, "INFINITE-CANVAS-LICENSE"),
    "agent/LICENSE",
  );
  const metadata = JSON.parse(
    await fs.readFile(path.join(agent, "package.json"), "utf8"),
  );
  delete metadata.dependencies?.["kk-studio"];
  delete metadata.devDependencies;
  delete metadata.scripts;
  const metadataPath = path.join(target, "agent/package.json");
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
  const data = await fs.readFile(metadataPath);
  files.push({
    path: "agent/package.json",
    size: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
  await dependencies(agent);
  if (
    metadata.dependencies?.["@openai/codex"] ||
    metadata.optionalDependencies?.["@openai/codex"]
  ) {
    const codexPackage = createRequire(metadataPath).resolve(
      "@openai/codex/package.json",
    );
    const codexVersion = JSON.parse(
      await fs.readFile(codexPackage, "utf8"),
    ).version;
    const entry = path.join(path.dirname(codexPackage), "bin", "codex.js");
    const packagedNode = path.join(
      target,
      process.platform === "win32" ? "node.exe" : "node",
    );
    try {
      for (const args of [
        ["--version"],
        ["login", "--help"],
        ["app-server", "--help"],
      ]) {
        const { stdout } = await execFileAsync(packagedNode, [entry, ...args], {
          timeout: 15000,
          maxBuffer: 64 * 1024,
          windowsHide: true,
        });
        const valid =
          args[0] === "--version"
            ? stdout.trim() === "codex-cli " + codexVersion
            : stdout.includes("Usage: codex " + args[0]) &&
              (args[0] !== "app-server" || stdout.includes("--stdio"));
        if (!valid) throw Error("Unexpected Codex version/help response");
      }
    } catch (cause) {
      throw new Error(
        "Packaged Codex version/help verification failed. Repair the Agent production installation before shipping.",
        { cause },
      );
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  const manifest = {
    schemaVersion: 1,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    agentVersion: metadata.version,
    files,
  };
  await fs.writeFile(
    path.join(target, "runtime-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return manifest;
}

async function publicationEntry(target) {
  try {
    return await fs.lstat(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
async function publicationDirectory(target) {
  const entry = await publicationEntry(target);
  if (!entry?.isDirectory() || entry.isSymbolicLink())
    throw Error(
      `Runtime publication directory is missing or a link: ${target}`,
    );
  if (path.relative(target, await fs.realpath(target)))
    throw Error(`Runtime publication path must not contain a link: ${target}`);
  return entry;
}
async function renamePublication(source, target, parents, rename, expected) {
  let failure;
  for (const delay of [0, 150, 300, 600, 900]) {
    if (delay) await wait(delay);
    for (const directory of parents) await publicationDirectory(directory);
    const current = await publicationDirectory(source);
    if (current.dev !== expected.dev || current.ino !== expected.ino)
      throw Error(`Runtime publication source identity changed: ${source}`);
    if (await publicationEntry(target))
      throw Error(`Runtime publication destination exists: ${target}`);
    try {
      // Windows directory rename refuses an existing destination atomically.
      await rename(source, target);
      return;
    } catch (error) {
      if (!["EPERM", "EBUSY"].includes(error.code)) throw error;
      failure = error;
    }
  }
  throw failure;
}

/**
 * Publish only this invocation's candidate; failed candidates remain recoverable.
 * @param {{root: string, staging: string, rename?: (source: string, target: string) => Promise<void>}} options
 */
export async function publishAgentRuntime({
  root,
  staging,
  rename = fs.rename,
}) {
  if (process.platform !== "win32")
    throw Error("Safe runtime publication requires Windows directory rename.");
  if (!path.isAbsolute(root) || !path.isAbsolute(staging))
    throw Error("Runtime publication paths must be absolute.");
  root = path.resolve(root);
  staging = path.resolve(staging);
  const temporary = path.join(root, ".tmp"),
    native = path.join(root, "src-tauri"),
    runtime = path.join(native, "agent-runtime"),
    parents = [root, temporary, native];
  for (const directory of parents) await publicationDirectory(directory);
  if (
    path.dirname(staging) !== temporary ||
    !/^agent-runtime-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
      path.basename(staging),
    )
  )
    throw Error("Runtime publication requires an owned staging directory.");
  const candidate = await publicationDirectory(staging);
  const previous = await publicationEntry(runtime);
  let backup;
  if (previous) {
    await publicationDirectory(runtime);
    backup = path.join(temporary, `agent-runtime-previous-${randomUUID()}`);
    await renamePublication(runtime, backup, parents, rename, previous);
  }
  try {
    await renamePublication(staging, runtime, parents, rename, candidate);
  } catch (cause) {
    let restored = false;
    try {
      if (backup && !(await publicationEntry(runtime))) {
        await renamePublication(backup, runtime, parents, rename, previous);
        restored = true;
      }
    } catch (rollback) {
      throw new AggregateError(
        [cause, rollback],
        `Runtime publication rollback failed; staging preserved at ${staging}; previous runtime preserved at ${backup}.`,
        { cause: rollback },
      );
    }
    if (restored) {
      throw new Error(
        `Runtime publication failed; previous runtime restored; staging preserved at ${staging}.`,
        { cause },
      );
    }
    throw new Error(
      `Runtime publication failed: ${cause.message}; staging preserved at ${staging}; backup preserved at ${backup ?? "none"}.`,
      { cause },
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(ownDirectory, "../..");
  const staging = path.join(root, ".tmp", `agent-runtime-${randomUUID()}`);
  const agent = await prepareProductionAgent({
    agent: path.join(root, "vendor/canvas-agent"),
    temporaryRoot: path.join(root, ".tmp"),
  });
  const manifest = await packageAgentRuntime({
    agent,
    target: staging,
    node: process.execPath,
  });
  if (process.platform === "win32") {
    await publishAgentRuntime({ root, staging });
  } else {
    const runtime = path.join(root, "src-tauri/agent-runtime");
    if (await fs.lstat(runtime).catch(() => null)) {
      if ((await fs.lstat(runtime)).isSymbolicLink())
        throw Error("Runtime destination must not be a link");
      await fs.rename(
        runtime,
        path.join(root, ".tmp", `agent-runtime-previous-${randomUUID()}`),
      );
    }
    await fs.rename(staging, runtime);
  }
  console.log(
    `Agent runtime packaged: ${manifest.files.length} files, ${manifest.platform}/${manifest.arch}.`,
  );
}
