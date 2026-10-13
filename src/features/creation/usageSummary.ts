import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type {
  CreationProject,
  CreationTask,
  CreationTaskOutput,
} from "./model.ts";
import { normalizeTaskCostReceipt, type TaskCostReceipt } from "./taskState.ts";

type OutputKind = "image" | "video" | "text";
const ASSET_ID = /^asset-[a-f0-9]{24}$/;

export interface UsageSummary {
  projectCount: number;
  taskCount: number;
  succeededTasks: number;
  failedTasks: number;
  unfinishedTasks: number;
  cancelledTasks: number;
  outputs: Record<OutputKind, number>;
  unreportedOutputs: Record<OutputKind, boolean>;
  actualUsd?: number;
  receiptCount: number;
}

function archivedResult(item: CanvasCollectionItem | undefined): boolean {
  if (
    !item ||
    item.result?.source !== "provider" ||
    item.result.kind !== item.kind
  )
    return false;
  return item.kind === "text"
    ? Boolean(
        item.result.text?.trim() &&
        new TextEncoder().encode(item.result.text).length <= 32768,
      )
    : (item.kind === "image" || item.kind === "video") &&
        ASSET_ID.test(item.assetId ?? "");
}

function matchesOutput(
  item: CanvasCollectionItem | undefined,
  output: CreationTaskOutput,
): boolean {
  if (!item || !archivedResult(item)) return false;
  return item.kind === "text"
    ? item.result?.text === output.text
    : item.assetId === output.assetId;
}

interface OutputUsage {
  projectId: string;
  items: ReadonlyMap<string, CanvasCollectionItem>;
  counted: Set<string>;
  summary: UsageSummary;
}

function recordActualReceipt(
  task: CreationTask,
  receipts: Map<string, TaskCostReceipt | null>,
): void {
  const receipt = normalizeTaskCostReceipt(
    task.actualCostReceipt,
    task,
    "actual",
  );
  if (receipt?.source === "provider" && receipt.currency === "USD") {
    const key = JSON.stringify([receipt.providerId, receipt.receiptId]);
    const previous = receipts.get(key);
    if (!receipts.has(key)) receipts.set(key, receipt);
    else if (
      previous &&
      (previous.amount !== receipt.amount ||
        previous.taskId !== receipt.taskId ||
        previous.idempotencyKey !== receipt.idempotencyKey)
    )
      receipts.set(key, null);
  }
}

function countArchivedCard(
  item: CanvasCollectionItem | undefined,
  kind: OutputKind,
  usage: OutputUsage,
): void {
  if (item && item.kind === kind && !usage.counted.has(item.id)) {
    usage.counted.add(item.id);
    usage.summary.outputs[kind]++;
  }
}

function countReportedOutputs(
  task: CreationTask,
  kind: OutputKind,
  legacy: CanvasCollectionItem | undefined,
  usage: OutputUsage,
): void {
  const outputs = task.outputs!;
  if (
    (task.status === "succeeded" || task.status === "partial") &&
    !outputs.some((output) => output.status === "succeeded") &&
    legacy?.result?.source !== "demo"
  )
    usage.summary.unreportedOutputs[kind] = true;
  for (const output of outputs) {
    if (output.status !== "succeeded") continue;
    const item = usage.items.get(
      usage.projectId + "-" + task.id + "-result-" + (output.index + 1),
    );
    if (item?.kind === kind && matchesOutput(item, output)) {
      countArchivedCard(item, kind, usage);
    } else if (legacy?.kind === kind && matchesOutput(legacy, output)) {
      countArchivedCard(legacy, kind, usage);
    } else if (
      item?.result?.source !== "demo" &&
      legacy?.result?.source !== "demo"
    )
      usage.summary.unreportedOutputs[kind] = true;
  }
}

function countTaskOutputs(task: CreationTask, usage: OutputUsage): void {
  if (task.kind !== "image" && task.kind !== "video" && task.kind !== "text")
    return;
  const kind = task.kind;
  const legacy = task.resultItemId
    ? usage.items.get(task.resultItemId)
    : undefined;
  if (task.outputs?.length) {
    countReportedOutputs(task, kind, legacy, usage);
  } else if (task.status === "succeeded" || task.status === "partial") {
    if (legacy?.kind === kind && archivedResult(legacy)) {
      countArchivedCard(legacy, kind, usage);
      if (task.completedOutputs > 1)
        usage.summary.unreportedOutputs[kind] = true;
    } else if (legacy?.result?.source !== "demo") {
      usage.summary.unreportedOutputs[kind] = true;
    }
  }
}

/** Count stored result cards; retry receipts and shared asset bytes are not extra cards. */
export function summarizeUsage(
  projects: readonly CreationProject[],
): UsageSummary {
  const summary: UsageSummary = {
    projectCount: projects.length,
    taskCount: 0,
    succeededTasks: 0,
    failedTasks: 0,
    unfinishedTasks: 0,
    cancelledTasks: 0,
    outputs: { image: 0, video: 0, text: 0 },
    unreportedOutputs: { image: false, video: false, text: false },
    receiptCount: 0,
  };
  const receipts = new Map<string, TaskCostReceipt | null>();
  for (const project of projects) {
    const usage: OutputUsage = {
      projectId: project.id,
      items: new Map(project.items.map((item) => [item.id, item])),
      counted: new Set<string>(),
      summary,
    };
    for (const task of project.tasks) {
      summary.taskCount++;
      if (task.status === "succeeded") summary.succeededTasks++;
      else if (task.status === "failed") summary.failedTasks++;
      else if (task.status === "cancelled") summary.cancelledTasks++;
      else summary.unfinishedTasks++;
      recordActualReceipt(task, receipts);
      countTaskOutputs(task, usage);
    }
  }
  let total = 0;
  for (const receipt of receipts.values()) {
    if (!receipt) continue;
    summary.receiptCount++;
    total += receipt.amount;
  }
  if (summary.receiptCount && Number.isFinite(total)) summary.actualUsd = total;
  return summary;
}
