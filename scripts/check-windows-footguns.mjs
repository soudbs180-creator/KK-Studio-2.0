/**
 * Windows 不安全模式扫描：grep 式规则表（见 governance/footgun-rules.mjs），
 * 只扫 base..head 间变化的文件。规则元数据目录 scripts/governance/ 排除出扫描范围，
 * 避免规则文本自匹配。
 *
 * 移植自 hermes-agent 的 scripts/check-windows-footguns.py（MIT License）的思路，
 * 规则按本项目栈（.mjs/.ts/.ps1/.cmd/.bat/CI yml）重写。语义与代码健康棘轮一致：
 * 存量违规不拦截，新违规在 blocking 模式下失败；总开关从 origin/main 读取，分支不能自我放宽。
 *
 *   node scripts/check-windows-footguns.mjs [--base <rev>] [--head <rev>] [--all]
 *
 * --all 扫全库（清单用）；默认只扫变化文件。退出码：0 通过或 advisory；1 blocking 发现；2 工具失败。
 */
import { readFileSync } from "node:fs";
import {
  changedFiles,
  commitOrNone,
  defaultBase,
  git,
  globToRegExp,
  readSwitch,
} from "./governance/diff-scope.mjs";
import { RULES } from "./governance/footgun-rules.mjs";

const CONFIG_FILE = "scripts/governance/code-health.config.mjs";
const root = process.cwd();

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const INCLUDE = [
  "**/*.mjs",
  "**/*.ts",
  "**/*.tsx",
  "**/*.ps1",
  "**/*.cmd",
  "**/*.bat",
  "**/*.yml",
  "**/*.yaml",
];
const EXCLUDE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.tmp/**",
  "**/tmp/**",
  "**/test-results/**",
  "**/vendor/**",
  "**/releases/**",
  "**/docs/**",
  "**/public/**",
  "**/design/**",
  // 规则与配置元数据目录：文本天然包含危险模式自身，排除以免自匹配。
  "scripts/governance/**",
];

function inScope(relPath) {
  const normalized = relPath.replaceAll("\\", "/");
  if (EXCLUDE.some((glob) => globToRegExp(glob).test(normalized))) return false;
  return INCLUDE.some((glob) => globToRegExp(glob).test(normalized));
}

function matchesGlob(relPath, globs) {
  const normalized = relPath.replaceAll("\\", "/");
  return globs.some((glob) => globToRegExp(glob).test(normalized));
}

function scanText(relPath, text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  const isScriptExt = /\.(ps1|bat|cmd)$/i.test(relPath);
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (!matchesGlob(relPath, rule.globs)) continue;
      if (
        rule.needsScriptExt &&
        !isScriptExt &&
        !/\.(ps1|bat|cmd)["'`]/.test(line)
      )
        continue;
      if (!rule.pattern.test(line)) continue;
      if (rule.skip?.test(line)) continue;
      hits.push({
        path: relPath,
        line: index + 1,
        rule: rule.id,
        title: rule.title,
        fix: rule.fix,
        text: line.trim().slice(0, 100),
      });
    }
  });
  return hits;
}

function fail(message) {
  process.stdout.write(`footguns: ${message}\n`);
  process.exit(2);
}

function collectPaths() {
  if (has("all")) {
    return git(root, ["ls-files", "-z"], { check: false })
      .split("\0")
      .filter(Boolean)
      .filter(inScope);
  }
  const baseArg = flag("base");
  const base = baseArg ? commitOrNone(root, baseArg) : defaultBase(root);
  if (!base) {
    if (baseArg) fail(`base revision not found: ${baseArg}`);
    process.stdout.write(
      "footguns: no merge-base with origin/main or main; skipped\n",
    );
    return null;
  }
  const head = flag("head") ? commitOrNone(root, flag("head")) : null;
  const changes = changedFiles(root, base, head);
  return [...new Set(changes.map((c) => c.new).filter(Boolean))].filter(
    inScope,
  );
}

function main() {
  const switchRev = commitOrNone(
    root,
    process.env.GOVERNANCE_BASE?.trim() || "origin/main",
  );
  const mode = switchRev
    ? readSwitch(
        root,
        switchRev,
        CONFIG_FILE,
        "FOOTGUNS_ENFORCEMENT",
        "blocking",
      )
    : "blocking";
  if (mode === "off") {
    process.stdout.write("footguns: off\n");
    return 0;
  }
  const paths = collectPaths();
  if (paths === null) return 0;
  if (paths.length === 0) {
    process.stdout.write("footguns: no scanned files changed\n");
    return 0;
  }
  const hits = [];
  for (const path of paths) {
    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    hits.push(...scanText(path, text));
  }
  const out = hits.map(
    (hit) =>
      `  ${hit.path}:${hit.line} ${hit.rule} ${hit.title} -- ${hit.text}\n      fix: ${hit.fix}`,
  );
  if (out.length) process.stdout.write(`${out.join("\n")}\n`);
  process.stdout.write(
    `\nfootguns: ${paths.length} files scanned: ${hits.length} findings (${mode})\n`,
  );
  if (hits.length > 0 && mode === "advisory") {
    process.stdout.write(
      `advisory mode (FOOTGUNS_ENFORCEMENT in ${CONFIG_FILE}): not failing on the above.\n`,
    );
  }
  return hits.length > 0 && mode === "blocking" ? 1 : 0;
}

try {
  process.exit(main());
} catch (error) {
  process.stdout.write(
    `footguns: tooling failed: ${error?.message ?? error}\n`,
  );
  process.exit(2);
}
