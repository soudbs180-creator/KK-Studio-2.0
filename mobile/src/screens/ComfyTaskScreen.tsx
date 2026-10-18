import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import type {
  ComfyPollReceipt,
  ComfyCancelReceipt,
} from "../services/comfyTypes.ts";
import {
  Action,
  Card,
  Content,
  Empty,
  Header,
  Label,
  Screen,
} from "../ui/primitives.tsx";
import { Status, taskLabels } from "../ui/Status.tsx";
import { useComfy } from "../ui/useComfy.ts";
import { useScopedRequest } from "../ui/useScopedRequest.ts";
export default function ComfyTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { state } = useApplication();
  return <Task key={`${state.accountId}/${id}`} id={id} />;
}
function Task({ id }: { id: string }) {
  const { state } = useApplication(),
    flow = useComfy(),
    request = useScopedRequest(),
    scope = state.accountId!;
  const [progress, setProgress] = useState<ComfyPollReceipt>(),
    [cancel, setCancel] = useState<ComfyCancelReceipt>();
  const project = state.snapshot?.projects.find((p) =>
      p.executionReceipts?.some(
        (r) => r.taskId === id && r.protocol === "comfyui",
      ),
    ),
    receipt = project?.executionReceipts?.find((r) => r.taskId === id),
    task = project?.tasks.find((t) => t.id === id),
    capture = receipt?.comfy;
  if (!task || !capture)
    return (
      <Screen>
        <Header title="工作流作业" back />
        <Content>
          <Empty
            title="作业记录不存在"
            description="返回 ComfyUI 目录重新读取。"
          />
        </Content>
      </Screen>
    );
  const live = !receipt?.readOnly && task.status !== "succeeded",
    recovering = flow.canRecover(id, scope),
    recoveryReason = flow.recoveryUnavailableReason(id, scope);
  return (
    <Screen>
      <Header title="工作流作业" back />
      <Content>
        <Card>
          <Status status={task.status} />
          <Label>{project?.name}</Label>
          <Label small>
            {task.completedOutputs}/{task.requestedOutputs} 原件已归档
          </Label>
          <Label muted small>
            固定地址：{capture.identity.baseUrl}
            {"\n"}提交身份：{capture.identity.submissionId}
            {"\n"}Prompt ID：{capture.promptId}
            {"\n"}
            {capture.promptIdConfirmed
              ? "服务已确认作业 ID"
              : "仅有预先请求身份，服务实际 ID 尚未确认"}
            {"\n"}工作流版本：{capture.identity.workflowRevision}
          </Label>
          {Boolean(task.error) && <Label danger>{task.error}</Label>}
          {receipt?.readOnly && (
            <Label muted>
              独立恢复副本的历史回执仅供查看，不能查询、取消或重新提交旧作业。
            </Label>
          )}
          {progress && (
            <Label muted>
              上次核对：{taskLabels[progress.status]} · 服务报告{" "}
              {progress.outputs.length} 个输出。完成状态以本页已归档任务为准。
            </Label>
          )}
        </Card>
        <Action
          primary
          label={
            recovering ? "恢复已接收原件并核对原作业" : "核对原作业并取回原件"
          }
          busy={request.busy}
          disabled={!live || Boolean(recoveryReason)}
          reason={
            recoveryReason ?? "使用固定工作流与原作业身份，不重复提交生成。"
          }
          onPress={() =>
            void request.run(
              (signal) =>
                recovering
                  ? flow.recover(id, scope, signal)
                  : flow.poll(id, scope, signal),
              setProgress,
            )
          }
        />
        <Action
          label="停止本次请求"
          disabled={!request.busy}
          onPress={request.stop}
        />
        <Action
          label="请求服务取消此作业"
          busy={request.busy}
          disabled={!live || !capture.promptIdConfirmed}
          reason={
            !capture.promptIdConfirmed
              ? "未确认实际作业 ID，无法安全请求取消。"
              : "服务取消请求不证明上游停止，也不代表退款。"
          }
          onPress={() =>
            void request.run(
              (signal) => flow.requestCancel(id, scope, signal),
              setCancel,
            )
          }
        />
        {cancel && (
          <Label>
            {cancel.cancelRequested
              ? "已发送取消请求，上游是否停止仍未确认。"
              : "该作业当前无法确认可用的取消方式，请在服务设备核对。"}
          </Label>
        )}
        <Action
          label="查看普通任务详情与原件"
          onPress={() => router.push(`/tasks/${id}`)}
        />
        <Card>
          <Label title>固定工作流（只读）</Label>
          <Label small>
            {JSON.stringify(capture.identity.workflow, null, 2).slice(0, 12000)}
          </Label>
          <Label muted small>
            前 12000 字预览；设备保存完整固定工作流。
          </Label>
        </Card>
      </Content>
    </Screen>
  );
}
