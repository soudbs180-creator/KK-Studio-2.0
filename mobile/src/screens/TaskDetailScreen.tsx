import { router, useLocalSearchParams } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import {
  Action,
  Card,
  Content,
  Empty,
  Header,
  Label,
  Screen,
} from "../ui/primitives.tsx";
import { Status } from "../ui/Status.tsx";
import { taskActions } from "../ui/policies.ts";
import { useAction } from "../ui/useAction.ts";
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { app, state } = useApplication(),
    { busy, run } = useAction();
  const entry = app.allTasks().find((t) => t.task.id === id),
    task = entry?.task;
  if (!task)
    return (
      <Screen>
        <Header title="任务" back />
        <Content>
          <Empty title="记录不存在" description="请返回任务列表重新读取。" />
        </Content>
      </Screen>
    );
  const policy = taskActions(
    task,
    state.busyTaskIds.includes(task.id),
    state.recoverableTaskIds.includes(task.id),
  );
  const project = state.snapshot?.projects.find(
    (p) => p.id === entry!.projectId,
  );
  const receipt = project?.executionReceipts?.find((r) => r.taskId === task.id),
    comfy = receipt?.protocol === "comfyui",
    video = task.kind === "video",
    liveJob = Boolean(
      receipt?.gatewayJobId && !receipt.readOnly && task.status !== "succeeded",
    );
  return (
    <Screen>
      <Header title="任务详情" back />
      <Content>
        <Card>
          <Status status={task.status} />
          <Label>{task.prompt}</Label>
          <Label muted>
            {task.model} · {task.providerName ?? "连接未报告"}
          </Label>
          <Label small muted>
            项目：{project?.name} · {task.completedOutputs}/
            {task.requestedOutputs} 已归档
          </Label>
          <Label small muted>
            任务：{task.id}
            {"\n"}提交身份：{task.idempotencyKey}
            {"\n"}受理状态：{task.submissionState ?? "未报告"}
            {"\n"}创建：{new Date(task.createdAt).toLocaleString()}
            {task.submittedAt
              ? `\n提交：${new Date(task.submittedAt).toLocaleString()}`
              : ""}
            {"\n"}更新：{new Date(task.updatedAt).toLocaleString()}
          </Label>
          {Boolean(task.error) && <Label>{task.error}</Label>}
          <Label muted small>
            供应商未报告实际计费回执。停止连接不代表取消计费或退款。
          </Label>
          {receipt && (
            <Label muted small>
              {receipt.gatewayJobId
                ? `作业回执：${receipt.gatewayJobId}`
                : `Provider 回执：${receipt.providerRequestId ?? "未报告"}`}
              {receipt.readOnly
                ? "\n恢复副本的历史回执仅供查看，不能操作旧作业。"
                : ""}
            </Label>
          )}
        </Card>
        <Action
          label="停止当前请求"
          disabled={!policy.stop}
          reason={!policy.stop ? "此设备没有该任务的正在执行请求。" : undefined}
          onPress={() => {
            try {
              app.cancelTask(task.id);
            } catch (error) {
              app.report(error);
            }
          }}
        />
        {comfy && (
          <Action
            primary
            label="打开 ComfyUI 原作业与归档"
            onPress={() => router.push(`/comfy/tasks/${task.id}`)}
            reason="工作流使用独立固定回执，只核对原作业，不通过普通生成重试。"
          />
        )}
        {!comfy && Boolean(receipt?.gatewayJobId) && (
          <>
            <Action
              primary={liveJob}
              label="核对作业并取回原件"
              busy={busy}
              disabled={!liveJob}
              onPress={() => void run(() => app.reconcileTask(task.id))}
              reason="使用原作业身份查询，不重复提交生成。"
            />
            <Action
              label="请求取消 Gateway 作业"
              busy={busy}
              disabled={!liveJob}
              onPress={() => void run(() => app.requestGatewayCancel(task.id))}
              reason="此操作不证明上游已取消或退款。"
            />
          </>
        )}
        {video && (
          <Action
            primary
            label="查询视频任务 / 恢复原件"
            busy={busy}
            disabled={
              state.busyTaskIds.includes(task.id) ||
              task.status === "succeeded" ||
              Boolean(receipt?.readOnly) ||
              (!receipt?.providerRequestId && !policy.recover)
            }
            reason={
              receipt?.readOnly
                ? "恢复副本的历史作业只供查看。"
                : "只 GET 原视频作业与原件，不再次提交生成。刷新后 Key 缺失时，先在原连接重新保存 Key；仅同一原地址可用。"
            }
            onPress={() => void run(() => app.recoverTask(task.id))}
          />
        )}
        {!comfy && !video && (
          <Action
            primary={!liveJob}
            label="恢复已收到的原件"
            busy={busy}
            disabled={!policy.recover}
            reason={
              !policy.recover
                ? "没有本次内存回执；请先核对供应商。应用重启后不自动再次付费提交。"
                : "只重做归档，不调用生成端点。恢复前请保持本次应用打开。"
            }
            onPress={() => void run(() => app.recoverTask(task.id))}
          />
        )}
        {!comfy && (
          <Action
            label={`安全重试失败输出${policy.retryIndices.length ? `（${policy.retryIndices.length}）` : ""}`}
            busy={busy}
            disabled={!policy.retryIndices.length || policy.recover}
            reason={
              !policy.retryIndices.length
                ? "已成功、未知或正在执行的输出不能重试。"
                : undefined
            }
            onPress={() =>
              void run(async () => {
                await app.openProject(entry!.projectId);
                await app.retryTask(task.id);
              })
            }
          />
        )}
        <Action
          label="回到所属项目"
          onPress={() =>
            void run(async () => {
              await app.openProject(entry!.projectId);
              router.replace("/");
            })
          }
        />
        <Card>
          <Label>输出</Label>
          {task.outputs?.map((o) => (
            <Label key={o.index} small>
              {o.index + 1} · {o.status}
              {o.assetId ? ` · ${o.assetId}` : ""}
              {o.error ? `\n${o.error}` : ""}
            </Label>
          ))}
          {task.outputs
            ?.filter((o) => o.assetId)
            .map((o) => (
              <Action
                key={o.index}
                label={`查看原件 ${o.index + 1}`}
                onPress={() =>
                  router.push({
                    pathname: "/materials/[id]",
                    params: { id: o.assetId! },
                  })
                }
              />
            ))}
        </Card>
      </Content>
    </Screen>
  );
}
