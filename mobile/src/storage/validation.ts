import type { CreationTask } from "@kk-studio/creation-contracts";
import type {
  MobileSnapshot,
  MobileProject,
  MobileAsset,
  MobileConnectionMetadata,
} from "../core/mobileModel.ts";
import {
  LIMITS,
  invariant,
  object,
  id,
  text,
  integer,
  array,
  keys,
  assertNoSecrets,
  validateUrl,
} from "./schemaPrimitives.ts";
import { validateDraft, validateTask } from "./creationValidation.ts";
import { validateExecutionReceipts } from "./executionReceipts.ts";
import { validateRetryLink } from "./taskMutation.ts";
import { validateCanvas, applyCanvasOperations } from "./canvasOperations.ts";
import { validateLibrary, validateProposal } from "./localSchema.ts";
import {
  MAX_MOBILE_TEXT_RESULT_CHARS,
  utf8ByteLength,
} from "../core/resultLimits.ts";
import {
  StoragePolicyError,
  type StorageValidationPolicy,
} from "./schemaPrimitives.ts";
export {
  LIMITS,
  invariant,
  object,
  id,
  assertNoSecrets,
  validateUrl,
} from "./schemaPrimitives.ts";
export { validateDraft, validateTask } from "./creationValidation.ts";
export function validateConnection(
  value: unknown,
  policy: StorageValidationPolicy = {},
): asserts value is MobileConnectionMetadata {
  object(value);
  invariant(
    Object.keys(value).every((k) =>
      [
        "id",
        "name",
        "provider",
        "baseUrl",
        "credentialRef",
        "protocol",
        "capabilities",
      ].includes(k),
    ),
    "Unexpected connection metadata",
  );
  id(value.id);
  text(value.name, 200);
  text(value.provider, 200);
  validateUrl(value.baseUrl, policy);
  if (value.credentialRef !== undefined) id(value.credentialRef);
  invariant(
    value.protocol === undefined ||
      value.protocol === "openai-compatible" ||
      value.protocol === "kk-image-jobs" ||
      value.protocol === "comfyui",
    "Corrupt connection protocol",
  );
  if (value.capabilities !== undefined) {
    object(value.capabilities);
    keys(value.capabilities, ["text", "image", "maxOutputs", "imageSizes"]);
    invariant(
      typeof value.capabilities.text === "boolean" &&
        typeof value.capabilities.image === "boolean",
      "Corrupt capabilities",
    );
    if (value.capabilities.maxOutputs !== undefined) {
      integer(value.capabilities.maxOutputs);
      invariant(
        value.capabilities.maxOutputs >= 1 &&
          value.capabilities.maxOutputs <= 32,
        "Corrupt capability output limit",
      );
    }
    if (value.capabilities.imageSizes !== undefined) {
      array(value.capabilities.imageSizes, 100);
      value.capabilities.imageSizes.forEach((size) => text(size, 100));
    }
  }
}
export function validateAsset(value: unknown): asserts value is MobileAsset {
  object(value);
  keys(value, [
    "id",
    "sha256",
    "mime",
    "name",
    "size",
    "createdAt",
    "parentAssetId",
    "provenance",
    "hidden",
    "deleting",
    "favorite",
  ]);
  invariant(
    typeof value.sha256 === "string" && /^[a-f0-9]{64}$/.test(value.sha256),
    "Corrupt original hash",
  );
  invariant(
    value.id === `asset-${value.sha256.slice(0, 24)}`,
    "Corrupt asset identity",
  );
  text(value.name, 500);
  invariant(
    typeof value.mime === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(value.mime),
    "Corrupt MIME",
  );
  integer(value.size);
  invariant(
    value.size > 0 && value.size <= LIMITS.originalBytes,
    "Original size exceeds limit",
  );
  integer(value.createdAt);
  if (value.parentAssetId !== undefined) {
    id(value.parentAssetId);
    invariant(
      value.parentAssetId !== value.id,
      "Derivative must differ from its original",
    );
  }
  for (const flag of ["hidden", "deleting", "favorite"])
    invariant(
      value[flag] === undefined || typeof value[flag] === "boolean",
      "Corrupt material state",
    );
  object(value.provenance);
  keys(value.provenance, ["source", "projectId", "taskId", "model"]);
  invariant(
    ["import", "provider", "derivative"].includes(
      String(value.provenance.source),
    ),
    "Corrupt provenance",
  );
  invariant(
    value.provenance.source !== "derivative" ||
      typeof value.parentAssetId === "string",
    "Derivative requires parent original",
  );
  for (const key of ["projectId", "taskId"])
    if (value.provenance[key] !== undefined) id(value.provenance[key]);
  if (value.provenance.model !== undefined) text(value.provenance.model, 200);
}
export function referencedAssetIds(
  project: Pick<
    MobileProject,
    "assetIds" | "composerDraft" | "tasks" | "canvas" | "canvasProposals"
  >,
): Set<string> {
  const ids = new Set(project.assetIds);
  function visit(value: unknown): void {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (/AssetId$|^assetId$/.test(key) && typeof child === "string")
        ids.add(child);
      else if (key === "referenceAssetIds" && Array.isArray(child))
        child.forEach((v) => {
          if (typeof v === "string") ids.add(v);
        });
      else visit(child);
    }
  }
  visit(project.composerDraft);
  visit(project.tasks);
  visit(project.canvas);
  visit(project.canvasProposals);
  return ids;
}
export function hasUnresolvedTask(task: CreationTask): boolean {
  return (
    [
      "queued",
      "running",
      "unknown",
      "partial",
      "offline",
      "interrupted",
    ].includes(task.status) ||
    task.submissionState === "submitted" ||
    task.submissionState === "unknown" ||
    Boolean(
      task.outputs?.some((o) =>
        ["waiting", "running", "unknown"].includes(o.status),
      ),
    )
  );
}
export function validateSnapshot(
  value: unknown,
  policy: StorageValidationPolicy = {},
): asserts value is MobileSnapshot {
  object(value);
  assertNoSecrets(value);
  keys(value, [
    "schemaVersion",
    "revision",
    "projects",
    "activeProjectId",
    "connections",
    "preferences",
    "assets",
    "library",
  ]);
  invariant(value.schemaVersion === 1, "Corrupt snapshot schema");
  integer(value.revision);
  array(value.projects, LIMITS.projects);
  array(value.assets, LIMITS.assets);
  array(value.connections, 100);
  object(value.preferences);
  keys(value.preferences, ["theme"]);
  invariant(
    ["system", "light", "dark"].includes(String(value.preferences.theme)),
    "Corrupt theme",
  );
  value.connections.forEach((connection) =>
    validateConnection(connection, policy),
  );
  if (value.library !== undefined) validateLibrary(value.library);
  value.assets.forEach(validateAsset);
  const assets = new Map(
    value.assets.map((a) => [(a as MobileAsset).id, a as MobileAsset]),
  );
  invariant(assets.size === value.assets.length, "Corrupt duplicate asset");
  for (const a of assets.values())
    if (a.parentAssetId)
      invariant(
        assets.has(a.parentAssetId) &&
          a.parentAssetId !== a.id &&
          (!assets.get(a.parentAssetId)?.deleting || a.deleting),
        "Corrupt derivative parent",
      );
  const projectIds = new Set<string>(),
    taskIds = new Set<string>(),
    messageIds = new Set<string>();
  for (const p of value.projects) {
    object(p);
    keys(p, [
      "id",
      "name",
      "revision",
      "createdAt",
      "updatedAt",
      "composerDraft",
      "tasks",
      "executionReceipts",
      "messages",
      "assetIds",
      "canvas",
      "restoredFrom",
      "group",
      "pinned",
      "canvasProposals",
    ]);
    id(p.id);
    invariant(!projectIds.has(p.id), "Corrupt duplicate project");
    projectIds.add(p.id);
    text(p.name, 200);
    integer(p.revision);
    integer(p.createdAt);
    integer(p.updatedAt);
    if (p.group !== undefined) {
      text(p.group, 80);
      invariant(p.group.trim().length > 0, "Invalid project group");
    }
    invariant(
      p.pinned === undefined || typeof p.pinned === "boolean",
      "Invalid project pin",
    );
    validateDraft(p.composerDraft);
    array(p.tasks, LIMITS.tasks);
    if (p.restoredFrom !== undefined) {
      object(p.restoredFrom);
      keys(p.restoredFrom, [
        "projectId",
        "originalProjectId",
        "restoredAt",
        "tasks",
      ]);
      id(p.restoredFrom.projectId);
      if (p.restoredFrom.originalProjectId !== undefined)
        id(p.restoredFrom.originalProjectId);
      integer(p.restoredFrom.restoredAt);
      object(p.restoredFrom.tasks);
      for (const [taskId, origin] of Object.entries(p.restoredFrom.tasks)) {
        invariant(
          p.tasks.some((t) => {
            object(t);
            return t.id === taskId;
          }),
          "Corrupt restoration task",
        );
        object(origin);
        keys(origin, ["taskId", "idempotencyKey"]);
        id(origin.taskId);
        id(origin.idempotencyKey);
      }
    }
    const restoredFrom = p.restoredFrom as MobileProject["restoredFrom"];
    p.tasks.forEach((t) => {
      object(t);
      id(t.id);
      const origin = restoredFrom?.tasks[t.id];
      validateTask(
        t,
        origin
          ? { id: origin.taskId, idempotencyKey: origin.idempotencyKey }
          : undefined,
        policy,
      );
      invariant(!taskIds.has(t.id), "Corrupt duplicate task");
      taskIds.add(t.id);
    });
    const tasks = p.tasks as CreationTask[];
    tasks.forEach((task) => validateRetryLink(task, tasks));
    array(p.messages, LIMITS.messages);
    for (const m of p.messages) {
      object(m);
      keys(m, [
        "id",
        "projectId",
        "conversationId",
        "taskId",
        "model",
        "role",
        "text",
        "createdAt",
        "deletedAt",
        "editedFromId",
      ]);
      id(m.id);
      id(m.conversationId);
      invariant(m.projectId === p.id, "Corrupt message project");
      invariant(!messageIds.has(m.id), "Corrupt duplicate message");
      messageIds.add(m.id);
      invariant(
        ["user", "assistant", "system", "error"].includes(String(m.role)),
        "Corrupt message role",
      );
      text(m.text, MAX_MOBILE_TEXT_RESULT_CHARS);
      integer(m.createdAt);
      if (m.deletedAt !== undefined) integer(m.deletedAt);
      if (m.editedFromId !== undefined) {
        id(m.editedFromId);
        const source = p.messages
          .slice(0, p.messages.indexOf(m))
          .find((source) => {
            object(source);
            return source.id === m.editedFromId;
          });
        object(source);
        invariant(
          source.id !== m.id &&
            source.conversationId === m.conversationId &&
            source.role === m.role &&
            source.model === m.model &&
            source.taskId === m.taskId &&
            Number(source.createdAt) <= m.createdAt,
          "Corrupt edited message lineage",
        );
      }
      if (m.model !== undefined) text(m.model, 200);
      if (m.taskId !== undefined)
        invariant(
          tasks.some((t) => t.id === m.taskId),
          "Corrupt message task",
        );
    }
    validateCanvas(p.canvas);
    if (p.canvasProposals !== undefined) {
      array(p.canvasProposals, 200);
      const proposalIds = new Set<string>();
      for (const proposal of p.canvasProposals) {
        validateProposal(proposal);
        invariant(!proposalIds.has(proposal.id), "Duplicate proposal identity");
        proposalIds.add(proposal.id);
        if (
          proposal.kind === "canvas" &&
          proposal.status === "pending" &&
          proposal.requiresRefresh !== true &&
          proposal.baseProjectRevision === p.revision
        )
          applyCanvasOperations(p.canvas, proposal.operations);
        if (proposal.kind === "canvas")
          for (const operation of proposal.operations)
            if (
              operation.type === "add_node" &&
              operation.node.taskId !== undefined
            )
              invariant(
                tasks.some((t) => t.id === operation.node.taskId),
                "Corrupt proposal task reference",
              );
      }
    }
    validateExecutionReceipts(
      p.executionReceipts,
      tasks,
      p.restoredFrom as MobileProject["restoredFrom"],
      p.id,
      policy,
      assets,
    );
    array(p.assetIds, LIMITS.assets);
    p.assetIds.forEach(id);
    for (const n of p.canvas.nodes)
      if (n.taskId !== undefined)
        invariant(
          tasks.some((t) => t.id === n.taskId),
          "Corrupt node task",
        );
    for (const assetId of referencedAssetIds(p as unknown as MobileProject))
      invariant(
        assets.has(assetId) && !assets.get(assetId)?.deleting,
        "Original asset missing or being deleted",
      );
  }
  invariant(
    value.activeProjectId === undefined ||
      projectIds.has(String(value.activeProjectId)),
    "Corrupt active project",
  );
  invariant(
    utf8ByteLength(JSON.stringify(value)) <= LIMITS.snapshotBytes,
    "Snapshot exceeds limit",
  );
}
export function parseSnapshot(
  payload: string,
  policy: StorageValidationPolicy = {},
): MobileSnapshot {
  invariant(
    utf8ByteLength(payload) <= LIMITS.snapshotBytes,
    "Snapshot exceeds limit",
  );
  try {
    const value: unknown = JSON.parse(payload);
    validateSnapshot(value, policy);
    return value;
  } catch (error) {
    if (error instanceof StoragePolicyError) throw error;
    throw new Error(
      `Corrupt snapshot; original preserved: ${error instanceof Error ? error.message : "invalid JSON"}`,
    );
  }
}
export function validateMimeBytes(bytes: Uint8Array, mime: string): void {
  const starts = (magic: number[]) => magic.every((v, i) => bytes[i] === v);
  if (mime === "image/png")
    invariant(
      starts([137, 80, 78, 71, 13, 10, 26, 10]),
      "MIME differs from original bytes",
    );
  if (mime === "image/jpeg")
    invariant(starts([255, 216, 255]), "MIME differs from original bytes");
  if (mime === "image/gif")
    invariant(starts([71, 73, 70, 56]), "MIME differs from original bytes");
  if (mime === "image/webp")
    invariant(
      starts([82, 73, 70, 70]) &&
        bytes[8] === 87 &&
        bytes[9] === 69 &&
        bytes[10] === 66 &&
        bytes[11] === 80,
      "MIME differs from original bytes",
    );
  if (mime === "application/pdf")
    invariant(starts([37, 80, 68, 70, 45]), "MIME differs from original bytes");
}
