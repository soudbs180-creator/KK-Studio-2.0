import fs from "node:fs";
import path from "node:path";

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

function targetsInLine(line) {
  const targets = [];
  const withoutInlineCode = line.replace(/`[^`]*`/g, "");
  const inlineLink =
    /!?\[[^\]\n]*\]\((?:<([^>\n]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g;
  for (const match of withoutInlineCode.matchAll(inlineLink))
    targets.push(match[1] ?? match[2]);
  const definition = withoutInlineCode.match(
    /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/,
  );
  if (definition) targets.push(definition[1] ?? definition[2]);
  return targets;
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
    let fence = null;
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (marker) {
        const symbol = marker[1][0];
        if (!fence) fence = { symbol, length: marker[1].length };
        else if (fence.symbol === symbol && marker[1].length >= fence.length)
          fence = null;
        continue;
      }
      if (fence) continue;
      for (const target of targetsInLine(line)) {
        if (
          !target ||
          target.startsWith("#") ||
          target.startsWith("/") ||
          /^[a-z][a-z\d+.-]*:/i.test(target)
        )
          continue;
        let decoded;
        try {
          decoded = decodeURIComponent(target.split(/[?#]/, 1)[0]).replaceAll(
            "\\ ",
            " ",
          );
        } catch {
          issues.push(`${file}:${index + 1}: invalid link ${target}`);
          continue;
        }
        const destination = path.resolve(path.dirname(full), decoded);
        if (
          !destination.startsWith(`${resolvedRoot}${path.sep}`) &&
          destination !== resolvedRoot
        ) {
          issues.push(`${file}:${index + 1}: link leaves repository ${target}`);
        } else if (!fs.existsSync(destination)) {
          issues.push(`${file}:${index + 1}: missing link ${target}`);
        }
      }
    }
  }
  return issues;
}
