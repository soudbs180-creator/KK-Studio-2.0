import type { CreationTask } from "@kk-studio/creation-contracts";
import type { WorkflowHost, AccountContext } from "./types.ts";
import { projectRevision } from "./types.ts";
export async function resolveRetryParent(
  host: WorkflowHost,
  ctx: AccountContext,
  projectId: string,
  child: CreationTask,
): Promise<void> {
  if (
    !child.retryOfTaskId ||
    child.status !== "succeeded" ||
    !child.retryOutputIndices?.length
  )
    return;
  await host.mutate(ctx, (repo, s) => {
    if (!host.valid(ctx))
      throw new Error("会话已变化，已归档的重试结果保留等待核对。");
    const parent = s.projects
      .find((p) => p.id === projectId)
      ?.tasks.find((t) => t.id === child.retryOfTaskId);
    if (
      !parent ||
      ["submitted", "unknown"].includes(parent.submissionState ?? "")
    )
      throw new Error("原任务的受理状态已变化，已保存的子结果保留等待核对。");
    const outputs = parent.outputs!.map((output) => {
      const slot = child.retryOutputIndices!.indexOf(output.index);
      if (slot === -1 || output.status === "succeeded") return output;
      if (output.status !== "failed" && output.status !== "cancelled")
        throw new Error("原输出状态已变化，不能覆盖。");
      const result = child.outputs?.find(
        (o) => o.index === slot && o.status === "succeeded",
      );
      if (!result) throw new Error("重试结果尚未完整归档。");
      return { ...result, index: output.index };
    });
    const completedOutputs = outputs.filter(
      (o) => o.status === "succeeded",
    ).length;
    return repo.updateTask(
      projectId,
      {
        ...parent,
        outputs,
        completedOutputs,
        completedOutputIndices: outputs
          .filter((o) => o.status === "succeeded")
          .map((o) => o.index),
        status:
          completedOutputs === parent.requestedOutputs
            ? "succeeded"
            : "partial",
        submissionState: "terminal",
        error:
          completedOutputs === parent.requestedOutputs
            ? undefined
            : parent.error,
        updatedAt: host.deps.now(),
      },
      projectRevision(s, projectId),
    );
  });
}
