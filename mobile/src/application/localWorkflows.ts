import type { CreationDraft } from "@kk-studio/creation-contracts";
import type {
  MobileLibraryInput,
  MobileSnapshot,
} from "../core/mobileModel.ts";
import {
  projectRevision,
  type WorkflowHost,
  type AccountContext,
  type ApplicationState,
} from "./types.ts";
import { searchSnapshot } from "./localSearch.ts";
import { LibraryEditMemory, type LibraryEdit } from "./libraryEdits.ts";
interface LocalHost extends WorkflowHost {
  getState(): ApplicationState;
  getDraft(projectId: string): CreationDraft;
  saveDraft(
    id: string,
    draft: CreationDraft,
    resolve?: boolean,
    expectedAccountId?: string,
  ): Promise<void>;
}
export interface LibraryImportPlan {
  accountId: string;
  payload: string;
  entryCount: number;
  kinds: MobileLibraryInput["kind"][];
}
export class LocalWorkflows {
  private readonly app: LocalHost;
  private readonly edits = new LibraryEditMemory();
  constructor(app: LocalHost) {
    this.app = app;
  }
  private context(expectedAccountId?: string): AccountContext {
    const ctx = this.app.context();
    if (expectedAccountId && ctx.accountId !== expectedAccountId)
      throw new Error("会话已变化，请在原账号继续操作。");
    return ctx;
  }
  private async write(
    ctx: AccountContext,
    operation: (
      repo: AccountContext["repo"],
      snapshot: MobileSnapshot,
    ) => Promise<MobileSnapshot>,
  ): Promise<void> {
    await this.app.mutate(ctx, (repo, snapshot) => {
      if (!this.app.valid(ctx)) throw new Error("会话已变化，操作未开始。");
      return operation(repo, snapshot);
    });
    if (!this.app.valid(ctx)) throw new Error("会话已变化，结果仍限定原账号。");
  }
  search(query: string) {
    return searchSnapshot(this.context().snapshot, query);
  }
  openLibraryEdit(id: string, expectedAccountId?: string): LibraryEdit {
    const ctx = this.context(expectedAccountId);
    const retained = this.edits.read(ctx.accountId, id);
    if (retained) return retained;
    const entry = ctx.snapshot.library?.find((e) => e.id === id);
    const input: MobileLibraryInput = entry
      ? { kind: entry.kind, name: entry.name, content: entry.content }
      : { kind: "prompt", name: "", content: "" };
    return {
      input,
      baseline: structuredClone(input),
      baseRevision: entry?.revision,
    };
  }
  rememberLibraryEdit(
    id: string,
    edit: LibraryEdit,
    expectedAccountId?: string,
  ): void {
    this.edits.remember(this.context(expectedAccountId).accountId, id, edit);
  }
  discardLibraryEdit(id: string, expectedAccountId?: string): void {
    this.edits.discard(this.context(expectedAccountId).accountId, id);
  }
  async saveLibraryEdit(
    id: string,
    edit: LibraryEdit,
    expectedAccountId?: string,
    saveAsNew = false,
  ): Promise<void> {
    const ctx = this.context(expectedAccountId),
      captured = structuredClone(edit);
    this.edits.remember(ctx.accountId, id, captured);
    if (id !== "new" && captured.baseRevision === undefined && !saveAsNew)
      throw new Error("原条目版本未确认，请明确另存为新条目。");
    await this.saveLibrary(
      captured.input,
      id === "new" || saveAsNew ? undefined : id,
      captured.baseRevision,
      ctx.accountId,
    );
    this.edits.acknowledge(ctx.accountId, id, captured);
  }
  async saveLibrary(
    input: MobileLibraryInput,
    id?: string,
    revision?: number,
    expectedAccountId?: string,
  ): Promise<void> {
    const ctx = this.context(expectedAccountId),
      captured = structuredClone(input);
    await this.write(ctx, (repo) =>
      id
        ? repo.local.updateLibrary(id, captured, revision ?? -1)
        : repo.local.createLibrary(captured),
    );
  }
  async deleteLibrary(
    id: string,
    revision: number,
    expectedAccountId?: string,
  ): Promise<void> {
    await this.write(this.context(expectedAccountId), (repo) =>
      repo.local.deleteLibrary(id, revision),
    );
  }
  async exportLibrary(
    ids?: string[],
    expectedAccountId?: string,
  ): Promise<string> {
    const ctx = this.context(expectedAccountId),
      payload = await ctx.repo.local.exportLibrary(ids?.slice());
    if (!this.app.valid(ctx)) throw new Error("会话已变化，导出已停止。");
    return payload;
  }
  async preflightLibrary(
    payload: string,
    expectedAccountId?: string,
  ): Promise<LibraryImportPlan> {
    const ctx = this.context(expectedAccountId),
      checked = await ctx.repo.local.preflightLibraryImport(payload);
    if (!this.app.valid(ctx)) throw new Error("会话已变化，导入预检已停止。");
    return { ...checked, accountId: ctx.accountId, payload };
  }
  async importLibrary(plan: LibraryImportPlan): Promise<void> {
    await this.write(this.context(plan.accountId), (repo) =>
      repo.local.importLibrary(plan.payload),
    );
  }
  async applyLibrary(
    id: string,
    projectId: string,
    mode: "append" | "replace",
    expectedAccountId?: string,
  ): Promise<void> {
    const ctx = this.context(expectedAccountId),
      entry = ctx.snapshot.library?.find((e) => e.id === id);
    if (!entry) throw new Error("创作库记录不存在。");
    if (this.app.getState().unsavedDraftProjectIds.includes(projectId))
      throw new Error("保留草稿尚未核对，请先恢复保存。");
    const draft = this.app.getDraft(projectId),
      prefix =
        entry.kind === "role"
          ? `角色说明：${entry.name}\n`
          : entry.kind === "skill-instruction"
            ? `Skill 指令：${entry.name}\n`
            : "";
    const content = prefix + entry.content;
    await this.app.saveDraft(
      projectId,
      {
        ...draft,
        prompt:
          mode === "append" && draft.prompt
            ? `${draft.prompt}\n\n${content}`
            : content,
      },
      false,
      ctx.accountId,
    );
  }
  async newProjectFromLibrary(
    id: string,
    mode: "append" | "replace",
    expectedAccountId?: string,
  ): Promise<void> {
    const ctx = this.context(expectedAccountId),
      entry = ctx.snapshot.library?.find((e) => e.id === id);
    if (!entry) throw new Error("创作库记录不存在。");
    await this.write(ctx, (repo) => repo.create(entry.name));
    await this.applyLibrary(
      id,
      ctx.snapshot.activeProjectId!,
      mode,
      ctx.accountId,
    );
  }
  async setProjectMetadata(
    id: string,
    input: { group?: string; pinned?: boolean },
    expectedAccountId?: string,
  ): Promise<void> {
    const captured = { ...input };
    await this.write(this.context(expectedAccountId), (repo, snapshot) =>
      repo.local.setProjectMetadata(
        id,
        captured,
        projectRevision(snapshot, id),
      ),
    );
  }
}
