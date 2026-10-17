import {
  recoverInterruptedTask,
  type CreationDraft,
  type CreationTask,
} from "@kk-studio/creation-contracts";
import {
  newMobileDraft,
  type MobileSnapshot,
  type MobileProject,
  type MobileMessage,
  type MobileAsset,
  type MobileConnectionMetadata,
  type MobileExecutionReceipt,
} from "../core/mobileModel.ts";
import type { RepositoryOptions, OriginalInput } from "./ports.ts";
import {
  invariant,
  validateSnapshot,
  parseSnapshot,
  validateDraft,
  validateAsset,
  validateMimeBytes,
  hasUnresolvedTask,
  referencedAssetIds,
  LIMITS,
} from "./validation.ts";
import { createBackup, preflightBackup, restoredProject } from "./backup.ts";
import { validateRetryLink, validateTaskUpdate } from "./taskMutation.ts";
import { applyExecutionReceipt } from "./executionReceipts.ts";
import { verifyTaskOriginals } from "./taskArchiveValidation.ts";
import type { StorageValidationPolicy } from "./schemaPrimitives.ts";
import { MobileLocalRepository } from "./localRepository.ts";
import { initializeSnapshot } from "./initializeSnapshot.ts";
import { RepositoryLifetime } from "./repositoryLifetime.ts";
import { serializeSnapshot } from "./snapshotSerialization.ts";

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export class MobileRepository {
  readonly local: MobileLocalRepository;
  private readonly options: RepositoryOptions;
  private readonly policy: StorageValidationPolicy;
  private snapshot: MobileSnapshot | null = null;
  private frozen = true;
  private started = false;
  private readonly lifetime: RepositoryLifetime;
  constructor(options: RepositoryOptions) {
    invariant(
      options.accountId.trim().length > 0 && options.accountId.length <= 200,
      "Account identity required",
    );
    this.options = { ...options };
    this.lifetime = new RepositoryLifetime(options.close);
    this.policy = { allowLoopbackHttp: options.allowLoopbackHttp === true };
    this.local = new MobileLocalRepository({
      mutate: (work) => this.mutate(work),
      snapshot: () => copy(this.ready()),
      check: (snapshot) => validateSnapshot(snapshot, this.policy),
      readOriginal: (id) => this.readOriginal(id),
      id: options.id,
      now: options.now,
      fork: async (id, revision) => {
        this.project(this.ready(), id, revision);
        return this.restore(await this.backup(id));
      },
    });
  }
  /** Explicit first-use initialization only; existing/corrupt data is never replaced. */
  initialize(): Promise<MobileSnapshot> {
    return this.serial(() => this.loadSnapshot(true));
  }
  /** Startup recovers intent vs submission uncertainty once; routine rereads do not stop live jobs. */
  load(): Promise<MobileSnapshot> {
    return this.serial(() => this.loadSnapshot());
  }
  private async loadSnapshot(
    initializeMissing = false,
  ): Promise<MobileSnapshot> {
    try {
      if (initializeMissing)
        await initializeSnapshot(this.options, (s) =>
          this.serializeSnapshot(s),
        );
      const payload = await this.options.backend.read(this.options.accountId);
      invariant(
        payload !== null,
        "Snapshot missing; explicit initialize required",
      );
      const snapshot = parseSnapshot(payload, this.policy);
      if (!this.started) {
        let changed = false;
        for (const p of snapshot.projects) {
          const tasks = p.tasks.map((t) => {
            const next = recoverInterruptedTask(t, this.options.now());
            changed ||= next !== t;
            return next;
          });
          if (tasks.some((t, i) => t !== p.tasks[i])) {
            p.tasks = tasks;
            p.revision++;
            p.updatedAt = this.options.now();
          }
        }
        if (changed) {
          const revision = snapshot.revision++;
          if (
            !(await this.options.backend.compareAndSwap(
              this.options.accountId,
              revision,
              this.serializeSnapshot(snapshot),
            ))
          )
            throw new Error(
              "Revision conflict during recovery; reread required",
            );
        }
      }
      this.snapshot = snapshot;
      this.frozen = false;
      this.started = true;
      return copy(snapshot);
    } catch (error) {
      this.frozen = true;
      throw error;
    }
  }
  private ready(): MobileSnapshot {
    this.lifetime.assertOpen();
    invariant(
      !this.frozen && this.snapshot,
      "Storage frozen; successful load required before writing",
    );
    return this.snapshot;
  }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    return this.lifetime.run(work);
  }
  dispose(): Promise<void> {
    return this.lifetime.dispose();
  }
  private serializeSnapshot(snapshot: MobileSnapshot): string {
    return serializeSnapshot(snapshot);
  }
  private async commit(next: MobileSnapshot): Promise<MobileSnapshot> {
    const current = this.ready();
    const expectedRevision = next.revision;
    validateSnapshot(next, this.policy);
    next.revision = expectedRevision + 1;
    const payload = this.serializeSnapshot(next);
    try {
      invariant(
        current.revision === expectedRevision,
        "Revision conflict; stale clone preserved, reread required",
      );
      if (
        !(await this.options.backend.compareAndSwap(
          this.options.accountId,
          expectedRevision,
          payload,
        ))
      )
        throw new Error(
          "Revision conflict; content preserved, reread required",
        );
      const readback = await this.options.backend.read(this.options.accountId);
      invariant(readback === payload, "Durable readback mismatch");
    } catch (error) {
      this.frozen = true;
      throw error;
    }
    this.snapshot = next;
    return copy(next);
  }
  private mutate(
    work: (snapshot: MobileSnapshot) => void | Promise<void>,
  ): Promise<MobileSnapshot> {
    return this.serial(async () => {
      const next = copy(this.ready());
      await work(next);
      return this.commit(next);
    });
  }
  private project(
    snapshot: MobileSnapshot,
    projectId: string,
    revision?: number,
  ): MobileProject {
    const p = snapshot.projects.find((p) => p.id === projectId);
    invariant(p, "Project missing");
    if (revision !== undefined)
      invariant(p.revision === revision, "Project revision conflict");
    return p;
  }
  private touch(project: MobileProject): void {
    project.revision++;
    project.updatedAt = this.options.now();
  }
  async create(name: string): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      const now = this.options.now();
      const p: MobileProject = {
        id: this.options.id(),
        name: name.trim() || "新创作",
        revision: 0,
        createdAt: now,
        updatedAt: now,
        composerDraft: newMobileDraft(now),
        tasks: [],
        messages: [],
        assetIds: [],
        canvas: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      };
      s.projects.push(p);
      s.activeProjectId = p.id;
    });
  }
  async open(projectId: string): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      this.project(s, projectId);
      s.activeProjectId = projectId;
    });
  }
  async rename(
    projectId: string,
    name: string,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      const p = this.project(s, projectId, expectedRevision);
      invariant(name.trim().length > 0, "Project name required");
      p.name = name.trim();
      this.touch(p);
    });
  }
  async delete(
    projectId: string,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      const p = this.project(s, projectId, expectedRevision);
      invariant(
        !p.tasks.some(hasUnresolvedTask),
        "Project contains unresolved tasks",
      );
      s.projects = s.projects.filter((p) => p.id !== projectId);
      if (s.activeProjectId === projectId)
        s.activeProjectId = s.projects[0]?.id;
    });
  }
  async saveDraft(
    projectId: string,
    draft: CreationDraft,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      validateDraft(draft);
      const p = this.project(s, projectId, expectedRevision);
      p.composerDraft = {
        ...copy(draft),
        updatedAt: Math.max(
          draft.updatedAt,
          this.options.now(),
          p.composerDraft.updatedAt + 1,
        ),
      };
      this.touch(p);
    });
  }
  /** A failed submission restores its captured draft only while no newer edit exists. */
  async restoreDraft(
    projectId: string,
    draft: CreationDraft,
    capturedUpdatedAt: number,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      const p = this.project(s, projectId, expectedRevision);
      invariant(
        p.composerDraft.updatedAt === capturedUpdatedAt,
        "Newer draft exists; captured input preserved in task",
      );
      validateDraft(draft);
      p.composerDraft = copy(draft);
      this.touch(p);
    });
  }
  async appendTask(
    projectId: string,
    task: CreationTask,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate(async (s) => {
      const p = this.project(s, projectId, expectedRevision);
      validateRetryLink(task, p.tasks, true);
      await verifyTaskOriginals(
        task,
        (id) => this.readOriginal(id),
        undefined,
        undefined,
        this.policy,
      );
      invariant(
        !s.projects.some((p) => p.tasks.some((t) => t.id === task.id)),
        "Duplicate task identity",
      );
      p.tasks.push(copy(task));
      this.touch(p);
    });
  }
  async updateTask(
    projectId: string,
    task: CreationTask,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate(async (s) => {
      const p = this.project(s, projectId, expectedRevision),
        index = p.tasks.findIndex((t) => t.id === task.id);
      invariant(index >= 0, "Task missing");
      const previous = p.tasks[index];
      validateTaskUpdate(previous, task);
      const origin = p.restoredFrom?.tasks[task.id];
      await verifyTaskOriginals(
        task,
        (id) => this.readOriginal(id),
        previous,
        origin
          ? { id: origin.taskId, idempotencyKey: origin.idempotencyKey }
          : undefined,
        this.policy,
      );
      p.tasks[index] = copy(task);
      this.touch(p);
    });
  }
  async appendMessage(
    projectId: string,
    message: MobileMessage,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      const p = this.project(s, projectId, expectedRevision);
      p.messages.push(copy(message));
      this.touch(p);
    });
  }
  async saveExecutionReceipt(
    projectId: string,
    receipt: MobileExecutionReceipt,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      const p = this.project(s, projectId, expectedRevision);
      applyExecutionReceipt(s, p, receipt, this.policy);
      this.touch(p);
    });
  }
  async saveCanvas(
    projectId: string,
    canvas: MobileProject["canvas"],
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      const p = this.project(s, projectId, expectedRevision);
      p.canvas = copy(canvas);
      this.touch(p);
    });
  }
  async saveConnections(
    connections: MobileConnectionMetadata[],
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      s.connections = copy(connections);
    });
  }
  async savePreferences(
    preferences: MobileSnapshot["preferences"],
  ): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      s.preferences = copy(preferences);
    });
  }
  async storeOriginal(input: OriginalInput): Promise<MobileAsset> {
    return this.serial(async () => {
      const s = copy(this.ready());
      invariant(
        input.bytes.byteLength > 0 &&
          input.bytes.byteLength <= LIMITS.originalBytes,
        "Original size exceeds limit",
      );
      const bytes = input.bytes.slice();
      const sha256 = await this.options.hash(bytes);
      const asset: MobileAsset = {
        id: `asset-${sha256.slice(0, 24)}`,
        sha256,
        mime: input.mime,
        name: input.name,
        size: bytes.byteLength,
        createdAt: this.options.now(),
        provenance: copy(input.provenance),
        ...(input.parentAssetId ? { parentAssetId: input.parentAssetId } : {}),
      };
      validateAsset(asset);
      validateMimeBytes(bytes, asset.mime);
      const existing = s.assets.find((a) => a.id === asset.id);
      if (existing) {
        invariant(
          existing.sha256 === sha256 &&
            existing.mime === asset.mime &&
            !existing.deleting,
          "Original identity collision or deletion pending",
        );
        await this.readOriginal(existing.id);
        return copy(existing);
      }
      if (asset.parentAssetId) {
        invariant(
          s.assets.some((a) => a.id === asset.parentAssetId && !a.deleting),
          "Parent original missing",
        );
        await this.readOriginal(asset.parentAssetId);
      }
      // Bytes precede metadata publication. If metadata save fails, immutable orphan bytes remain recoverable.
      try {
        await this.options.originalStore.write(
          this.options.accountId,
          asset.id,
          bytes,
        );
      } catch (error) {
        let orphan: Uint8Array;
        try {
          orphan = await this.options.originalStore.read(
            this.options.accountId,
            asset.id,
          );
        } catch {
          throw error;
        }
        invariant(
          (await this.options.hash(orphan)) === sha256,
          "Original write failed or conflicting orphan",
        );
      }
      const stored = await this.options.originalStore.read(
        this.options.accountId,
        asset.id,
      );
      invariant(
        stored.byteLength === asset.size &&
          (await this.options.hash(stored)) === sha256,
        "Original hash readback failed",
      );
      s.assets.push(asset);
      await this.commit(s);
      return copy(asset);
    });
  }
  async readOriginal(assetId: string): Promise<Uint8Array> {
    const asset = this.ready().assets.find((a) => a.id === assetId);
    invariant(
      asset && !asset.deleting,
      "Original asset missing or deletion pending",
    );
    const bytes = await this.options.originalStore.read(
      this.options.accountId,
      assetId,
    );
    invariant(
      bytes.byteLength === asset.size &&
        (await this.options.hash(bytes)) === asset.sha256,
      "Original hash corruption; bytes preserved",
    );
    validateMimeBytes(bytes, asset.mime);
    return bytes;
  }
  async attachMaterial(
    projectId: string,
    assetId: string,
    expectedRevision: number,
  ): Promise<MobileSnapshot> {
    return this.mutate(async (s) => {
      const p = this.project(s, projectId, expectedRevision);
      await this.readOriginal(assetId);
      if (!p.assetIds.includes(assetId)) p.assetIds.push(assetId);
      this.touch(p);
    });
  }
  async removeMaterial(assetId: string): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      const a = s.assets.find((a) => a.id === assetId);
      invariant(a && !a.deleting, "Material missing");
      a.hidden = true;
    });
  }
  async removeMaterials(assetIds: string[]): Promise<MobileSnapshot> {
    return this.mutate((s) => {
      for (const assetId of assetIds) {
        const a = s.assets.find((a) => a.id === assetId);
        invariant(a && !a.deleting, "Material missing");
        a.hidden = true;
      }
    });
  }
  async deleteOriginal(assetId: string): Promise<MobileSnapshot> {
    return this.deleteOriginals([assetId]);
  }
  async deleteOriginals(assetIds: string[]): Promise<MobileSnapshot> {
    return this.serial(async () => {
      let s = copy(this.ready());
      const selected = new Set(assetIds);
      invariant(
        selected.size > 0 && selected.size <= LIMITS.assets,
        "Select bounded original batch",
      );
      const assets = [...selected].map((assetId) => {
        const asset = s.assets.find((a) => a.id === assetId);
        invariant(asset, "Original missing");
        return asset;
      });
      for (const assetId of selected)
        invariant(
          !s.projects.some((p) => referencedAssetIds(p).has(assetId)) &&
            !s.assets.some(
              (a) => a.parentAssetId === assetId && !selected.has(a.id),
            ),
          "Original is referenced by project, task, draft or derivative",
        );
      // Reservation CAS prevents another repository from publishing a new reference during physical deletion.
      if (assets.some((a) => !a.deleting)) {
        assets.forEach((a) => {
          a.deleting = true;
        });
        await this.commit(s);
      }
      for (const assetId of selected)
        await this.options.originalStore.remove(
          this.options.accountId,
          assetId,
        );
      s = copy(this.ready());
      s.assets = s.assets.filter((a) => !selected.has(a.id));
      return this.commit(s);
    });
  }
  async backup(projectId: string): Promise<string> {
    const s = copy(this.ready());
    return createBackup(s, this.project(s, projectId), (assetId) =>
      this.readOriginal(assetId),
    );
  }
  async preflightRestore(payload: string): Promise<{
    projectName: string;
    taskCount: number;
    assetCount: number;
    originalBytes: number;
  }> {
    this.lifetime.assertOpen();
    const backup = await preflightBackup(
      payload,
      this.options.hash,
      this.policy,
    );
    return {
      projectName: backup.project.name,
      taskCount: backup.project.tasks.length,
      assetCount: backup.originals.length,
      originalBytes: backup.originals.reduce(
        (size, o) => size + o.asset.size,
        0,
      ),
    };
  }
  async restore(payload: string): Promise<MobileSnapshot> {
    const backup = await preflightBackup(
      payload,
      this.options.hash,
      this.policy,
    );
    this.ready();
    const project = restoredProject(
      backup.project,
      this.options.id,
      this.options.now(),
    );
    for (const original of backup.originals)
      await this.storeOriginal({
        bytes: original.bytes,
        mime: original.asset.mime,
        name: original.asset.name,
        parentAssetId: original.asset.parentAssetId,
        provenance: original.asset.provenance,
      });
    return this.mutate((s) => {
      s.projects.push(project);
      s.activeProjectId = project.id;
    });
  }
}
