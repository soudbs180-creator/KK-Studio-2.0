/**
 * 文档命令引用检查。
 *
 * 背景：规范文档里写了大量 `npm run X` 作为可执行指引。实测出现过
 * `npm run governance:worktree-audit` ——该脚本在 package.json 中根本不存在，
 * 执行者会浪费一轮排查。文档指向不存在的命令比没有文档更糟。
 *
 * 本模块校验文档中出现的 npm run 脚本名在 package.json scripts 中真实存在。
 */

const NPM_RUN_PATTERN = /npm\s+run\s+([a-zA-Z0-9:_-]+)/g;

/** 不做存在性校验的文档：历史交付包与归档只作溯源，不代表现行指引。 */
export const EXEMPT_DIRECTORIES = Object.freeze([
  "docs/changes",
  "docs/archive",
  "docs/superpowers",
  "docs/evidence",
  "docs/reference",
]);

/**
 * 提取文本中所有 `npm run <script>` 引用的脚本名。
 *
 * @param {string} source
 * @returns {string[]} 去重后的脚本名，按出现顺序
 */
export function extractNpmRunScripts(source) {
  const found = new Set();
  for (const match of source.matchAll(NPM_RUN_PATTERN)) {
    const name = match[1];
    // 跳过 shell 变量与模板占位符，它们不是固定脚本名。
    if (name.includes("$") || name.includes("{") || name.includes("<"))
      continue;
    found.add(name);
  }
  return [...found];
}

/**
 * 校验文档引用的 npm 脚本是否存在。
 *
 * @param {string} source 文档全文
 * @param {Record<string, string>} scripts package.json 的 scripts 对象
 * @param {string} filePath 用于报错定位
 * @returns {string[]} 违规描述
 */
export function checkDocumentCommands(source, scripts, filePath) {
  const issues = [];
  const known = new Set(Object.keys(scripts));
  for (const name of extractNpmRunScripts(source)) {
    if (!known.has(name))
      issues.push(
        `${filePath}: 引用了不存在的脚本 "npm run ${name}"；只写 package.json scripts 中真实存在的命令`,
      );
  }
  return issues;
}

/**
 * 判断某个仓库相对路径是否豁免校验。
 *
 * @param {string} relativePath 正斜杠相对路径
 * @returns {boolean}
 */
export function isExemptPath(relativePath) {
  return EXEMPT_DIRECTORIES.some((directory) =>
    relativePath.startsWith(`${directory}/`),
  );
}
