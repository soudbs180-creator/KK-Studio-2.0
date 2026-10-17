import type { MobileApplication } from "./application.ts";
import type { AccountContext } from "./types.ts";
import type { MobileSnapshot } from "../core/mobileModel.ts";
export function localContext(
  app: MobileApplication,
  expectedAccountId?: string,
) {
  const ctx = app.context();
  if (expectedAccountId && ctx.accountId !== expectedAccountId)
    throw new Error("会话已变化，请在原账号继续操作。");
  return ctx;
}
export async function localMutation(
  app: MobileApplication,
  ctx: AccountContext,
  operation: (
    repo: AccountContext["repo"],
    snapshot: MobileSnapshot,
  ) => Promise<MobileSnapshot>,
) {
  await app.mutate(ctx, (repo, snapshot) => {
    if (!app.valid(ctx)) throw new Error("会话已变化，操作未开始。");
    return operation(repo, snapshot);
  });
  if (!app.valid(ctx)) throw new Error("会话已变化，结果仍限定原账号。");
}
export function assertSavedDraft(app: MobileApplication, projectId: string) {
  if (app.getState().unsavedDraftProjectIds.includes(projectId))
    throw new Error("此项目有尚未核对的保留草稿，请先恢复保存。");
}
