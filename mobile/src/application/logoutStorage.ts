import type { AuthSession } from "../services/authTypes.ts";
import {
  projectRevision,
  type AccountContext,
  type WorkflowHost,
} from "./types.ts";

export async function finishStorageLogout(
  host: WorkflowHost,
  ctx: AccountContext | undefined,
  recoverySession: AuthSession | undefined,
  origin: string,
  retire: (ctx: AccountContext) => Promise<void>,
  forgetSession: () => Promise<void>,
): Promise<void> {
  let forgetFailure: { error: unknown } | undefined;
  try {
    await forgetSession();
  } catch (error) {
    forgetFailure = { error };
  }
  if (!ctx) {
    if (recoverySession)
      await host.deps
        .identity(origin)
        .logout(recoverySession.accessToken, recoverySession.deviceId)
        .catch(() => undefined);
    if (forgetFailure) throw forgetFailure.error;
    return;
  }
  try {
    for (const [id, active] of host.active) {
      if (active.context !== ctx) continue;
      const old = ctx.snapshot.projects
        .find((p) => p.id === active.projectId)
        ?.tasks.find((task) => task.id === id);
      if (!old) continue;
      try {
        await host.mutate(ctx, (repo, snapshot) =>
          repo.updateTask(
            active.projectId,
            {
              ...old,
              status: "unknown",
              submissionState: "unknown",
              error: "退出登录时受理状态未确认，请核对供应商。",
              updatedAt: host.deps.now(),
              outputs: old.outputs?.map((output) =>
                output.status === "succeeded"
                  ? output
                  : { ...output, status: "unknown" },
              ),
            },
            projectRevision(snapshot, active.projectId),
          ),
        );
      } catch {
        /* Durable running state recovers as unknown on next load. */
      }
    }
    if (ctx.mode === "account")
      try {
        await host.deps
          .identity(origin)
          .logout(ctx.session.accessToken, ctx.session.deviceId);
      } catch {
        host.report(
          new Error("已退出此设备。服务端撤销未确认，可重新登录后核对会话。"),
        );
      }
  } finally {
    if (forgetFailure) await retire(ctx).catch(() => undefined);
    else await retire(ctx);
  }
  if (forgetFailure) throw forgetFailure.error;
}
