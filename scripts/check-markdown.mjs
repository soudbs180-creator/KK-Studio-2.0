import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  checkMarkdownLinks,
  collectActiveMarkdownFiles,
} from "./governance/markdown-links.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = collectActiveMarkdownFiles(root);
const issues = checkMarkdownLinks(root, files);
for (const issue of issues) console.error(issue);
console.log(
  `Markdown links: ${files.length} active files, ${issues.length} violations. File targets only; not historical snapshots or external URLs.`,
);
process.exitCode = issues.length ? 1 : 0;
