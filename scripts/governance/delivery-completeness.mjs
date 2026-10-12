/**
 * 交付包完整性检查。
 *
 * 背景：SDLC 与 BRANCH-POLICY 要求每次交付在 docs/changes/<date>-<slug>/
 * 建立 intent/spec/plan/verification/review 五件套，但该约束此前只在 PR
 * 人工检查中体现。实测 116 个交付包中有 29 个缺件，且没有任何门禁拦截。
 *
 * 存量包不做追溯性失败（它们属于历史证据，不可改写），只对本次 diff 触及的
 * 交付包强制——这是「新增即合规」策略：门禁上线后的新交付必须完整。
 */

/** 五件套核心文件。顺序即建议阅读顺序。 */
export const CORE_FILES = Object.freeze([
  "intent.md",
  "spec.md",
  "plan.md",
  "verification.md",
  "review.md",
]);

/** 交付包目录名格式：YYYY-MM-DD-<task-slug> */
export const PACKAGE_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 历史遗留包显式豁免标记，写在包内任一文件的 front matter 或首部。 */
export const LEGACY_EXEMPT_MARKER = "legacy-incomplete";

/**
 * 判断路径是否属于交付包，且返回包目录的仓库相对路径。
 *
 * @param {string} changedPath git 输出的正斜杠路径
 * @returns {string|null} 包目录路径；不是交付包返回 null
 */
export function resolvePackageDir(changedPath) {
  const match = /^docs\/changes\/([^/]+)\//.exec(changedPath);
  if (!match) return null;
  const name = match[1];
  if (!PACKAGE_PATTERN.test(name)) return null;
  return `docs/changes/${name}`;
}

/**
 * 校验一个交付包目录是否完整。
 *
 * @param {string} packageDir 包目录（仓库相对路径）
 * @param {(file: string) => boolean} fileExists 判断包内文件是否存在
 * @param {(packageDir: string) => boolean} isExempt 该包是否被显式豁免
 * @returns {string[]} 违规描述
 */
export function checkPackageCompleteness(packageDir, fileExists, isExempt) {
  if (isExempt(packageDir)) return [];
  const missing = CORE_FILES.filter(
    (file) => !fileExists(`${packageDir}/${file}`),
  );
  if (!missing.length) return [];
  return [
    `${packageDir}: 交付包缺少 ${missing.join(", ")}；新交付必须包含 ${CORE_FILES.join(" / ")}。历史包如确需保留请在包内标注 ${LEGACY_EXEMPT_MARKER}`,
  ];
}

/**
 * 对一批变更路径执行交付包完整性校验。
 *
 * @param {string[]} changedPaths 本次 diff 的正斜杠路径
 * @param {(file: string) => boolean} fileExists
 * @param {(packageDir: string) => boolean} isExempt
 * @returns {string[]}
 */
export function checkChangedPackages(changedPaths, fileExists, isExempt) {
  const issues = [];
  const seen = new Set();
  for (const changedPath of changedPaths) {
    const dir = resolvePackageDir(changedPath);
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    issues.push(...checkPackageCompleteness(dir, fileExists, isExempt));
  }
  return issues;
}
