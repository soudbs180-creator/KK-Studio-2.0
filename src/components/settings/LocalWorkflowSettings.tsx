import { useState } from "react";
import WorkflowImportButton, {
  downloadWorkflow,
} from "../WorkflowImportButton";
import type { WorkflowRecord } from "../../features/comfyui/index.ts";

export interface LocalWorkflowAccess {
  records: readonly WorkflowRecord[];
  onSave: (workflow: WorkflowRecord) => void;
  onDelete: (workflow: WorkflowRecord) => void;
}

export default function LocalWorkflowSettings({
  workflows,
}: {
  workflows: LocalWorkflowAccess;
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  return (
    <details className="settings-disclosure">
      <summary>ComfyUI 工作流 · {workflows.records.length} 个</summary>
      <div className="settings-detail-stack">
        <p className="settings-section-intro">
          已有工作流保留在原本机记录中。可导入与导出
          JSON；环境、节点和原件归档执行链尚未接通，不会自动启动服务或提交生成。
        </p>
        <WorkflowImportButton
          onImported={(workflow, count) => {
            try {
              workflows.onSave(workflow);
              setError("");
              setStatus(`已保存 ${workflow.name} · ${count} 个节点。`);
            } catch {
              setError(
                "工作流未能保存，原记录保留。请检查本地存储权限后重试。",
              );
            }
          }}
          onError={setError}
        />
        {error && <p role="alert">{error}</p>}
        {status && <p role="status">{status}</p>}
        {!workflows.records.length && (
          <p className="settings-section-intro">暂无已保存工作流。</p>
        )}
        {workflows.records.map((workflow) => (
          <article key={workflow.id} className="settings-workflow-row">
            <div>
              <strong title={workflow.name}>{workflow.name}</strong>
              <p>
                {Object.keys(workflow.workflow).length} 个节点 ·{" "}
                {workflow.source === "imported" ? "已导入" : "本地"}
              </p>
            </div>
            <div className="settings-action-group">
              <button
                type="button"
                className="settings-action secondary"
                onClick={() => downloadWorkflow(workflow)}
                aria-label={`导出 ${workflow.name}`}
              >
                导出
              </button>
              <button
                type="button"
                className="settings-action secondary"
                disabled
                title="ComfyUI 执行与归档链尚未接通"
              >
                运行未接通
              </button>
              {pendingDelete === workflow.id ? (
                <>
                  <button
                    type="button"
                    className="settings-danger-button"
                    onClick={() => {
                      try {
                        workflows.onDelete(workflow);
                        setPendingDelete(null);
                        setError("");
                        setStatus(`已删除工作流 ${workflow.name} 的本机记录。`);
                      } catch {
                        setError("删除未能保存，工作流记录保留。请重试。");
                      }
                    }}
                  >
                    确认删除
                  </button>
                  <button
                    type="button"
                    className="settings-action secondary"
                    onClick={() => setPendingDelete(null)}
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="settings-action secondary"
                  aria-label={`删除 ${workflow.name}`}
                  onClick={() => setPendingDelete(workflow.id)}
                >
                  删除
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}
