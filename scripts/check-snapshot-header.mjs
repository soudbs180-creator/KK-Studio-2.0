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
const containerRoot = process.env.KK_CONTAINER_ROOT;
if (containerRoot !== undefined && !containerRoot.trim()) {
  console.error("KK_CONTAINER_ROOT must not be blank.");
  process.exit(1);
}
const issues = [];
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
  // External documents are outside Git; audit them only with an explicit root.
  ...(containerRoot === undefined ? [] : CONTAINER_SNAPSHOT_DOCUMENTS).map(
    (relativePath) => ({
      relativePath: `../${relativePath}`,
      fullPath: path.join(containerRoot, relativePath),
    }),
  ),
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
  `Snapshot/lifecycle headers: ${
    new Set([
      ...snapshotRoots.map(({ relativePath }) => relativePath),
      ...TEMPORAL_DOCUMENTS.map(({ relativePath }) => relativePath),
    ]).size
  } unique documents, ${issues.length} violations. Container snapshots: ${
    containerRoot === undefined
      ? "not configured"
      : CONTAINER_SNAPSHOT_DOCUMENTS.length
  }.`,
);
process.exitCode = issues.length ? 1 : 0;
