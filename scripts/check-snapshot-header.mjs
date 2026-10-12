import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTAINER_SNAPSHOT_DOCUMENTS,
  checkSnapshotHeader,
  SNAPSHOT_DOCUMENTS,
} from "./governance/doc-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const issues = [];

const snapshotRoots = [
  ...SNAPSHOT_DOCUMENTS.map((relativePath) => ({
    relativePath,
    fullPath: path.join(root, relativePath),
  })),
  ...CONTAINER_SNAPSHOT_DOCUMENTS.map((relativePath) => ({
    relativePath: `../${relativePath}`,
    fullPath: path.join(
      process.env.KK_CONTAINER_ROOT ?? path.resolve(root, ".."),
      relativePath.replace(/^\.\.\//, ""),
    ),
  })),
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

issues.forEach((issue) => console.error(issue));
console.log(
  `Snapshot headers: ${snapshotRoots.length} documents, ${issues.length} violations.`,
);
process.exitCode = issues.length ? 1 : 0;
