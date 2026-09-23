import fs from "node:fs";
import path from "node:path";
import { statuses as taskStatuses } from "../governance/ledger.mjs";

export const featureStatuses = new Set([
  "REAL",
  "PARTIAL",
  "PROTOTYPE",
  "PLANNED",
]);

export const featureAreas = new Set([
  "canvas",
  "creation",
  "intelligence",
  "platform",
  "system",
  "backend",
  "future",
]);

export const areaLabels = {
  canvas: "画布",
  creation: "创作生成",
  intelligence: "智能能力",
  platform: "平台服务",
  system: "系统与数据",
  backend: "后端服务",
  future: "未来规划",
};

const statusLabels = {
  REAL: "真实可用",
  PARTIAL: "部分可用",
  PROTOTYPE: "仅演示/UI",
  PLANNED: "仅计划",
};

const REQUIRED_CARD_HEADINGS = [
  "用户可见入口",
  "代码位置",
  "测试与证据",
  "当前能力",
  "差距与后端化",
];

export function validateFeatures(
  features,
  tasks,
  { root = process.cwd() } = {},
) {
  const issues = [];
  if (!Array.isArray(features)) return ["Feature registry must be an array"];
  if (!Array.isArray(tasks)) issues.push("Task ledger must be an array");
  const taskById = new Map();
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (
      !task ||
      typeof task.id !== "string" ||
      typeof task.status !== "string"
    ) {
      issues.push("Invalid task ledger record");
    } else taskById.set(task.id, task);
  }
  const openStatuses = new Set(
    [...taskStatuses].filter(
      (status) => !["DONE", "OBSOLETE"].includes(status),
    ),
  );
  const platforms = new Set(["web", "desktop", "service"]);
  const repoRoot = fs.realpathSync(root);
  const contained = (target) => {
    const relative = path.relative(repoRoot, target);
    return (
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    );
  };
  const existingPath = (value, label, fileOnly = false) => {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      /[:\0]/.test(value) ||
      path.posix.isAbsolute(value) ||
      path.win32.isAbsolute(value) ||
      value.split(/[\\/]/).some((part) => part === ".." || part === ".")
    ) {
      issues.push(`${label}: invalid repository-relative path`);
      return null;
    }
    const resolved = path.resolve(repoRoot, value.replaceAll("\\", "/"));
    try {
      if (!contained(resolved) || !contained(fs.realpathSync(resolved))) {
        issues.push(`${label}: path escapes outside repository`);
        return null;
      }
      const stat = fs.statSync(resolved);
      if (!(stat.isFile() || (!fileOnly && stat.isDirectory()))) {
        issues.push(
          `${label}: path must be ${fileOnly ? "a file" : "a file or directory"}`,
        );
        return null;
      }
      return resolved;
    } catch {
      issues.push(`${label}: path does not exist or cannot be read: ${value}`);
      return null;
    }
  };
  const ids = new Set();
  const registeredCards = new Set();

  for (const feature of features) {
    if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
      issues.push("Invalid feature record");
      continue;
    }
    const id = feature?.id;
    for (const key of [
      "id",
      "title",
      "area",
      "status",
      "card",
      "summary",
      "updated",
    ])
      if (typeof feature?.[key] !== "string" || !feature[key].trim())
        issues.push(`${id ?? "?"}: missing ${key}`);
    const lists = {};
    for (const key of ["entryPoints", "code", "tests", "tasks"]) {
      const value = feature[key];
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string" || !item.trim())
      )
        issues.push(`${id ?? "?"}: invalid ${key}`);
      lists[key] = Array.isArray(value)
        ? value.filter((item) => typeof item === "string" && item.trim())
        : [];
      if (feature.status === "REAL" && !lists[key].length)
        issues.push(`${id ?? "?"}: REAL requires nonempty ${key}`);
    }
    if (typeof id !== "string" || !id.trim()) continue;
    if (!/^FEAT-\d{3}$/.test(id)) issues.push(`${id}: id must match FEAT-NNN`);
    if (ids.has(id)) issues.push(`Duplicate feature ${id}`);
    ids.add(id);
    if (!featureStatuses.has(feature.status))
      issues.push(`${id}: unknown status ${feature.status}`);
    if (!featureAreas.has(feature.area))
      issues.push(`${id}: unknown area ${feature.area}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(feature.updated ?? ""))
      issues.push(`${id}: invalid updated date`);

    const cardPath = existingPath(feature.card, `${id}: card`, true);
    if (cardPath) {
      registeredCards.add(path.normalize(path.relative(repoRoot, cardPath)));
      const card = fs.readFileSync(cardPath, "utf8");
      if (!card.includes(id))
        issues.push(`${id}: card must reference its own id`);
      const statuses = [...card.matchAll(/^- 状态[：:]\s*(.*?)\s*$/gm)];
      if (statuses.length !== 1 || statuses[0][1] !== feature.status)
        issues.push(`${id}: card status must be ${feature.status}`);
      for (const heading of REQUIRED_CARD_HEADINGS)
        if (!new RegExp(`^## ${heading}(?:[（(].*)?\\s*$`, "m").test(card))
          issues.push(`${id}: card missing heading “${heading}”`);
    }

    for (const target of lists.code) existingPath(target, `${id}: code`);
    for (const target of lists.tests) existingPath(target, `${id}: test`, true);
    const linkedTasks = [];
    for (const taskId of lists.tasks) {
      const task = taskById.get(taskId);
      if (!task) {
        issues.push(`${id}: unknown ledger task ${taskId}`);
        continue;
      }
      linkedTasks.push(task);
    }
    if (feature.status !== "REAL" && !lists.tasks.length)
      issues.push(`${id}: ${feature.status} feature must link a roadmap task`);
    else if (
      feature.status !== "REAL" &&
      !linkedTasks.some((task) => openStatuses.has(task.status))
    )
      issues.push(
        `${id}: ${feature.status} feature must link an open roadmap task (excluding DONE/OBSOLETE)`,
      );
    if (
      feature.status === "REAL" &&
      !linkedTasks.some(
        (task) => task.status === "DONE" && task.verificationResult === "PASS",
      )
    )
      issues.push(`${id}: REAL requires a DONE/PASS ledger task`);

    const declared = feature.platforms;
    if (feature.status === "REAL" || declared !== undefined) {
      if (
        !Array.isArray(declared) ||
        !declared.length ||
        declared.some((platform) => !platforms.has(platform)) ||
        new Set(declared).size !== declared.length
      )
        issues.push(`${id}: invalid platforms`);
    }
    const evidence = feature.runtimeEvidence;
    const covered = new Set();
    if (feature.status === "REAL" || evidence !== undefined) {
      if (!Array.isArray(evidence) || !evidence.length)
        issues.push(`${id}: missing runtime evidence`);
      for (const item of Array.isArray(evidence) ? evidence : []) {
        if (
          !item ||
          typeof item !== "object" ||
          !platforms.has(item.platform) ||
          !Array.isArray(declared) ||
          !declared.includes(item.platform)
        ) {
          issues.push(`${id}: invalid runtime evidence platform`);
          continue;
        }
        if (existingPath(item.path, `${id}: runtime evidence`, true))
          covered.add(item.platform);
      }
    }
    if (feature.status === "REAL")
      for (const platform of Array.isArray(declared) ? declared : [])
        if (!covered.has(platform))
          issues.push(
            `${id}: missing runtime evidence for platform ${platform}`,
          );
  }

  // Every card file on disk must be registered, so a feature cannot hide from the board.
  const featuresDir = path.join(repoRoot, "docs", "features");
  if (fs.existsSync(featuresDir)) {
    for (const entry of fs.readdirSync(featuresDir)) {
      if (!/^feat-.*\.md$/.test(entry)) continue;
      const normalized = path.normalize(path.join("docs", "features", entry));
      if (!registeredCards.has(normalized))
        issues.push(`Unregistered feature card docs/features/${entry}`);
    }
  }
  return issues;
}

function cell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

export function renderFeatures(features) {
  const counts = {};
  for (const feature of features)
    counts[feature.status] = (counts[feature.status] ?? 0) + 1;
  const lines = [
    "# 功能总览与状态看板",
    "",
    "> 本文件由 `docs/features/features.registry.json` 经 `npm run features:write` 生成，请勿手改。",
    "> 每个功能的人类可读入口是同目录 `feat-*.md` 卡片；任务进度以 [`../governance/task-ledger.json`](../governance/task-ledger.json) 为权威。",
    "> 演示功能后端化的分批顺序见 [`BACKEND-ROADMAP.md`](BACKEND-ROADMAP.md)。",
    "",
    "## 状态定义（任何 AI 必须按此口径汇报）",
    "",
    "| 状态 | 含义 |",
    "| --- | --- |",
    "| REAL | 声明范围内真实可用；各适用平台均有同态运行证据和 DONE/PASS 任务；未覆盖的外部服务能力不得据此宣称完成 |",
    "| PARTIAL | 部分子能力真实可用、部分未接或未验证；卡片必须逐条列清已 REAL 部分与差距 |",
    "| PROTOTYPE | 只有 UI、本地 fixture 或固定演示素材，无真实后端；界面必须显式标注 Prototype |",
    "| PLANNED | 只有计划/设计，无实现或无 UI |",
    "",
    `当前共 **${features.length}** 个功能：` +
      ["REAL", "PARTIAL", "PROTOTYPE", "PLANNED"]
        .map(
          (status) =>
            `${status}（${statusLabels[status]}）${counts[status] ?? 0}`,
        )
        .join("、") +
      "。",
    "",
    "## 如何新增一个功能（任何 AI 照此执行）",
    "",
    "1. 复制 [`_feature-template.md`](_feature-template.md) 为 `docs/features/feat-<name>.md`，填全入口、代码位置、测试、当前能力与差距。",
    "2. 在 `features.registry.json` 增加一条记录，状态从 PROTOTYPE/PLANNED 起步，并关联账本任务（新工作先在 task-ledger.json 建任务）。",
    "3. 运行 `npm run features:write` 重新生成本看板，再运行 `npm run features:check`（已并入 `npm run lint`/`verify`）。",
    "4. 功能做到 REAL 必须有同态运行证据（Web 与 Desktop 分别验证），并更新卡片、账本与 `docs/PROGRESS.md`；证据不足只能标 PARTIAL/PROTOTYPE。",
    "",
  ];

  for (const area of [...featureAreas]) {
    const group = features
      .filter((feature) => feature.area === area)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!group.length) continue;
    lines.push(
      `## ${areaLabels[area] ?? area}`,
      "",
      "| ID | 功能 | 状态 | 卡片 | 关联任务 |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const feature of group) {
      lines.push(
        `| ${feature.id} | ${cell(feature.title)} | ${feature.status}（${statusLabels[feature.status]}） | [卡片](${path.basename(feature.card)}) | ${cell(feature.tasks.join(", "))} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## 门禁",
    "",
    "- `npm run features:check` 校验：卡片状态元数据和固定章节、路径在仓库内且类型正确、任务 ID、非 REAL 关联开放任务（排除 DONE/OBSOLETE）、REAL 非空入口/代码/测试与 DONE/PASS 任务、platforms 各平台的 runtimeEvidence 文件、全部卡片登记及看板一致。",
    "- 门禁验证证据的结构与路径；证据内容、来源新鲜度和声明范围仍须独立审查，不能靠创建空文件证明真实能力。",
    "- 该检查已并入 `npm run lint` 与 `npm run verify`；新增/改动功能却不更新登记册会直接失败。",
    "",
  );
  return lines.join("\n");
}
