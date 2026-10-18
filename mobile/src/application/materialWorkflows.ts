import type { MobileApplication } from "./application.ts";
import { referencedAssetIds } from "../storage/validation.ts";
import { localContext, localMutation } from "./localMutations.ts";
import type { MobileRepository } from "../storage/repository.ts";
import type { MobileAsset } from "../core/mobileModel.ts";
import { getProposalWorkflows } from "./proposalWorkflows.ts";
export interface ShareableOriginal {
  asset: MobileAsset;
  bytes: Uint8Array;
}
export interface MaterialBatchOptions {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}
export class MaterialWorkflows {
  private readonly app: MobileApplication;
  constructor(app: MobileApplication) {
    this.app = app;
  }
  async originalForShare(
    id: string,
    scope?: string,
  ): Promise<ShareableOriginal> {
    const ctx = localContext(this.app, scope),
      snapshot = await ctx.repo.load();
    if (!this.app.valid(ctx)) throw new Error("会话已变化，分享已停止。");
    const asset = snapshot.assets.find((a) => a.id === id && !a.deleting);
    if (!asset) throw new Error("原件不存在或正在删除。");
    const bytes = await ctx.repo.readOriginal(id);
    if (!this.app.valid(ctx)) throw new Error("会话已变化，分享已停止。");
    return { asset, bytes };
  }
  deletionReason(ids: string[], scope?: string): string | undefined {
    const ctx = localContext(this.app, scope),
      selected = new Set(ids);
    if (!selected.size) return "请先选择素材。";
    const retained = getProposalWorkflows(this.app).retainedAssetIds(
      ctx.accountId,
    );
    if ([...selected].some((id) => retained.has(id)))
      return "原件被尚未暂存的保留画布编辑引用，请先暂存或明确放弃此编辑。";
    const names = ctx.snapshot.projects
      .filter((p) => [...selected].some((id) => referencedAssetIds(p).has(id)))
      .map((p) => p.name);
    if (names.length)
      return `原件被项目、任务、草稿或待批准提案引用：${names.join("、")}。可仅从列表移除。`;
    if (
      ctx.snapshot.assets.some(
        (a) =>
          a.parentAssetId &&
          selected.has(a.parentAssetId) &&
          !selected.has(a.id),
      )
    )
      return "原件仍被未选中的衍生作品引用，可仅从列表移除。";
    return undefined;
  }
  async favorite(
    ids: string[],
    favorite: boolean,
    scope?: string,
    options: MaterialBatchOptions = {},
  ): Promise<void> {
    const ctx = localContext(this.app, scope),
      captured = [...new Set(ids)];
    if (!captured.length) throw new Error("请先选择素材。");
    for (const [index, id] of captured.entries()) {
      if (options.signal?.aborted)
        throw new Error("已停止后续操作，已保存的变更保留。");
      await localMutation(this.app, ctx, (repo) =>
        repo.local.setAssetFavorite(id, favorite),
      );
      options.onProgress?.(index + 1, captured.length);
    }
  }
  async share(
    ids: string[],
    adapter: (repo: MobileRepository, id: string) => Promise<void>,
    scope?: string,
    options: MaterialBatchOptions = {},
  ) {
    const ctx = localContext(this.app, scope),
      captured = [...new Set(ids)];
    if (!captured.length) throw new Error("请先选择素材。");
    for (const [index, id] of captured.entries()) {
      if (options.signal?.aborted)
        throw new Error("已停止后续分享，已完成的文件保留。");
      if (!this.app.valid(ctx)) throw new Error("会话已变化，后续分享已停止。");
      await adapter(ctx.repo, id);
      if (!this.app.valid(ctx)) throw new Error("会话已变化，后续分享已停止。");
      options.onProgress?.(index + 1, captured.length);
    }
  }
  async remove(
    ids: string[],
    mode: "hide" | "original",
    scope?: string,
  ): Promise<void> {
    const ctx = localContext(this.app, scope),
      captured = [...new Set(ids)];
    if (mode === "original") {
      const reason = this.deletionReason(captured, ctx.accountId);
      if (reason) throw new Error(reason);
    }
    if (!captured.length) throw new Error("请先选择素材。");
    await localMutation(this.app, ctx, async (repo) => {
      if (mode === "original") {
        const reason = this.deletionReason(captured, ctx.accountId);
        if (reason) throw new Error(reason);
      }
      if (mode === "hide") return repo.removeMaterials(captured);
      const release = getProposalWorkflows(this.app).beginOriginalDeletion(
        captured,
        ctx.accountId,
      );
      try {
        return await repo.deleteOriginals(captured);
      } finally {
        release();
      }
    });
  }
}
