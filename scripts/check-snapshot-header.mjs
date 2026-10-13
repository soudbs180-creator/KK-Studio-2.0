import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTAINER_SNAPSHOT_DOCUMENTS,
  checkSnapshotHeader,
  checkDocumentLifecycleHeader,
  checkCurrentDocumentUniqueness,
  SNAPSHOT_DOCUMENTS,
  TEMPORAL_DOCUMENTS,
} from "./governance/doc-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const issues = [];
const args = process.argv.slice(2);
let containerRoot = process.env.KK_CONTAINER_ROOT;
const containerRequested = containerRoot !== undefined || args.length > 0;
if (args.length > 0) {
  if (args[0] !== "--container-root" || args.length > 2)
    issues.push("不支持的参数；用法：--container-root <非空路径>");
  else if (!args[1]?.trim() || args[1].startsWith("--"))
    issues.push("--container-root 必须提供非空路径");
  else containerRoot = args[1];
}
if (containerRoot !== undefined && !containerRoot.trim())
  issues.push("KK_CONTAINER_ROOT 必须提供非空路径");
const explicitContainerRoot = containerRoot?.trim()
  ? path.resolve(containerRoot)
  : null;
const lifecycleTargets = new Set(
  TEMPORAL_DOCUMENTS.flatMap(({ relativePath, documentId }) => [
    relativePath,
    documentId,
  ]),
);

const snapshotRoots = [
  ...SNAPSHOT_DOCUMENTS.map((relativePath) => ({
    relativePath,
    fullPath: path.join(root, relativePath),
  })),
  ...(explicitContainerRoot
    ? CONTAINER_SNAPSHOT_DOCUMENTS.map((relativePath) => ({
        relativePath: `container:${relativePath}`,
        fullPath: path.join(explicitContainerRoot, relativePath),
      }))
    : []),
];

for (const { relativePath, fullPath } of snapshotRoots) {
  if (!fs.existsSync(fullPath)) {
    issues.push(`${relativePath}: 快照文档不存在`);
    continue;
  }
  issues.push(
    ...checkSnapshotHeader(fs.readFileSync(fullPath, "utf8"), relativePath),
  );
}

const temporalSources = [];
for (const {
  relativePath,
  documentId,
  source: expectedSource,
} of TEMPORAL_DOCUMENTS) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    issues.push(`${relativePath}: 生命周期文档不存在`);
    continue;
  }
  const source = fs.readFileSync(fullPath, "utf8");
  issues.push(
    ...checkDocumentLifecycleHeader(source, relativePath, {
      documentId,
      source: expectedSource,
      expectedStatus: "current",
      knownSupersededTargets: lifecycleTargets,
    }),
  );
  temporalSources.push({ filePath: relativePath, source });
}

// Scan every governance entry point, not just the three canonical files. This
// catches a copied current document before it can silently shadow the registry;
// dated change packages are intentionally outside this current-routing scope.
const governanceDirectory = path.join(root, "docs/governance");
if (fs.existsSync(governanceDirectory)) {
  for (const fileName of fs.readdirSync(governanceDirectory)) {
    if (!fileName.endsWith(".md")) continue;
    const relativePath = `docs/governance/${fileName}`;
    if (temporalSources.some((entry) => entry.filePath === relativePath))
      continue;
    const fullPath = path.join(governanceDirectory, fileName);
    temporalSources.push({
      filePath: relativePath,
      source: fs.readFileSync(fullPath, "utf8"),
    });
  }
}
issues.push(...checkCurrentDocumentUniqueness(temporalSources));

issues.forEach((issue) => console.error(issue));
console.log(
  explicitContainerRoot
    ? `Snapshot scope: repository + explicit container (${explicitContainerRoot}).`
    : containerRequested
      ? "Snapshot scope: repository; container requested with invalid selection (NOT VERIFIED)."
      : "Snapshot scope: repository; container not requested (external documents NOT VERIFIED).",
);
console.log(
  `Snapshot/lifecycle headers: ${
    new Set([
      ...snapshotRoots.map(({ relativePath }) => relativePath),
      ...TEMPORAL_DOCUMENTS.map(({ relativePath }) => relativePath),
    ]).size
  } unique documents, ${issues.length} violations.`,
);
process.exitCode = issues.length ? 1 : 0;
