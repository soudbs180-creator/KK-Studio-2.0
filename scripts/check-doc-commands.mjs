import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkDocumentCommands,
  isExemptPath,
} from "./governance/doc-commands.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scripts = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
).scripts;
const issues = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith("."))
        return [];
      return walk(full);
    }
    return entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
  });
}

let checked = 0;
for (const directory of ["docs", "."]) {
  const full = path.join(root, directory);
  if (!fs.existsSync(full)) continue;
  const files =
    directory === "."
      ? walk(full).filter((f) => !f.includes(`${path.sep}docs${path.sep}`))
      : walk(full);
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    if (isExemptPath(relative)) continue;
    checked += 1;
    issues.push(
      ...checkDocumentCommands(
        fs.readFileSync(file, "utf8"),
        scripts,
        relative,
      ),
    );
  }
}

issues.forEach((issue) => console.error(issue));
console.log(
  `Doc commands: ${checked} active Markdown files, ${issues.length} violations. Historical packages and archives are exempt.`,
);
process.exitCode = issues.length ? 1 : 0;
