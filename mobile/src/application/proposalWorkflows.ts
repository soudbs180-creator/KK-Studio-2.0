import type { MobileApplication } from "./application.ts";
import type {
  MobileProposalInput,
  MobileCanvasOperation,
} from "../core/mobileModel.ts";
import {
  applyCanvasOperations,
  validateCanvasOperations,
} from "../storage/canvasOperations.ts";
import { projectRevision } from "./types.ts";
import {
  localContext,
  localMutation,
  assertSavedDraft,
} from "./localMutations.ts";
export interface CanvasEdit {
  title: string;
  operations: MobileCanvasOperation[];
  projectRevision: number;
}
const instances = new WeakMap<MobileApplication, ProposalWorkflows>();
const editMemories = new WeakMap<MobileApplication, Map<string, CanvasEdit>>();
const deletionMemories = new WeakMap<
  MobileApplication,
  Map<string, Set<string>>
>();
export function getProposalWorkflows(app: MobileApplication) {
  let value = instances.get(app);
  if (!value) {
    value = new ProposalWorkflows(app);
    instances.set(app, value);
  }
  return value;
}
export class ProposalWorkflows {
  private readonly app: MobileApplication;
  private readonly canvasEdits: Map<string, CanvasEdit>;
  private readonly originalDeletions: Map<string, Set<string>>;
  constructor(app: MobileApplication) {
    this.app = app;
    this.canvasEdits = editMemories.get(app) ?? new Map();
    editMemories.set(app, this.canvasEdits);
    this.originalDeletions = deletionMemories.get(app) ?? new Map();
    deletionMemories.set(app, this.originalDeletions);
  }
  beginOriginalDeletion(ids: string[], scope: string): () => void {
    const ctx = localContext(this.app, scope),
      retained = this.retainedAssetIds(scope);
    if (ids.some((id) => retained.has(id)))
      throw new Error("原件被尚未暂存的画布编辑引用，不能删除。");
    const locked =
      this.originalDeletions.get(ctx.accountId) ?? new Set<string>();
    if (ids.some((id) => locked.has(id)))
      throw new Error("原件正在删除，请等待原操作结束。");
    for (const id of ids) locked.add(id);
    this.originalDeletions.set(ctx.accountId, locked);
    return () => {
      for (const id of ids) locked.delete(id);
      if (!locked.size) this.originalDeletions.delete(ctx.accountId);
    };
  }
  retainedAssetIds(scope?: string): Set<string> {
    const ctx = localContext(this.app, scope),
      ids = new Set<string>();
    for (const [key, edit] of this.canvasEdits) {
      if (JSON.parse(key)[0] !== ctx.accountId) continue;
      for (const op of edit.operations)
        if (op.type === "add_node" && op.node.assetId) ids.add(op.node.assetId);
    }
    return ids;
  }
  private canvasKey(scope: string, id: string) {
    return JSON.stringify([scope, id]);
  }
  openCanvasEdit(id: string, scope?: string): CanvasEdit {
    const ctx = localContext(this.app, scope),
      retained = this.canvasEdits.get(this.canvasKey(ctx.accountId, id));
    if (retained) return structuredClone(retained);
    return {
      title: "画布编辑",
      operations: [],
      projectRevision: projectRevision(ctx.snapshot, id),
    };
  }
  rememberCanvasEdit(id: string, edit: CanvasEdit, scope?: string) {
    const ctx = localContext(this.app, scope);
    validateCanvasOperations(edit.operations);
    for (const op of edit.operations) {
      if (op.type !== "add_node" || !op.node.assetId) continue;
      const asset = ctx.snapshot.assets.find((a) => a.id === op.node.assetId);
      if (
        !asset ||
        asset.deleting ||
        this.originalDeletions.get(ctx.accountId)?.has(asset.id)
      )
        throw new Error("素材原件不存在或正在删除，输入仍保留，请重新选择。");
    }
    this.canvasEdits.set(
      this.canvasKey(ctx.accountId, id),
      structuredClone(edit),
    );
  }
  discardCanvasEdit(id: string, scope?: string) {
    const ctx = localContext(this.app, scope);
    this.canvasEdits.delete(this.canvasKey(ctx.accountId, id));
  }
  previewCanvasEdit(id: string, edit: CanvasEdit, scope?: string) {
    const ctx = localContext(this.app, scope),
      project = ctx.snapshot.projects.find((p) => p.id === id);
    if (!project) throw new Error("项目不存在。");
    return {
      canvas: applyCanvasOperations(project.canvas, edit.operations),
      stale: project.revision !== edit.projectRevision,
    };
  }
  rebaseCanvasEdit(id: string, edit: CanvasEdit, scope?: string): CanvasEdit {
    const ctx = localContext(this.app, scope);
    this.previewCanvasEdit(id, edit, ctx.accountId);
    const next = {
      ...structuredClone(edit),
      projectRevision: projectRevision(ctx.snapshot, id),
    };
    this.rememberCanvasEdit(id, next, ctx.accountId);
    return next;
  }
  async stageCanvasEdit(id: string, edit: CanvasEdit, scope?: string) {
    const ctx = localContext(this.app, scope),
      captured = structuredClone(edit),
      key = this.canvasKey(ctx.accountId, id);
    this.rememberCanvasEdit(id, captured, ctx.accountId);
    await this.stage(
      id,
      {
        kind: "canvas",
        title: captured.title,
        operations: captured.operations,
      },
      ctx.accountId,
      captured.projectRevision,
    );
    if (JSON.stringify(this.canvasEdits.get(key)) === JSON.stringify(captured))
      this.canvasEdits.delete(key);
  }
  async stage(
    projectId: string,
    input: MobileProposalInput,
    scope?: string,
    revision?: number,
  ) {
    const ctx = localContext(this.app, scope),
      captured = structuredClone(input);
    await localMutation(this.app, ctx, (repo, s) =>
      repo.local.stageProposal(
        projectId,
        captured,
        revision ?? projectRevision(s, projectId),
      ),
    );
  }
  preview(projectId: string, id: string, scope?: string) {
    return localContext(this.app, scope).repo.local.previewProposal(
      projectId,
      id,
    );
  }
  async approve(
    projectId: string,
    id: string,
    revision: number,
    baseProjectRevision: number,
    scope?: string,
  ) {
    const ctx = localContext(this.app, scope);
    const proposal = ctx.snapshot.projects
      .find((p) => p.id === projectId)
      ?.canvasProposals?.find((q) => q.id === id);
    if (!proposal) throw new Error("提案不存在。");
    if (proposal.kind === "generation") assertSavedDraft(this.app, projectId);
    await localMutation(this.app, ctx, (repo) => {
      if (proposal.kind === "generation") assertSavedDraft(this.app, projectId);
      return repo.local.approveProposal(
        projectId,
        id,
        revision,
        baseProjectRevision,
      );
    });
  }
  async refresh(
    projectId: string,
    id: string,
    revision: number,
    projectVersion: number,
    scope?: string,
  ) {
    const ctx = localContext(this.app, scope);
    const q = ctx.snapshot.projects
      .find((p) => p.id === projectId)
      ?.canvasProposals?.find((q) => q.id === id);
    if (!q) throw new Error("提案不存在。");
    const input: MobileProposalInput =
      q.kind === "canvas"
        ? {
            kind: "canvas",
            title: q.title,
            operations: structuredClone(q.operations),
          }
        : {
            kind: "generation",
            title: q.title,
            draft: structuredClone(q.draft),
          };
    await localMutation(this.app, ctx, (repo) =>
      repo.local.updateProposal(projectId, id, input, revision, projectVersion),
    );
  }
  async finish(
    projectId: string,
    id: string,
    status: "rejected" | "withdrawn",
    revision: number,
    projectVersion: number,
    scope?: string,
  ) {
    await localMutation(this.app, localContext(this.app, scope), (repo) =>
      status === "rejected"
        ? repo.local.rejectProposal(projectId, id, revision, projectVersion)
        : repo.local.withdrawProposal(projectId, id, revision, projectVersion),
    );
  }
  async stageGenerationDraft(projectId: string, title: string, scope?: string) {
    const ctx = localContext(this.app, scope);
    assertSavedDraft(this.app, projectId);
    await this.stage(
      projectId,
      { title, kind: "generation", draft: this.app.getDraft(projectId) },
      ctx.accountId,
    );
  }
}
