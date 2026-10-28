import type { CreationTask } from "../../domain/creationTypes.ts";
import { taskRetryAvailability } from "../../domain/imageTaskRetry.ts";

export default function RegionRetryList({
  tasks,
  sourceId,
  loading,
  onRetry,
}: {
  tasks: readonly CreationTask[];
  sourceId: string;
  loading: boolean;
  onRetry?: (taskId: string) => void;
}) {
  return (
    <>
      {tasks
        .filter(
          (task) =>
            task.sourceItemId === sourceId &&
            task.imageEdit &&
            ["failed", "offline", "cancelled"].includes(task.status),
        )
        .map((task, index) => {
          const retry = taskRetryAvailability(task, tasks);
          const disabled = loading || !onRetry || !retry.indices.length;
          const reason = !retry.indices.length
            ? retry.blockedReason
            : loading
              ? "当前正在生成，请等待或取消后再重试该区域。"
              : !onRetry
                ? "当前没有可用的区域重试执行入口。"
                : undefined;
          return (
            <div key={task.id} className="image-edit-feedback" role="status">
              区域 {index + 1}：{task.error}
              <button
                type="button"
                className="ui-button"
                disabled={disabled}
                title={reason}
                aria-description={reason}
                onClick={() => {
                  if (!disabled) onRetry?.(task.id);
                }}
              >
                重试该区域
              </button>
              {reason && <span>{reason}</span>}
            </div>
          );
        })}
    </>
  );
}
