import type { CreationDraft } from "@kk-studio/creation-contracts";
import { projectRevision, type WorkflowHost } from "./types.ts";
interface DraftEdit {
  accountId: string;
  projectId: string;
  draft: CreationDraft;
  version: number;
  unresolved: boolean;
}
/** Failed writes stay in memory; recovery never silently overwrites a reread draft. */
export class DraftMemory {
  private edits = new Map<string, DraftEdit>();
  private sequence = 0;
  private key(accountId: string, projectId: string) {
    return JSON.stringify([accountId, projectId]);
  }
  remember(
    accountId: string,
    projectId: string,
    draft: CreationDraft,
  ): DraftEdit {
    const key = this.key(accountId, projectId),
      edit = {
        accountId,
        projectId,
        draft: structuredClone(draft),
        version: ++this.sequence,
        unresolved: this.edits.get(key)?.unresolved ?? false,
      };
    this.edits.set(key, edit);
    return edit;
  }
  read(accountId: string, projectId: string): CreationDraft | undefined {
    const edit = this.edits.get(this.key(accountId, projectId));
    return edit ? structuredClone(edit.draft) : undefined;
  }
  acknowledge(edit: DraftEdit): void {
    const key = this.key(edit.accountId, edit.projectId);
    if (this.edits.get(key)?.version === edit.version) this.edits.delete(key);
  }
  fail(edit: DraftEdit): void {
    const current = this.edits.get(this.key(edit.accountId, edit.projectId));
    if (current) current.unresolved = true;
  }
  unresolved(accountId: string): string[] {
    return [...this.edits.values()]
      .filter((e) => e.accountId === accountId && e.unresolved)
      .map((e) => e.projectId);
  }
  async save(
    host: WorkflowHost,
    id: string,
    draft: CreationDraft,
    resolveConflict = false,
    expectedAccountId?: string,
    editorEdit = false,
  ): Promise<void> {
    const ctx = host.context();
    if (expectedAccountId && expectedAccountId !== ctx.accountId)
      throw new Error("会话已变化，请在原账号恢复草稿。");
    projectRevision(ctx.snapshot, id);
    if (!resolveConflict && !editorEdit) this.assertEditable(host, id);
    const edit = this.remember(ctx.accountId, id, draft);
    try {
      if (edit.unresolved && !resolveConflict)
        throw new Error("保留草稿尚未核对，请先比较设备保存内容再恢复保存。");
      await host.mutate(ctx, (r, s) =>
        r.saveDraft(id, edit.draft, projectRevision(s, id)),
      );
      this.acknowledge(edit);
    } catch (error) {
      this.fail(edit);
      throw error;
    } finally {
      host.publish();
    }
  }
  assertEditable(host: WorkflowHost, id: string): void {
    const ctx = host.context();
    if (this.unresolved(ctx.accountId).includes(id))
      throw new Error("保留草稿尚未核对，请先比较设备保存内容再恢复保存。");
  }
  async attach(
    host: WorkflowHost,
    assetId: string,
    expectedAccountId?: string,
  ): Promise<void> {
    const ctx = host.context();
    if (expectedAccountId && expectedAccountId !== ctx.accountId)
      throw new Error("会话已变化，素材仍属于原账号。");
    if (!ctx.snapshot.activeProjectId)
      await host.mutate(ctx, (repo) => repo.create("素材创作"));
    if (!host.valid(ctx)) throw new Error("会话已变化。");
    const projectId = ctx.snapshot.activeProjectId!;
    this.assertEditable(host, projectId);
    const asset = ctx.snapshot.assets.find((a) => a.id === assetId);
    if (!asset) throw new Error("素材不存在。");
    await ctx.repo.readOriginal(asset.id);
    if (!host.valid(ctx)) throw new Error("会话已变化。");
    this.assertEditable(host, projectId);
    await host.mutate(ctx, (repo, s) =>
      repo.attachMaterial(projectId, asset.id, projectRevision(s, projectId)),
    );
    if (!host.valid(ctx)) throw new Error("会话已变化。");
    const draft = this.get(host, projectId);
    await this.save(
      host,
      projectId,
      {
        ...draft,
        attachments: [
          ...draft.attachments.filter((a) => a.assetId !== asset.id),
          {
            id: host.deps.id(),
            assetId: asset.id,
            name: asset.name,
            mime: asset.mime,
            size: asset.size,
          },
        ],
      },
      false,
      ctx.accountId,
    );
  }
  get(host: WorkflowHost, id: string): CreationDraft {
    const ctx = host.context(),
      project = ctx.snapshot.projects.find((p) => p.id === id),
      draft = project
        ? (this.read(ctx.accountId, id) ?? project.composerDraft)
        : undefined;
    if (!draft) throw new Error("项目不存在。");
    return structuredClone(draft);
  }
}
