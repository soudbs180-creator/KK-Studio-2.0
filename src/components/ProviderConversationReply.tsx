import type { CreationTask } from "../features/creation/model";
import MessageMarkdown from "./MessageMarkdown";
import MessageActions from "./MessageActions";
export default function ProviderConversationReply({
  task,
  onCancel,
}: {
  task: CreationTask;
  onCancel: () => void;
}) {
  const output = task.outputs?.find(
    (item) => item.index === 0 && item.model === task.model,
  );
  const status =
    task.status === "succeeded" &&
    (!output?.text || output.status !== "succeeded")
      ? "unknown"
      : task.status;
  return (
    <article aria-label={`${task.providerName ?? "模型"} ${task.model} 回复`}>
      <h3>
        {task.providerName ?? "模型"} · {task.model}
      </h3>
      {output?.text && <MessageMarkdown content={output.text} />}
      <p role="status">
        {
          {
            queued: "等待执行",
            running: "正在回复",
            unknown: "结果需核对，未自动重试",
            succeeded: "已完成",
            failed: "失败",
            cancelled: "已停止",
            offline: "离线",
            interrupted: "已中断",
            partial: "部分完成",
          }[status]
        }
      </p>
      {task.error && <p className="chat-status">{task.error}</p>}
      {status === "succeeded" && output?.text && (
        <MessageActions content={output.text} />
      )}
      {["queued", "running"].includes(status) && (
        <button type="button" onClick={onCancel}>
          停止此模型
        </button>
      )}
    </article>
  );
}
