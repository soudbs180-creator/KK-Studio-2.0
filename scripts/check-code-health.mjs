/**
 * 代码健康棘轮：新代码必须达标，存量代码只许变小。
 *   node scripts/check-code-health.mjs [--base <rev>] [--head <rev>] [--report] [--json]
 *
 * 默认 base 为 HEAD 与 origin/main 的 merge-base（CI 用 GOVERNANCE_BASE 指定目标分支 tip），
 * head 为工作区（含未跟踪文件）。ENFORCEMENT 总开关从 origin/main 的配置读取，分支不能自我放宽；
 * 缺失或无法解析时按 blocking 失败关闭。度量范围、目标与模式规则见
 * scripts/governance/code-health.config.mjs；语义移植自 hermes-agent（MIT）。
 *
 * 退出码：0 通过或 advisory；1 blocking 发现；2 工具/度量失败（不是"无发现"）。
 */
import {
  changedFiles,
  commitOrNone,
  defaultBase,
  git,
  inScope,
  readFileAt,
  readSwitch,
} from "./governance/diff-scope.mjs";
import {
  SCOPE,
  PATTERN_RULES,
  TARGETS,
} from "./governance/code-health.config.mjs";
import { measureText, parseAllows } from "./governance/code-health-measure.mjs";
import { compare, toFileMeasures } from "./governance/code-health-compare.mjs";

const CONFIG_FILE = "scripts/governance/code-health.config.mjs";
const root = process.cwd();

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);
const baseArg = flag("base");
const headArg = flag("head");

function fail(message) {
  process.stdout.write(`code-health: ${message}\n`);
  process.exit(2);
}

function requireRevision(name, revision) {
  if (!revision) fail(`${name} revision required`);
  const resolved = commitOrNone(root, revision);
  if (!resolved) fail(`${name} revision not found: ${revision}`);
  return resolved;
}

function measureSide(paths, tree) {
  const measured = new Map();
  for (const path of paths) {
    const text = readFileAt(root, tree, path);
    if (text === null) continue;
    measured.set(path, measureText(path, text));
  }
  return toFileMeasures(measured);
}

/** 行内豁免：finding 所在行或上一行的真实注释中 health: allow <RULE> -- 理由。 */
function allowedFinding(finding, allowsByPath) {
  const allows = allowsByPath.get(finding.path);
  if (!allows) return null;
  for (const entry of allows.get(finding.rule) ?? []) {
    if (entry.line === finding.line || entry.line === finding.line - 1)
      return entry.reason;
  }
  return null;
}

function printFindings(findings, allowsByPath) {
  const lines = [];
  for (const finding of findings) {
    const reason = allowedFinding(finding, allowsByPath);
    const tag = reason === null ? "" : ` [allowed: ${reason || "无理由"}]`;
    lines.push(
      `  ${finding.path}:${finding.line} ${finding.rule} ${finding.scope} ${finding.detail}${tag}`,
    );
  }
  return lines.join("\n");
}

function burnDown(tree) {
  const paths = git(root, ["ls-files", "-z"], { check: false })
    .split("\0")
    .filter((p) => p && inScope(p, SCOPE));
  const measures = measureSide(paths, tree);
  const over = { CC: 0, FUNC_LINES: 0, NESTING: 0 };
  const bigFiles = [];
  const patternCounts = new Map();
  for (const fm of measures.values()) {
    if (fm.error) continue;
    for (const unit of fm.units.values()) {
      if (unit.cc > TARGETS.CC) over.CC += 1;
      if (unit.funcLines > TARGETS.FUNC_LINES) over.FUNC_LINES += 1;
      if (unit.nesting > TARGETS.NESTING) over.NESTING += 1;
    }
    if (fm.lines.length > TARGETS.FILE_LINES)
      bigFiles.push(`${fm.path} (${fm.lines.length})`);
    for (const hit of fm.hits)
      patternCounts.set(hit.rule, (patternCounts.get(hit.rule) ?? 0) + 1);
  }
  const summary = [
    `code-health report: ${paths.length} files in scope`,
    `  functions over target: CC>${TARGETS.CC}=${over.CC}, lines>${TARGETS.FUNC_LINES}=${over.FUNC_LINES}, nesting>${TARGETS.NESTING}=${over.NESTING}`,
    `  files over ${TARGETS.FILE_LINES} lines: ${bigFiles.length ? bigFiles.join(", ") : "none"}`,
    `  pattern hits: ${[...patternCounts].map(([rule, n]) => `${rule}=${n}`).join(", ") || "none"}`,
  ];
  process.stdout.write(`${summary.join("\n")}\n`);
  return 0;
}

function main() {
  if (has("report")) return burnDown(null);

  const base = has("base")
    ? requireRevision("base", baseArg)
    : defaultBase(root);
  if (!base) {
    if (baseArg) fail(`base revision not found: ${baseArg}`);
    process.stdout.write(
      "code-health: no merge-base with origin/main or main; skipped\n",
    );
    return 0;
  }
  const head = has("head") ? requireRevision("head", headArg) : null;

  // 总开关从 origin/main tip 读取（CI 的 GOVERNANCE_BASE 优先），分支不能自我放宽。
  const switchRev =
    commitOrNone(root, process.env.GOVERNANCE_BASE?.trim() || "origin/main") ??
    base;
  const mode = readSwitch(
    root,
    switchRev,
    CONFIG_FILE,
    "ENFORCEMENT",
    "blocking",
  );
  if (mode === "off") {
    process.stdout.write(
      `code-health: off (ENFORCEMENT on ${switchRev.slice(0, 12)})\n`,
    );
    return 0;
  }

  const changes = changedFiles(root, base, head);
  const headPaths = [
    ...new Set(changes.map((c) => c.new).filter(Boolean)),
  ].filter((p) => inScope(p, SCOPE));
  const basePaths = [
    ...new Set(changes.map((c) => c.old).filter(Boolean)),
  ].filter((p) => inScope(p, SCOPE));
  if (headPaths.length === 0) {
    process.stdout.write("code-health: no measured files changed\n");
    return 0;
  }

  const baseMeasures = measureSide(basePaths, base);
  const headMeasures = measureSide(headPaths, head);
  const baseOf = new Map(
    changes.filter((c) => c.new && c.old).map((c) => [c.new, c.old]),
  );
  const rulesById = new Map(PATTERN_RULES.map((rule) => [rule.id, rule]));

  const findings = compare(baseMeasures, headMeasures, baseOf, rulesById);
  const allowsByPath = new Map();
  for (const [path, fm] of headMeasures)
    allowsByPath.set(path, parseAllows(fm.comments));

  const blocking = findings.filter(
    (finding) => allowedFinding(finding, allowsByPath) === null,
  );
  const advisory = findings.length - blocking.length;
  if (has("json")) {
    process.stdout.write(
      `${JSON.stringify(
        findings.map((finding) => ({
          ...finding,
          allowed: allowedFinding(finding, allowsByPath) !== null,
        })),
        null,
        2,
      )}\n`,
    );
    return blocking.length > 0 && mode === "blocking" ? 1 : 0;
  }
  const body = printFindings(findings, allowsByPath);
  if (body) process.stdout.write(`${body}\n`);
  process.stdout.write(
    `\ncode-health: ${headPaths.length} files vs ${base.slice(0, 12)}: ${blocking.length} blocking, ${advisory} allowed (${mode})\n`,
  );
  if (blocking.length > 0 && mode !== "blocking") {
    process.stdout.write(
      `advisory mode (ENFORCEMENT in ${CONFIG_FILE} on ${switchRev.slice(0, 12)}): not failing on the above.\n`,
    );
  }
  if (blocking.length > 0 && mode === "blocking") {
    process.stdout.write(
      "\n每个函数和文件有自己的上限：已超标单元取 base 上的值为上限只许变小，新单元必须达标。\n" +
        "修复代码，或用行内注释豁免：// health: allow <RULE> -- 理由（写在违规行或上一行）。\n" +
        "规则与目标：scripts/governance/code-health.config.mjs。本地复现：npm run health:check\n",
    );
    return 1;
  }
  return 0;
}

try {
  process.exit(main());
} catch (error) {
  process.stdout.write(
    `code-health: measurement tooling failed: ${error?.message ?? error}\n`,
  );
  process.exit(2);
}
