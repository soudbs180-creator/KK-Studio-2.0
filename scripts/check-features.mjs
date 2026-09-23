import fs from "node:fs";
import { validateFeatures, renderFeatures } from "./features/registry.mjs";

const issues = [];
const registryPath = "docs/features/features.registry.json";
const boardPath = "docs/features/README.md";

if (!fs.existsSync(registryPath)) {
  console.error(`Missing feature registry ${registryPath}`);
  process.exit(1);
}

let features;
try {
  features = JSON.parse(fs.readFileSync(registryPath, "utf8"));
} catch (error) {
  console.error(`Cannot parse ${registryPath}: ${error.message}`);
  process.exit(1);
}

let tasks = [];
try {
  tasks = JSON.parse(
    fs.readFileSync("docs/governance/task-ledger.json", "utf8"),
  );
} catch (error) {
  issues.push(`Cannot read task ledger: ${error.message}`);
}

issues.push(...validateFeatures(features, tasks));

if (!issues.length) {
  const output = renderFeatures(features);
  if (process.argv.includes("--write")) {
    fs.writeFileSync(boardPath, output);
  } else if (
    !fs.existsSync(boardPath) ||
    fs.readFileSync(boardPath, "utf8").replaceAll("\r\n", "\n") !== output
  ) {
    issues.push("Stale feature board: run npm run features:write");
  }
}

issues.forEach((issue) => console.error(issue));
console.log(
  `Features: ${Array.isArray(features) ? features.length : 0} features, ${issues.length} violations.`,
);
process.exitCode = issues.length ? 1 : 0;
