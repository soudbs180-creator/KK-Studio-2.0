import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADR_DIRECTORY,
  INDEXED_DIRECTORIES,
  checkAdrNumbering,
  checkIndexCoverage,
  checkRetiredAdrDirectories,
} from "./governance/doc-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const issues = [];

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
}

const adrDir = path.join(root, ADR_DIRECTORY);
const adrFiles = fs.existsSync(adrDir)
  ? fs
      .readdirSync(adrDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
  : [];
issues.push(...checkAdrNumbering(adrFiles));

const docsDir = path.join(root, "docs");
const docsEntries = fs.existsSync(docsDir)
  ? fs
      .readdirSync(docsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];
issues.push(...checkRetiredAdrDirectories(docsEntries));

issues.forEach((issue) => console.error(issue));
console.log(
  `Index: ${adrFiles.length} ADR files, ${issues.length} violations. Covers docs/README.md coverage, ADR number uniqueness and single ADR directory.`,
);
process.exitCode = issues.length ? 1 : 0;
