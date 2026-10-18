import type { MobileApplication } from "./application.ts";
import { projectRevision } from "./types.ts";
import {
  localContext,
  localMutation,
  assertSavedDraft,
} from "./localMutations.ts";
export interface ProjectRestorePlan {
  accountId: string;
  payload: string;
  projectName: string;
  taskCount: number;
  assetCount: number;
  originalBytes: number;
}
export interface MessageEdit {
  text: string;
  revision: number;
}
export class ProjectWorkflows {
  private readonly app: MobileApplication;
  private readonly messageEdits = new Map<string, MessageEdit>();
  constructor(app: MobileApplication) {
    this.app = app;
  }
  private editKey(scope: string, projectId: string, messageId: string) {
    return JSON.stringify([scope, projectId, messageId]);
  }
  openMessageEdit(
    projectId: string,
    messageId: string,
    scope?: string,
  ): MessageEdit {
    const ctx = localContext(this.app, scope),
      key = this.editKey(ctx.accountId, projectId, messageId);
    const retained = this.messageEdits.get(key);
    if (retained) return { ...retained };
    const project = ctx.snapshot.projects.find((p) => p.id === projectId),
      message = project?.messages.find((m) => m.id === messageId);
    if (!project || !message || message.deletedAt !== undefined)
      throw new Error("消息不存在或已移除。");
    return { text: message.text, revision: project.revision };
  }
  rememberMessageEdit(
    projectId: string,
    messageId: string,
    edit: MessageEdit,
    scope?: string,
  ) {
    const ctx = localContext(this.app, scope);
    this.messageEdits.set(this.editKey(ctx.accountId, projectId, messageId), {
      ...edit,
    });
  }
  discardMessageEdit(projectId: string, messageId: string, scope?: string) {
    const ctx = localContext(this.app, scope);
    this.messageEdits.delete(this.editKey(ctx.accountId, projectId, messageId));
  }
  async saveMessageEdit(
    projectId: string,
    messageId: string,
    edit: MessageEdit,
    scope?: string,
  ): Promise<string> {
    const ctx = localContext(this.app, scope),
      captured = { ...edit },
      key = this.editKey(ctx.accountId, projectId, messageId);
    this.messageEdits.set(key, captured);
    let createdId = "";
    await localMutation(this.app, ctx, async (repo) => {
      const result = await repo.local.editMessage(
        projectId,
        messageId,
        captured.text,
        captured.revision,
      );
      const messages = result.projects.find(
        (p) => p.id === projectId,
      )!.messages;
      createdId = messages[messages.length - 1].id;
      return result;
    });
    if (JSON.stringify(this.messageEdits.get(key)) === JSON.stringify(captured))
      this.messageEdits.delete(key);
    return createdId;
  }
  async editMessage(
    projectId: string,
    messageId: string,
    text: string,
    revision: number,
    scope?: string,
  ) {
    await localMutation(this.app, localContext(this.app, scope), (repo) =>
      repo.local.editMessage(projectId, messageId, text, revision),
    );
  }
  async deleteMessage(
    projectId: string,
    messageId: string,
    revision: number,
    scope?: string,
  ) {
    await localMutation(this.app, localContext(this.app, scope), (repo) =>
      repo.local.deleteMessage(projectId, messageId, revision),
    );
  }
  exportText(projectId: string, scope?: string): string {
    const ctx = localContext(this.app, scope);
    const project = ctx.snapshot.projects.find((p) => p.id === projectId);
    if (!project) throw new Error("项目不存在。");
    return [
      project.name,
      ...project.messages
        .filter((m) => m.deletedAt === undefined)
        .map(
          (m) =>
            `${new Date(m.createdAt).toISOString()} · ${m.role}${m.model ? ` · ${m.model}` : ""}\n${m.text}`,
        ),
    ].join("\n\n");
  }
  async backup(projectId: string, scope?: string): Promise<string> {
    const ctx = localContext(this.app, scope);
    assertSavedDraft(this.app, projectId);
    const payload = await ctx.repo.backup(projectId);
    if (!this.app.valid(ctx)) throw new Error("会话已变化，导出已停止。");
    return payload;
  }
  async preflight(
    payload: string,
    scope?: string,
  ): Promise<ProjectRestorePlan> {
    const ctx = localContext(this.app, scope),
      checked = await ctx.repo.preflightRestore(payload);
    if (!this.app.valid(ctx)) throw new Error("会话已变化，恢复预检已停止。");
    return { ...checked, accountId: ctx.accountId, payload };
  }
  async restore(plan: ProjectRestorePlan): Promise<void> {
    await localMutation(
      this.app,
      localContext(this.app, plan.accountId),
      (repo) => repo.restore(plan.payload),
    );
  }
  async fork(projectId: string, scope?: string): Promise<void> {
    const ctx = localContext(this.app, scope);
    assertSavedDraft(this.app, projectId);
    await localMutation(this.app, ctx, (repo, snapshot) =>
      repo.local.forkProject(projectId, projectRevision(snapshot, projectId)),
    );
  }
}
