import { useEffect, useState } from "react";
import type {
  CreationTask,
  CreationTaskOutput,
} from "../features/creation/model";
import { loadStoredAsset } from "../features/creation/assetRepository";

export default function BatchMatrix({
  task,
  outputs,
  onRetryOutput,
}: {
  task: CreationTask;
  outputs: CreationTaskOutput[];
  onRetryOutput: (taskId: string, outputIndex: number) => void;
}) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  const assetIds = outputs
    .flatMap((output) => (output.assetId ? [output.assetId] : []))
    .join(",");
  useEffect(() => {
    let active = true;
    setPreviews({});
    setLoadError(false);
    void Promise.all(
      assetIds
        .split(",")
        .filter(Boolean)
        .map(async (id) => {
          const asset = await loadStoredAsset(id);
          return asset ? ([id, asset.preview] as const) : null;
        }),
    )
      .then((entries) => {
        if (active)
          setPreviews(
            Object.fromEntries(entries.filter((entry) => entry !== null)),
          );
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [assetIds]);
  return (
    <div className="batch-matrix" aria-label="Batch Matrix">
      <div className="batch-matrix-header">
        <h3>Batch Matrix</h3>
        <span>{outputs.length} 个输出 · 单项可重试</span>
      </div>
      {loadError && <p role="status">本地预览读取失败，素材标识仍保留。</p>}
      <div className="batch-grid">
        {outputs.map((output) => (
          <div className={`batch-cell is-${output.status}`} key={output.index}>
            <span className="batch-cell-index">
              {String(output.index + 1).padStart(2, "0")}
            </span>
            {output.assetId && previews[output.assetId] && (
              <img
                className="batch-preview"
                src={previews[output.assetId]}
                alt={`输出 ${output.index + 1}`}
              />
            )}
            <strong>
              {output.status === "succeeded"
                ? "成功"
                : output.status === "failed"
                  ? "失败"
                  : output.status === "cancelled"
                    ? "取消"
                    : output.status === "running"
                      ? "生成中"
                      : output.status === "unknown"
                        ? "受理状态不明"
                        : "等待"}
            </strong>
            <dl className="batch-output-meta">
              <dt>assetId</dt>
              <dd title={output.assetId}>{output.assetId ?? "等待归档"}</dd>
              <dt>模型</dt>
              <dd>{output.model || task.model}</dd>
              <dt>连接</dt>
              <dd title={task.providerConnectionId}>
                {output.provider ?? task.providerName ?? "未绑定"}
              </dd>
              <dt>Prompt Hash</dt>
              <dd title={output.promptHash}>
                {output.promptHash ?? "等待编译"}
              </dd>
            </dl>
            <details>
              <summary>查看提示词</summary>
              <p>{task.prompt}</p>
            </details>
            {output.error && <small>{output.error}</small>}
            {(output.status === "failed" || output.status === "cancelled") && (
              <button
                type="button"
                onClick={() => onRetryOutput(task.id, output.index)}
              >
                单项重试
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
