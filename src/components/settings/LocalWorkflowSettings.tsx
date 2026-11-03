import { useState } from "react";
import { LocalComfyConnection } from "../../features/models/index.ts";
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
        <LocalComfyConnection />
        <p className="settings-section-intro">
          已有工作流保留在原本机记录中。可导入与导出 JSON；在画布添加 ComfyUI
          工作流节点，选择工作流即可微调参数、进入原生编辑器并生成归档结果。
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
                onClick={() =>
                  setStatus(
                    "在项目画布点击“添加资源 → ComfyUI 工作流”，选择此工作流后运行。",
                  )
                }
                title="在画布工作流节点运行并保存生成产物"
              >
                画布运行指引
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
