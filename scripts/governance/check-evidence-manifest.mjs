import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

function relativePath(file, prefix) {
  return (
    typeof file === "string" &&
    file.startsWith(prefix) &&
    !/[\\:\p{Cc}]/u.test(file) &&
    file.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

function verifyCopy(entry, root) {
  const target = fs.realpathSync(path.join(root, entry.containerRelativePath));
  if (!target.startsWith(root + path.sep))
    throw new Error(`Evidence copy escapes container: ${entry.sourcePath}`);
  const data = fs.readFileSync(target);
  if (
    data.length !== entry.bytes ||
    createHash("sha256").update(data).digest("hex") !== entry.sha256
  )
    throw new Error(`Evidence copy mismatch: ${entry.sourcePath}`);
}

export function verifyEvidenceManifest(manifest, container) {
  if (
    manifest?.version !== 1 ||
    !Array.isArray(manifest.entries) ||
    !manifest.entries.length
  )
    throw new Error("Invalid evidence manifest");
  const sources = new Set();
  const destinations = new Set();
  const root = container && fs.realpathSync(container);
  let bytes = 0;
  for (const entry of manifest.entries) {
    if (
      !relativePath(entry?.sourcePath, "docs/") ||
      !relativePath(entry.containerRelativePath, "output/") ||
      !/^[a-f0-9]{40}$/.test(entry.sourceCommit) ||
      !/^[a-f0-9]{40}$/.test(entry.sourceGitBlob) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      typeof entry.description !== "string" ||
      !entry.description.trim() ||
      sources.has(entry.sourcePath) ||
      destinations.has(entry.containerRelativePath)
    )
      throw new Error(
        `Invalid or duplicate evidence entry: ${entry?.sourcePath}`,
      );
    sources.add(entry.sourcePath);
    destinations.add(entry.containerRelativePath);
    bytes += entry.bytes;
    if (root) verifyCopy(entry, root);
  }
  return { files: sources.size, bytes, copiesVerified: Boolean(root) };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const [, , file, container] = process.argv;
    if (!file)
      throw new Error(
        "Usage: check-evidence-manifest.mjs <manifest> [container]",
      );
    console.log(
      JSON.stringify(
        verifyEvidenceManifest(
          JSON.parse(fs.readFileSync(file, "utf8")),
          container,
        ),
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
