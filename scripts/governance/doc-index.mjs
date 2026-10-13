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

/** 容器层任务/功能快照；仅显式选择 container root 时跨仓严格检查。 */
export const CONTAINER_SNAPSHOT_DOCUMENTS = Object.freeze([
  "docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md",
]);

/**
 * 当前治理入口的生命周期元数据。历史 change package 不在这里登记：它们
 * 是 dated evidence，不能与当前文档竞争事实来源。
 */
export const TEMPORAL_DOCUMENTS = Object.freeze([
  {
    relativePath: "docs/governance/TASK_STATUS.md",
    documentId: "TASK_STATUS",
    source: "docs/governance/task-ledger.json",
  },
  {
    relativePath: "docs/governance/PROJECT_STATE.md",
    documentId: "PROJECT_STATE",
    source: "docs/governance/task-ledger.json",
  },
  {
    relativePath: "docs/governance/AI_HANDOFF.md",
    documentId: "AI_HANDOFF",
    source: "docs/governance/PROJECT_STATE.md",
  },
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

/**
 * 校验当前治理文档的稳定身份、更新时间和替代关系。
 *
 * 日期是版本元数据，不参与 documentId/taskId 身份；旧内容必须通过
 * status=superseded 与 supersededBy 离开当前路由，而不是再产生第二份 current。
 *
 * @param {string} source Markdown 文档全文
 * @param {string} filePath 用于错误信息的仓库相对路径
 * @param {{documentId?: string, source?: string, now?: Date}} options
 * @returns {string[]}
 */
export function checkDocumentLifecycleHeader(
  source,
  filePath,
  {
    documentId: expectedId,
    source: expectedSource,
    expectedStatus,
    knownSupersededTargets,
    now = new Date(),
  } = {},
) {
  const issues = [];
  const header = source.split(/\r?\n/).slice(0, 40).join("\n");
  const metadata = parseLifecycleMetadata(header);
  const { id, updatedAt, status, source: sourceValue } = metadata;
  for (const [field, count] of Object.entries(metadata.counts)) {
    if (count > 1) issues.push(`${filePath}: ${field} 元数据出现重复字段`);
  }

  if (!id) issues.push(`${filePath}: 缺少稳定 docId`);
  else if (expectedId && id !== expectedId)
    issues.push(`${filePath}: docId 应为 ${expectedId}，实际为 ${id}`);
  if (!updatedAt) issues.push(`${filePath}: 缺少 updatedAt/更新时间`);
  else {
    const parsed = new Date(`${updatedAt}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      updatedAt !== parsed.toISOString().slice(0, 10)
    )
      issues.push(`${filePath}: updatedAt 不是有效的 YYYY-MM-DD 日期`);
    else if (parsed.getTime() > now.getTime())
      issues.push(`${filePath}: updatedAt 不能晚于当前日期`);
  }
  if (!status)
    issues.push(`${filePath}: 缺少 status=current|superseded|historical`);
  else if (expectedStatus && status !== expectedStatus)
    issues.push(`${filePath}: status 应为 ${expectedStatus}，实际为 ${status}`);
  if (!sourceValue) issues.push(`${filePath}: 缺少 source/数据源`);
  else if (expectedSource && sourceValue !== expectedSource)
    issues.push(
      `${filePath}: source 应精确为 ${expectedSource}，实际为 ${sourceValue}`,
    );
  issues.push(
    ...checkSupersededTarget(metadata, filePath, knownSupersededTargets),
  );
  return issues;
}

function checkSupersededTarget(
  { status, supersededBy },
  filePath,
  knownSupersededTargets,
) {
  const issues = [];
  if (supersededBy === null)
    issues.push(
      `${filePath}: 缺少 supersededBy 字段（current 文档也必须写 null）`,
    );
  else if (status === "current" && supersededBy.toLowerCase() !== "null")
    issues.push(`${filePath}: status=current 时 supersededBy 必须为 null`);
  else if (status === "superseded" && supersededBy.toLowerCase() === "null")
    issues.push(`${filePath}: status=superseded 时必须指向 supersededBy`);
  else if (status === "superseded" && /^null/i.test(supersededBy))
    issues.push(`${filePath}: supersededBy 不能使用 null 保留字`);
  else if (
    status === "superseded" &&
    knownSupersededTargets &&
    !knownSupersededTargets.has(supersededBy)
  )
    issues.push(
      `${filePath}: supersededBy 未指向已登记的 current 文档（${supersededBy}）`,
    );
  else if (
    status === "superseded" &&
    !/^(?:[A-Za-z0-9._-]+|(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+\.md)$/.test(
      supersededBy,
    )
  )
    issues.push(
      `${filePath}: supersededBy 必须是稳定 docId 或仓库相对 Markdown 路径`,
    );
  return issues;
}

/**
 * 读取头部的生命周期元数据。字段必须独占一行，避免正文中的相似文字
 * 被当成门禁元数据；返回值供唯一性门禁复用。
 */
export function parseLifecycleMetadata(headerSource) {
  const metadata = {
    id: null,
    updatedAt: null,
    status: null,
    source: null,
    supersededBy: null,
    counts: {
      docId: 0,
      updatedAt: 0,
      status: 0,
      source: 0,
      supersededBy: 0,
    },
  };
  let inFence = false;
  for (const line of headerSource.split(/\r?\n/).slice(0, 40)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const value = (pattern) => line.match(pattern)?.[1]?.trim() ?? null;
    const id = value(
      /^\s*(?:[-*]\s*)?(?:docId|文档\s*ID)\s*[:：]\s*`?([A-Za-z0-9._-]+)`?\s*$/i,
    );
    if (id !== null) {
      metadata.counts.docId++;
      metadata.id ??= id;
    }
    const updatedAt = value(
      /^\s*(?:[-*]\s*)?(?:updatedAt|更新时间)\s*[:：]\s*`?(\d{4}-\d{2}-\d{2})`?\s*$/i,
    );
    if (updatedAt !== null) {
      metadata.counts.updatedAt++;
      metadata.updatedAt ??= updatedAt;
    }
    const status = value(
      /^\s*(?:[-*]\s*)?(?:status|状态)\s*[:：]\s*`?(current|superseded|historical)`?\s*$/i,
    );
    if (status !== null) {
      metadata.counts.status++;
      metadata.status ??= status;
    }
    const source = value(
      /^\s*(?:[-*]\s*)?(?:source|数据源)\s*[:：]\s*`?([^`\r\n]+?)`?\s*$/i,
    );
    if (source !== null) {
      metadata.counts.source++;
      metadata.source ??= source;
    }
    const supersededBy = value(
      /^\s*(?:[-*]\s*)?(?:supersededBy|替代文档)\s*[:：]\s*`?([^`\r\n]+?)`?\s*$/i,
    );
    if (supersededBy !== null) {
      metadata.counts.supersededBy++;
      metadata.supersededBy ??= supersededBy;
    }
  }
  return metadata;
}

/**
 * 当前入口不能出现同一 docId 的多份 current 记录。
 * @param {Array<{filePath: string, source: string}>} documents
 * @returns {string[]}
 */
export function checkCurrentDocumentUniqueness(documents) {
  const issues = [];
  const current = new Map();
  for (const { filePath, source } of documents) {
    const { id, status } = parseLifecycleMetadata(source);
    if (id && status === "current") {
      const previous = current.get(id);
      if (previous)
        issues.push(`重复 current docId ${id}: ${previous} 与 ${filePath}`);
      else current.set(id, filePath);
    }
  }
  return issues;
}
