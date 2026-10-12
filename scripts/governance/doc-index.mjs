/**
 * 索引与编号唯一性检查。
 *
 * 背景：docs/README.md 是文档索引与冲突裁决入口，docs/architecture/adr/ 是
 * 唯一 ADR 位置。两者的「唯一性」此前只靠人工维护，实测出现过索引漏项
 * (engineering 15 份只索引 12 份) 与 ADR 编号重复 (002/006/007 各两份)。
 *
 * 本模块只做纯函数校验，不碰文件系统，便于单测覆盖。
 */

/** 必须被 docs/README.md 索引的目录（相对仓库根，正斜杠）。 */
export const INDEXED_DIRECTORIES = Object.freeze([
  "docs/engineering",
  "docs/architecture",
  "docs/governance",
]);

/** ADR 唯一目录。docs/decides 之外的第二处 ADR 目录一律违规。 */
export const ADR_DIRECTORY = "docs/architecture/adr";

/** 已废止的 ADR 目录，2026-10-11 归并后不应再出现。 */
export const RETIRED_ADR_DIRECTORIES = Object.freeze(["docs/decisions"]);

/** 当前仍承载任务状态快照的文档，必须声明来源、日期和非权威性。 */
export const SNAPSHOT_DOCUMENTS = Object.freeze([
  "docs/governance/TASK_STATUS.md",
]);

/** 容器层仍承载任务/功能快照的文档，由 snapshot:check 跨仓检查。 */
export const CONTAINER_SNAPSHOT_DOCUMENTS = Object.freeze([
  "docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md",
]);

/** ADR 文件名格式：ADR-NNN-kebab-title.md */
const ADR_FILE_PATTERN = /^ADR-(\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

/**
 * 校验某个 Markdown 文件是否在索引文本中被引用。
 *
 * 匹配策略：索引里通常写成 `[NAME](engineering/NAME.md)`，因此优先匹配
 * 完整相对路径；退化时匹配裸文件名，避免因为索引写成纯文本路径而误报。
 */
function isIndexed(indexSource, directory, fileName) {
  const withoutExtension = fileName.replace(/\.md$/, "");
  const relativePath = `${directory}/${fileName}`;
  return (
    indexSource.includes(relativePath) ||
    indexSource.includes(`./${fileName}`) ||
    new RegExp(`\\]\\([^)]*${escapeRegExp(fileName)}`).test(indexSource) ||
    new RegExp(`\\b${escapeRegExp(withoutExtension)}\\b`).test(indexSource)
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 校验索引覆盖率。
 *
 * @param {string} indexSource docs/README.md 全文
 * @param {Array<{directory: string, files: string[]}>} inventory 待校验目录清单
 * @returns {string[]} 违规描述，空数组表示通过
 */
export function checkIndexCoverage(indexSource, inventory) {
  const issues = [];
  for (const { directory, files } of inventory) {
    for (const file of files) {
      if (file === "README.md") continue; // 目录自身说明文件
      if (!isIndexed(indexSource, directory, file))
        issues.push(
          `${directory}/${file}: 未在 docs/README.md 索引中登记；新增文档必须同步索引表`,
        );
    }
  }
  return issues;
}

/**
 * 校验 ADR 编号唯一性。
 *
 * 编号重复会让「ADR-NNN」这种引用指向歧义目标，因此同号必须唯一。
 *
 * @param {string[]} fileNames ADR 目录下的文件名
 * @returns {string[]} 违规描述
 */
export function checkAdrNumbering(fileNames) {
  const issues = [];
  const byNumber = new Map();
  for (const fileName of fileNames) {
    const match = ADR_FILE_PATTERN.exec(fileName);
    if (!match) {
      // README.md 等非 ADR 文件不参与编号校验。
      if (fileName !== "README.md")
        issues.push(
          `${ADR_DIRECTORY}/${fileName}: 文件名不符合 ADR-NNN-kebab-title.md`,
        );
      continue;
    }
    const number = match[1];
    const bucket = byNumber.get(number) ?? [];
    bucket.push(fileName);
    byNumber.set(number, bucket);
  }
  for (const [number, files] of [...byNumber.entries()].sort()) {
    if (files.length > 1)
      issues.push(
        `${ADR_DIRECTORY}: 编号 ADR-${number} 重复（${files.sort().join(", ")}）；编号必须全局唯一，新增时取最大号+1`,
      );
  }
  return issues;
}

/**
 * 校验不存在第二处 ADR 目录。
 *
 * @param {string[]} existingDirectories 实际存在的 docs 一级子目录
 * @returns {string[]}
 */
export function checkRetiredAdrDirectories(existingDirectories) {
  const issues = [];
  for (const retired of RETIRED_ADR_DIRECTORIES) {
    const name = retired.replace(/^docs\//, "");
    if (existingDirectories.includes(name))
      issues.push(
        `${retired}/: 第二处 ADR 目录已于 2026-10-11 归并至 ${ADR_DIRECTORY}/，不得重建或写入`,
      );
  }
  return issues;
}

/**
 * 校验任务快照头部是否包含三要素：数据源、快照日期、非权威声明。
 *
 * @param {string} source Markdown 文档内容
 * @param {string} filePath 用于错误信息的仓库相对路径
 * @returns {string[]}
 */
export function checkSnapshotHeader(source, filePath, now = new Date()) {
  const issues = [];
  const header = source.split(/\r?\n/).slice(0, 20).join("\n");
  const dateMatch = header.match(/快照日期\s*[:：]?\s*(\d{4}-\d{2}-\d{2})/i);
  if (!dateMatch) issues.push(`${filePath}: 缺少快照日期声明`);
  else {
    const snapshotDate = new Date(`${dateMatch[1]}T00:00:00Z`);
    if (
      Number.isNaN(snapshotDate.getTime()) ||
      dateMatch[1] !== snapshotDate.toISOString().slice(0, 10)
    )
      issues.push(`${filePath}: 快照日期不是有效的 YYYY-MM-DD 日期`);
    else if (
      now.getTime() - snapshotDate.getTime() > 14 * 24 * 60 * 60 * 1000 &&
      !/superseded|已被取代|已过期/i.test(header)
    )
      issues.push(`${filePath}: 快照超过 14 天且未标记 superseded/已被取代`);
  }
  if (!/数据源\s*[:：]\s*\S+|data(?:\s|-)?source\s*[:：]\s*\S+/i.test(header))
    issues.push(`${filePath}: 缺少数据源声明`);
  if (
    !/本文不替代权威账本|不替代权威|does not replace the authoritative/i.test(
      header,
    )
  )
    issues.push(`${filePath}: 缺少“本文不替代权威账本”声明`);
  return issues;
}
