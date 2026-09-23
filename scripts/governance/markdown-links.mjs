import fs from "node:fs";
import path from "node:path";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const rootFiles = [
  "AGENTS.md",
  "AI_RULES.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "GEMINI.md",
  "README.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/copilot-instructions.md",
  ".cursor/rules/project.mdc",
];

const activeDirectories = [
  "docs",
  "docs/architecture",
  "docs/architecture/adr",
  "docs/engineering",
  "docs/features",
  "docs/governance",
  "docs/templates",
];

export function collectActiveMarkdownFiles(root) {
  const files = [...rootFiles];
  for (const directory of activeDirectories) {
    const full = path.join(root, directory);
    if (!fs.existsSync(full)) continue;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md"))
        files.push(`${directory}/${entry.name}`);
    }
  }
  return files.sort();
}

const markdown = unified().use(remarkParse).use(remarkGfm);

function targetsInSource(source) {
  const targets = [];
  function visit(node) {
    if (["link", "image", "definition"].includes(node.type)) {
      targets.push({ target: node.url, line: node.position.start.line });
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(markdown.parse(source));
  return targets.sort((a, b) => a.line - b.line);
}

export function checkMarkdownLinks(root, files) {
  const issues = [];
  const resolvedRoot = path.resolve(root);
  for (const file of files) {
    const full = path.resolve(resolvedRoot, file);
    if (!fs.existsSync(full)) {
      issues.push(`${file}: missing Markdown file`);
      continue;
    }
    const source = fs.readFileSync(full, "utf8");
    for (const { target, line } of targetsInSource(source)) {
      if (
        !target ||
        target.startsWith("#") ||
        target.startsWith("/") ||
        /^[a-z][a-z\d+.-]*:/i.test(target)
      )
        continue;
      let decoded;
      try {
        decoded = decodeURIComponent(target.split(/[?#]/, 1)[0]);
      } catch {
        issues.push(`${file}:${line}: invalid link ${target}`);
        continue;
      }
      const destination = path.resolve(path.dirname(full), decoded);
      if (
        !destination.startsWith(`${resolvedRoot}${path.sep}`) &&
        destination !== resolvedRoot
      ) {
        issues.push(`${file}:${line}: link leaves repository ${target}`);
      } else if (!fs.existsSync(destination)) {
        issues.push(`${file}:${line}: missing link ${target}`);
      }
    }
  }
  return issues;
}
