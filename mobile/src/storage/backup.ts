import { recoverInterruptedTask } from "@kk-studio/creation-contracts";
import {
  emptyMobileSnapshot,
  type MobileAsset,
  type MobileProject,
  type MobileSnapshot,
} from "../core/mobileModel.ts";
import {
  invariant,
  object,
  LIMITS,
  referencedAssetIds,
  validateSnapshot,
  validateAsset,
  validateMimeBytes,
  assertNoSecrets,
} from "./validation.ts";
import type { StorageValidationPolicy } from "./schemaPrimitives.ts";

const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64(bytes: Uint8Array): string {
  const parts: string[] = [];
  let chunk = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1],
      c = bytes[i + 2];
    chunk +=
      alphabet[a >> 2] +
      alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)] +
      (b === undefined ? "=" : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]) +
      (c === undefined ? "=" : alphabet[c & 63]);
    if (chunk.length >= 32768) {
      parts.push(chunk);
      chunk = "";
    }
  }
  if (chunk) parts.push(chunk);
  return parts.join("");
}
function unbase64(value: unknown): Uint8Array {
  invariant(
    typeof value === "string" &&
      value.length <= Math.ceil(LIMITS.originalBytes / 3) * 4 &&
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        value,
      ),
    "Corrupt bounded base64",
  );
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0,
    bytes = new Uint8Array((value.length / 4) * 3 - padding);
  let offset = 0;
  for (let i = 0; i < value.length; i += 4) {
    const a = alphabet.indexOf(value[i]),
      b = alphabet.indexOf(value[i + 1]),
      c = alphabet.indexOf(value[i + 2]),
      d = alphabet.indexOf(value[i + 3]);
    bytes[offset++] = (a << 2) | (b >> 4);
    if (offset < bytes.length)
      bytes[offset++] = ((b & 15) << 4) | ((c < 0 ? 0 : c) >> 2);
    if (offset < bytes.length)
      bytes[offset++] = ((c & 3) << 6) | (d < 0 ? 0 : d);
  }
  invariant(base64(bytes) === value, "Noncanonical base64");
  return bytes;
}
/** Vault references are local capabilities, not portable project data. */
function portable<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, child) =>
      ["providerCredentialRef", "credentialRef"].includes(key)
        ? undefined
        : child,
    ),
  ) as T;
}
export async function createBackup(
  snapshot: MobileSnapshot,
  project: MobileProject,
  read: (assetId: string) => Promise<Uint8Array>,
): Promise<string> {
  const wanted = referencedAssetIds(project);
  const byId = new Map(snapshot.assets.map((a) => [a.id, a]));
  const include = (assetId: string, ancestors = new Set<string>()): void => {
    const asset = byId.get(assetId);
    invariant(asset && !asset.deleting, "Backup original missing");
    invariant(!ancestors.has(assetId), "Derivative cycle");
    wanted.add(assetId);
    if (asset.parentAssetId)
      include(asset.parentAssetId, new Set([...ancestors, assetId]));
  };
  [...wanted].forEach((assetId) => include(assetId));
  const originals = [];
  let total = 0;
  for (const assetId of wanted) {
    const asset = byId.get(assetId)!;
    total += asset.size;
    invariant(
      total <= LIMITS.backupBytes / 2,
      "Backup original bytes exceed limit",
    );
    originals.push({
      asset: portable(asset),
      base64: base64(await read(assetId)),
    });
  }
  const payload = JSON.stringify({
    format: "kk-mobile-project",
    version: 1,
    project: portable(project),
    originals,
  });
  invariant(payload.length <= LIMITS.backupBytes, "Backup exceeds limit");
  assertNoSecrets(JSON.parse(payload));
  return payload;
}
export interface CheckedBackup {
  project: MobileProject;
  originals: { asset: MobileAsset; bytes: Uint8Array }[];
}
export async function preflightBackup(
  payload: string,
  hash: (bytes: Uint8Array) => Promise<string>,
  policy: StorageValidationPolicy = {},
): Promise<CheckedBackup> {
  invariant(payload.length <= LIMITS.backupBytes, "Backup exceeds limit");
  const value: unknown = JSON.parse(payload);
  object(value);
  assertNoSecrets(value);
  invariant(
    Object.keys(value).every((k) =>
      ["format", "version", "project", "originals"].includes(k),
    ) &&
      value.format === "kk-mobile-project" &&
      value.version === 1,
    "Corrupt backup schema",
  );
  invariant(
    Array.isArray(value.originals) && value.originals.length <= LIMITS.assets,
    "Corrupt backup originals",
  );
  const originals = [];
  let total = 0;
  for (const entry of value.originals) {
    object(entry);
    invariant(
      Object.keys(entry).every((k) => ["asset", "base64"].includes(k)),
      "Corrupt original entry",
    );
    validateAsset(entry.asset);
    const bytes = unbase64(entry.base64);
    total += bytes.byteLength;
    invariant(
      total <= LIMITS.backupBytes / 2,
      "Backup original bytes exceed limit",
    );
    invariant(
      bytes.byteLength === entry.asset.size &&
        (await hash(bytes)) === entry.asset.sha256,
      "Backup original hash mismatch",
    );
    originals.push({ asset: entry.asset, bytes });
  }
  const snapshot: unknown = {
    ...emptyMobileSnapshot(),
    projects: [value.project],
    assets: originals.map((o) => o.asset),
  };
  validateSnapshot(snapshot, policy);
  for (const original of originals) {
    invariant(!original.asset.deleting, "Backup includes deleting original");
    validateMimeBytes(original.bytes, original.asset.mime);
  }
  // Parent-first order, with cycles rejected before writing any original.
  const ordered: { asset: MobileAsset; bytes: Uint8Array }[] = [];
  const remaining = new Map(originals.map((o) => [o.asset.id, o]));
  while (remaining.size) {
    let progress = false;
    for (const [assetId, o] of remaining) {
      if (!o.asset.parentAssetId || !remaining.has(o.asset.parentAssetId)) {
        ordered.push(o);
        remaining.delete(assetId);
        progress = true;
      }
    }
    invariant(progress, "Corrupt derivative cycle");
  }
  return { project: snapshot.projects[0], originals: ordered };
}
export function restoredProject(
  source: MobileProject,
  nextId: () => string,
  now: number,
): MobileProject {
  const p = portable(source),
    oldId = p.id,
    map = new Map<string, string>();
  const newId = (old: string): string => {
    if (!map.has(old)) map.set(old, nextId());
    return map.get(old)!;
  };
  p.id = newId(oldId);
  const suffix = "（恢复副本）";
  p.name = `${p.name.slice(0, 200 - suffix.length)}${suffix}`;
  p.revision = 0;
  p.createdAt = now;
  p.updatedAt = now;
  p.restoredFrom = { projectId: oldId, restoredAt: now, tasks: {} };
  if (p.executionReceipts?.some((receipt) => receipt.protocol === "comfyui"))
    p.restoredFrom.originalProjectId =
      source.restoredFrom?.originalProjectId ??
      source.restoredFrom?.projectId ??
      oldId;
  for (const t of p.tasks) {
    const oldTaskId = t.id,
      oldKey = t.idempotencyKey;
    t.id = newId(oldTaskId);
    t.idempotencyKey = newId(oldKey);
    p.restoredFrom.tasks[t.id] = {
      taskId: source.restoredFrom?.tasks[oldTaskId]?.taskId ?? oldTaskId,
      idempotencyKey:
        source.restoredFrom?.tasks[oldTaskId]?.idempotencyKey ?? oldKey,
    };
  }
  for (const receipt of p.executionReceipts ?? []) {
    const oldTaskId = receipt.taskId;
    receipt.taskId = newId(oldTaskId);
    receipt.originalTaskId = receipt.originalTaskId ?? oldTaskId;
    receipt.readOnly = true;
  }
  for (const n of p.canvas.nodes) n.id = newId(n.id);
  for (const t of p.tasks) {
    if (t.sourceItemId) t.sourceItemId = newId(t.sourceItemId);
    if (t.resultItemId) t.resultItemId = newId(t.resultItemId);
    if (t.retryOfTaskId) t.retryOfTaskId = newId(t.retryOfTaskId);
    if (t.batchId) t.batchId = newId(t.batchId);
    if (t.imageEdit) t.imageEdit.groupId = newId(t.imageEdit.groupId);
    delete t.providerConnectionId;
    for (const a of t.attachments) a.id = newId(a.id);
    Object.assign(t, recoverInterruptedTask(t, now));
  }
  for (const m of p.messages) {
    m.id = newId(m.id);
    m.projectId = p.id;
    m.conversationId = newId(m.conversationId);
    if (m.taskId) m.taskId = newId(m.taskId);
    if (m.editedFromId) m.editedFromId = newId(m.editedFromId);
  }
  for (const n of p.canvas.nodes) if (n.taskId) n.taskId = newId(n.taskId);
  for (const e of p.canvas.edges) {
    e.id = newId(e.id);
    e.source = newId(e.source);
    e.target = newId(e.target);
  }
  for (const proposal of p.canvasProposals ?? []) {
    proposal.id = newId(proposal.id);
    proposal.revision = 0;
    if (proposal.status === "pending") proposal.requiresRefresh = true;
    if (proposal.kind === "generation") {
      delete proposal.draft.providerConnectionId;
      for (const attachment of proposal.draft.attachments)
        attachment.id = newId(attachment.id);
    } else
      for (const operation of proposal.operations) {
        if (operation.type === "add_node") {
          operation.node.id = newId(operation.node.id);
          if (operation.node.taskId)
            operation.node.taskId = newId(operation.node.taskId);
        } else if (operation.type === "add_edge") {
          operation.edge.id = newId(operation.edge.id);
          operation.edge.source = newId(operation.edge.source);
          operation.edge.target = newId(operation.edge.target);
        } else if ("nodeId" in operation)
          operation.nodeId = newId(operation.nodeId);
        else if (operation.type === "remove_edge")
          operation.edgeId = newId(operation.edgeId);
      }
  }
  p.composerDraft.updatedAt = now;
  delete p.composerDraft.providerConnectionId;
  for (const a of p.composerDraft.attachments) a.id = newId(a.id);
  return p;
}
