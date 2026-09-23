import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

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

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(ownDirectory, "../..");
  const staging = path.join(root, ".tmp", `agent-runtime-${randomUUID()}`);
  const manifest = await packageAgentRuntime({
    agent: path.join(root, "vendor/canvas-agent"),
    target: staging,
    node: process.execPath,
  });
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
  console.log(
    `Agent runtime packaged: ${manifest.files.length} files, ${manifest.platform}/${manifest.arch}.`,
  );
}
