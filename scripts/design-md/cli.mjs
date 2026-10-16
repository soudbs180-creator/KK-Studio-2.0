import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { inspectDesignMarkdown, syncDesignMarkdown } from "./document.mjs";

export function replaceDesignMarkdown(file, expected, next) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) throw new Error("DESIGN.md must be a regular file");
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${randomUUID()}.tmp`,
  );
  try {
    const descriptor = fs.openSync(temporary, "wx", stat.mode);
    try {
      fs.writeFileSync(descriptor, next, "utf8");
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    if (fs.readFileSync(file, "utf8") !== expected)
      throw new Error("DESIGN.md changed during sync; original preserved");
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function argumentsOf(args) {
  const [command, ...options] = args;
  if (!["check", "sync"].includes(command))
    throw new Error(
      "Usage: node scripts/design-md/cli.mjs check|sync [--file DESIGN.md] [--css src/styles/tokens.css]",
    );
  const files = { file: "DESIGN.md", css: "src/styles/tokens.css" };
  for (let index = 0; index < options.length; index += 2) {
    const key = options[index].slice(2);
    if (
      !options[index].startsWith("--") ||
      !Object.hasOwn(files, key) ||
      !options[index + 1] ||
      options[index + 1].startsWith("--")
    )
      throw new Error(`Invalid option ${options[index]}`);
    files[key] = options[index + 1];
  }
  return { command, ...files };
}

export function runDesignMarkdown(args) {
  try {
    const { command, file, css: cssFile } = argumentsOf(args);
    const markdown = fs.readFileSync(file, "utf8");
    const css = fs.readFileSync(cssFile, "utf8");
    if (command === "sync") {
      const next = syncDesignMarkdown(markdown, css);
      if (next !== markdown) replaceDesignMarkdown(file, markdown, next);
    }
    const result = inspectDesignMarkdown(fs.readFileSync(file, "utf8"), css);
    console.log(JSON.stringify({ findings: result.findings }, null, 2));
    return result.findings.some((finding) => finding.severity === "error")
      ? 1
      : 0;
  } catch (cause) {
    console.error(cause.message);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  process.exitCode = runDesignMarkdown(process.argv.slice(2));
