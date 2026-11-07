// Usage:
//   node scripts/design-tokens/cli.mjs export --snapshot <figma snapshot json>
//   node scripts/design-tokens/cli.mjs css
//   node scripts/design-tokens/cli.mjs check
//   node scripts/design-tokens/cli.mjs tighten
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderCss, snapshotToDtcg } from "./figma.mjs";
import {
  BASELINE_FILE,
  DTCG_FILE,
  compareRatchet,
  runTokenChecks,
} from "./check.mjs";

const GENERATED_CSS = "src/styles/tokens.figma.css";

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readBaseline(root) {
  const file = path.join(root, BASELINE_FILE);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function exportCommand(root, args) {
  const snapshot = option(args, "--snapshot");
  if (!snapshot) throw new Error("export requires --snapshot <path>");
  const { document, warnings } = snapshotToDtcg(
    JSON.parse(fs.readFileSync(snapshot, "utf8")),
  );
  warnings.forEach((warning) => console.warn(`warning: ${warning}`));
  writeJson(path.join(root, DTCG_FILE), document);
  console.log(`tokens: wrote ${DTCG_FILE}`);
}

function cssCommand(root) {
  const source = path.join(root, DTCG_FILE);
  if (!fs.existsSync(source))
    throw new Error(`${DTCG_FILE} missing; run tokens:export first`);
  fs.writeFileSync(
    path.join(root, GENERATED_CSS),
    renderCss(JSON.parse(fs.readFileSync(source, "utf8"))),
    "utf8",
  );
  console.log(`tokens: wrote ${GENERATED_CSS}`);
}

function checkCommand(root) {
  const { findings, strict } = runTokenChecks(root);
  const baseline = readBaseline(root);
  if (!baseline)
    throw new Error(
      `${BASELINE_FILE} missing; it may only be created by review, never to pass a gate`,
    );
  const { regressions, reductions } = compareRatchet(
    findings,
    baseline.findings ?? {},
  );
  strict.forEach((issue) => console.error(issue));
  regressions.forEach((item) =>
    console.error(`token ratchet regression: ${item}`),
  );
  if (reductions.length)
    console.log(
      `tokens: ${reductions.length} baseline reductions available; run npm run tokens:tighten`,
    );
  const total = [...findings.values()].reduce((sum, count) => sum + count, 0);
  console.log(
    `Token governance: ${total} legacy findings, ${regressions.length} regressions, ${strict.length} strict issues.`,
  );
  return regressions.length + strict.length === 0;
}

function tightenCommand(root) {
  const { findings } = runTokenChecks(root);
  const baseline = readBaseline(root) ?? { findings: {} };
  const next = {};
  for (const [key, allowed] of Object.entries(baseline.findings ?? {})) {
    const count = Math.min(allowed, findings.get(key) ?? 0);
    if (count > 0) next[key] = count;
  }
  writeJson(path.join(root, BASELINE_FILE), { ...baseline, findings: next });
  console.log(
    `tokens: baseline tightened to ${Object.keys(next).length} keys (never raised).`,
  );
}

export function main(argv = process.argv.slice(2), root = process.cwd()) {
  const [command, ...args] = argv;
  const commands = {
    export: () => exportCommand(root, args),
    css: () => cssCommand(root),
    check: () => checkCommand(root),
    tighten: () => tightenCommand(root),
  };
  if (!commands[command])
    throw new Error(
      `Unknown command "${command}". Use export|css|check|tighten.`,
    );
  return commands[command]() !== false;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    process.exitCode = main() ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
