import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADR_DIRECTORY,
  INDEXED_DIRECTORIES,
  checkAdrNumbering,
  checkIndexCoverage,
  checkRetiredAdrDirectories,
  checkSnapshotHeader,
  SNAPSHOT_DOCUMENTS,
} from "./governance/doc-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const issues = [];
const docsDir = path.join(root, "docs");

const indexPath = path.join(root, "docs/README.md");
if (!fs.existsSync(indexPath)) issues.push("docs/README.md: 缺失文档索引入口");
else {
  const indexSource = fs.readFileSync(indexPath, "utf8");
  const inventory = INDEXED_DIRECTORIES.map((directory) => {
    const full = path.join(root, directory);
    return {
      directory,
      files: fs.existsSync(full)
        ? fs
            .readdirSync(full, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
            .map((entry) => entry.name)
        : [],
    };
  });
  issues.push(...checkIndexCoverage(indexSource, inventory));

  const topLevelFiles = fs
    .readdirSync(docsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .filter((file) => file !== "README.md");
  issues.push(
    ...checkIndexCoverage(indexSource, [
      { directory: "docs", files: topLevelFiles },
    ]),
  );
}

const adrDir = path.join(root, ADR_DIRECTORY);
const adrFiles = fs.existsSync(adrDir)
  ? fs
      .readdirSync(adrDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
  : [];
issues.push(...checkAdrNumbering(adrFiles));

const docsEntries = fs.existsSync(docsDir)
  ? fs
      .readdirSync(docsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];
issues.push(...checkRetiredAdrDirectories(docsEntries));

for (const snapshotPath of SNAPSHOT_DOCUMENTS) {
  const fullPath = path.join(root, snapshotPath);
  if (!fs.existsSync(fullPath)) {
    issues.push(`${snapshotPath}: 快照文档不存在`);
    continue;
  }
  issues.push(
    ...checkSnapshotHeader(fs.readFileSync(fullPath, "utf8"), snapshotPath),
  );
}

issues.forEach((issue) => console.error(issue));
console.log(
  `Index: ${adrFiles.length} ADR files, ${issues.length} violations. Covers docs/README.md coverage, ADR number uniqueness and single ADR directory.`,
);
process.exitCode = issues.length ? 1 : 0;
