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

function maskFences(lines) {
  let fence = null;
  return lines
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (!fence) {
        if (marker) {
          fence = { symbol: marker[1][0], length: marker[1].length };
          return "";
        }
        return line;
      }
      if (
        marker &&
        marker[1][0] === fence.symbol &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = null;
      return "";
    })
    .join("\n");
}

function maskCodeSpans(source) {
  const chars = source.split("");
  for (let start = 0; start < source.length;) {
    if (source[start] !== "`") {
      start++;
      continue;
    }
    let afterOpen = start;
    while (source[afterOpen] === "`") afterOpen++;
    let cursor = afterOpen;
    let afterClose = -1;
    while (cursor < source.length) {
      if (source[cursor] !== "`") {
        cursor++;
        continue;
      }
      let end = cursor;
      while (source[end] === "`") end++;
      if (end - cursor === afterOpen - start) {
        afterClose = end;
        break;
      }
      cursor = end;
    }
    if (afterClose < 0) {
      start = afterOpen;
      continue;
    }
    for (let index = start; index < afterClose; index++)
      if (chars[index] !== "\n") chars[index] = " ";
    start = afterClose;
  }
  return chars.join("");
}

function parseInlineTarget(source, start) {
  let cursor = start + 1;
  let brackets = 1;
  while (cursor < source.length && brackets) {
    if (source[cursor] === "\\") cursor += 2;
    else {
      if (source[cursor] === "[") brackets++;
      if (source[cursor] === "]") brackets--;
      cursor++;
    }
  }
  if (brackets || source[cursor] !== "(") return null;
  cursor++;
  while (/\s/.test(source[cursor] ?? "") && cursor < source.length) cursor++;

  let target;
  if (source[cursor] === "<") {
    const targetStart = ++cursor;
    while (cursor < source.length && source[cursor] !== ">") {
      if (source[cursor] === "\\") cursor++;
      cursor++;
    }
    if (cursor >= source.length) return null;
    target = source.slice(targetStart, cursor++);
  } else {
    const targetStart = cursor;
    let parentheses = 0;
    while (cursor < source.length) {
      const char = source[cursor];
      if (char === "\\") {
        cursor += 2;
        continue;
      }
      if (char === "(") parentheses++;
      else if (char === ")") {
        if (!parentheses) break;
        parentheses--;
      } else if (/\s/.test(char) && !parentheses) break;
      cursor++;
    }
    if (parentheses) return null;
    target = source.slice(targetStart, cursor);
  }

  let titleParentheses = 0;
  let quote = null;
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "(") titleParentheses++;
    else if (char === ")") {
      if (!titleParentheses) return { target, end: cursor + 1 };
      titleParentheses--;
    }
    cursor++;
  }
  return null;
}

function targetsInSource(source) {
  const targets = [];
  let line = 1;
  for (let index = 0; index < source.length;) {
    const parsed = source[index] === "[" && parseInlineTarget(source, index);
    if (parsed) {
      targets.push({ target: parsed.target, line });
      line += (source.slice(index, parsed.end).match(/\n/g) ?? []).length;
      index = parsed.end;
    } else {
      if (source[index] === "\n") line++;
      index++;
    }
  }
  source.split("\n").forEach((text, index) => {
    const definition = text.match(/^ {0,3}\[.+\]:[ \t]*(?:<([^>]+)>|(\S+))/);
    if (definition)
      targets.push({ target: definition[1] ?? definition[2], line: index + 1 });
  });
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
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    const source = maskCodeSpans(maskFences(lines));
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
        decoded = decodeURIComponent(target.split(/[?#]/, 1)[0]).replaceAll(
          "\\ ",
          " ",
        );
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
