// Rule governance gate (npm run rules:check).
// Keeps entry rule files compact, numbered, non-duplicative, and properly routed.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const RULE_LIMITS = Object.freeze({
  "RULES.md": 5000,
  "AGENTS.md": 12000,
  "AI_RULES.md": 8000,
});

export const COMPATIBILITY_ENTRIES = Object.freeze([
  "CLAUDE.md",
  "GEMINI.md",
  ".github/copilot-instructions.md",
  ".cursor/rules/project.mdc",
]);

export const REQUIRED_RULE_IDS = Object.freeze([
  "RULE-NO-DRIVEBY",
  "RULE-NO-RAW-UI",
  "RULE-NO-CROSS-SLICE",
  "RULE-NO-REINVENT",
  "RULE-NO-FAKE-PASS",
  "RULE-STACK-PIN",
  "RULE-READ-FIRST",
  "RULE-COMP-TOKEN",
  "RULE-WORKTREE-GATE",
  "R-ENTRY-01",
  "R-ARCH-01",
  "R-ARCH-02",
  "R-ARCH-03",
  "R-ARCH-04",
  "R-SEC-01",
  "D-SYNC-01",
  "D-TOKEN-01",
  "D-TOKEN-02",
  "D-COMP-01",
  "R-DOC-01",
  "R-GIT-02",
  "C-AUTO-01",
  "C-AUTO-02",
  "C-FACT-01",
  "C-SHIP-01",
]);

const RULE_ID_PATTERN = /\[((?:RULE|R|D|C)-[A-Z0-9-]+)\]/g;

function normalizeProse(line) {
  return line
    .replace(/`[^`]*`/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

export function extractRuleIds(text) {
  return [...text.matchAll(RULE_ID_PATTERN)].map((m) => m[1]);
}

function scanRuleFile(root, rel, maxBytes, state) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    state.issues.push(`${rel}: missing required rule entry file`);
    return;
  }
  const content = fs.readFileSync(full, "utf8");
  const size = Buffer.byteLength(content, "utf8");
  if (size > maxBytes) {
    state.issues.push(
      `${rel}: ${size} bytes exceeds ${maxBytes} byte budget (keep rules concise)`,
    );
  }
  for (const id of extractRuleIds(content)) {
    const prevFile = state.allIds.get(id);
    if (prevFile && prevFile !== rel) {
      state.issues.push(
        `Duplicate rule ID [${id}] defined in both ${prevFile} and ${rel}`,
      );
    } else {
      state.allIds.set(id, rel);
    }
  }
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*[|#]/.test(line)) continue;
    const norm = normalizeProse(line);
    if (norm.length < 45) continue;
    const prev = state.proseSeen.get(norm);
    if (prev && prev !== rel) {
      state.issues.push(
        `Duplicated rule paragraph across ${prev} and ${rel}: "${line.trim().slice(0, 60)}..."`,
      );
    } else {
      state.proseSeen.set(norm, rel);
    }
  }
}

function checkRulesCardStructure(root) {
  const full = path.join(root, "RULES.md");
  if (!fs.existsSync(full)) return [];
  const text = fs.readFileSync(full, "utf8");
  const noIdx = text.indexOf("绝对不做");
  const mustIdx = text.indexOf("必须做");
  const issues = [];
  if (noIdx === -1 || mustIdx === -1 || noIdx > mustIdx) {
    issues.push(
      "RULES.md: must place '绝对不做' (prohibitions) before '必须做' (requirements)",
    );
  }
  if (!text.includes("Checklist")) {
    issues.push("RULES.md: must include pre-merge Checklist section");
  }
  return issues;
}

function checkPrioritySingleSource(root) {
  const issues = [];
  const specPath = path.join(root, "docs/governance/SPEC_BASELINE.md");
  if (fs.existsSync(specPath)) {
    const spec = fs.readFileSync(specPath, "utf8");
    if (spec.includes("用户意图 →")) {
      issues.push(
        "docs/governance/SPEC_BASELINE.md: must not restate a second priority chain; route to docs/README.md",
      );
    }
  }
  const mapPath = path.join(root, "docs/governance/AUTHORITY_MAP.json");
  if (!fs.existsSync(mapPath)) {
    issues.push("docs/governance/AUTHORITY_MAP.json: missing authority map");
    return issues;
  }
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  if (map.rule_hierarchy?.entries) {
    issues.push(
      "docs/governance/AUTHORITY_MAP.json: rule_hierarchy.entries duplicates precedence",
    );
  }
  if (map.rule_hierarchy?.status !== "superseded") {
    issues.push(
      "docs/governance/AUTHORITY_MAP.json: rule_hierarchy must stay superseded by precedence",
    );
  }
  const orders = Array.isArray(map.precedence)
    ? map.precedence.map((entry) => entry.order)
    : [];
  if (JSON.stringify(orders) !== JSON.stringify([1, 2, 3, 4, 5])) {
    issues.push(
      "docs/governance/AUTHORITY_MAP.json: precedence must keep the five-level docs/README.md order",
    );
  }
  const order2 = map.precedence?.find((entry) => entry.order === 2);
  const paths = order2?.paths ?? [];
  if (!paths.includes("RULES.md") || !paths.includes("AGENTS.md")) {
    issues.push(
      "docs/governance/AUTHORITY_MAP.json: precedence order 2 must include RULES.md and AGENTS.md",
    );
  }
  const source = map.precedence?.find(
    (entry) => entry.authority === "current_source_and_runtime_evidence",
  );
  const specs = map.precedence?.find(
    (entry) => entry.authority === "specialized_specifications",
  );
  if (!source || !specs || source.order < specs.order) {
    issues.push(
      "docs/governance/AUTHORITY_MAP.json: specialized specifications must outrank source evidence",
    );
  }
  return issues;
}

const COMPATIBILITY_BYTE_LIMIT = 1200;
const LAYER_ANCHORS = Object.freeze([
  "vendor/canvas-agent",
  "src/features/mcp",
  "src/features/skills",
  ".githooks/pre-push",
  ".github/workflows",
  ".cursor/rules/project.mdc",
]);

export function compatibilityIssues(rel, text) {
  const issues = [];
  if (Buffer.byteLength(text, "utf8") > COMPATIBILITY_BYTE_LIMIT) {
    issues.push(
      `${rel}: compatibility entry exceeds ${COMPATIBILITY_BYTE_LIMIT} bytes`,
    );
  }
  if (/\[(?:RULE|R|D|C)-[A-Z0-9-]+\]/.test(text)) {
    issues.push(`${rel}: must not define a rule body`);
  }
  for (const target of ["RULES.md", "AGENTS.md", "AI_RULES.md"]) {
    if (!text.includes(target)) issues.push(`${rel}: must route to ${target}`);
  }
  return issues;
}

function checkCompatibilityPointers(root) {
  const issues = [];
  for (const rel of COMPATIBILITY_ENTRIES) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      issues.push(`${rel}: missing compatibility entry`);
      continue;
    }
    issues.push(...compatibilityIssues(rel, fs.readFileSync(full, "utf8")));
  }
  return issues;
}

function checkStartupOrder(root) {
  const full = path.join(root, "docs/README.md");
  if (!fs.existsSync(full)) return ["docs/README.md: missing document index"];
  const text = fs.readFileSync(full, "utf8");
  const start = text.indexOf("## 阅读顺序");
  const end = start === -1 ? -1 : text.indexOf("\n## ", start + 1);
  const section =
    start === -1 ? "" : text.slice(start, end === -1 ? undefined : end);
  const rules = section.indexOf("../RULES.md");
  const agents = section.indexOf("../AGENTS.md");
  if (rules === -1 || agents === -1 || rules > agents) {
    return ["docs/README.md: 阅读顺序 must route to RULES.md before AGENTS.md"];
  }
  return [];
}

function checkAgentLayerMap(root) {
  const rel = "docs/architecture/REPO-LAYOUT.md";
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return [`${rel}: missing directory authority`];
  const text = fs.readFileSync(full, "utf8");
  return LAYER_ANCHORS.filter((anchor) => !text.includes(anchor)).map(
    (anchor) => `${rel}: agent layer map must keep ${anchor}`,
  );
}

function checkWorkbenchResidue(root) {
  const temporary = path.join(root, ".tmp");
  if (!fs.existsSync(temporary)) return [];
  const names = fs.readdirSync(temporary);
  const issues = [];
  for (const prefix of ["agent-runtime-previous-", "production-agent-"]) {
    const count = names.filter((name) => name.startsWith(prefix)).length;
    if (count > 1) {
      issues.push(
        `.tmp: ${count} ${prefix}* directories; keep at most one and move older copies to container output`,
      );
    }
  }
  return issues;
}

function checkLocalResidueStaysUntracked(root) {
  let output;
  try {
    output = execFileSync(
      "git",
      ["ls-files", "--", ".agents", ".superpowers"],
      { cwd: root, encoding: "utf8" },
    );
  } catch {
    return ["agent layer check: cannot list .agents or .superpowers"];
  }
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(
      (file) =>
        `${file}: local residue must stay untracked; it is not an agent policy tree`,
    );
}

export function checkRules(root = process.cwd()) {
  const state = { issues: [], allIds: new Map(), proseSeen: new Map() };
  for (const [rel, maxBytes] of Object.entries(RULE_LIMITS)) {
    scanRuleFile(root, rel, maxBytes, state);
  }
  for (const id of REQUIRED_RULE_IDS) {
    if (!state.allIds.has(id))
      state.issues.push(`Missing required rule ID [${id}] in entry rule files`);
  }
  state.issues.push(
    ...checkRulesCardStructure(root),
    ...checkCompatibilityPointers(root),
    ...checkPrioritySingleSource(root),
    ...checkStartupOrder(root),
    ...checkAgentLayerMap(root),
    ...checkLocalResidueStaysUntracked(root),
    ...checkWorkbenchResidue(root),
  );
  const unifiedPath = path.join(
    root,
    "docs/governance/UNIFIED-PROJECT-RULES.md",
  );
  if (
    fs.existsSync(unifiedPath) &&
    fs.readFileSync(unifiedPath, "utf8").includes("### 1.1 固定优先级")
  ) {
    state.issues.push(
      "docs/governance/UNIFIED-PROJECT-RULES.md: must not maintain a second priority list; route to docs/README.md",
    );
  }
  if (!fs.existsSync(path.join(root, "docs/FIGMA-SYNC.md"))) {
    state.issues.push(
      "docs/FIGMA-SYNC.md: missing Figma sync & component token spec",
    );
  }
  return { issues: state.issues, ruleCount: state.allIds.size };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const { issues, ruleCount } = checkRules();
  issues.forEach((issue) => console.error(issue));
  console.log(
    `Rules check: ${ruleCount} rule IDs, ${issues.length} violations.`,
  );
  process.exitCode = issues.length ? 1 : 0;
}
