import UiIcon from "./UiIcon";
import type { WorkflowRecord } from "../features/comfyui/workflowRegistry";

export default function WorkflowCard({
  workflow,
  onOpen,
  onExport,
  onDelete,
  onRun,
}: {
  workflow: WorkflowRecord;
  onOpen: (workflow: WorkflowRecord) => void;
  onExport: (workflow: WorkflowRecord) => void;
  onDelete: (workflow: WorkflowRecord) => void;
  onRun: (workflow: WorkflowRecord) => void;
}) {
  return (
    <article className="catalog-card workflow-card workflow-card-local">
      <button
        type="button"
        className="workflow-card-preview"
        onClick={() => onOpen(workflow)}
        aria-label={`打开 ${workflow.name}`}
      >
        <strong>ComfyUI</strong>
        <span>{Object.keys(workflow.workflow).length} 个节点</span>
      </button>
      <div className="catalog-card-body">
        <div className="workflow-card-title-row">
          <strong>{workflow.name}</strong>
          <span className="workflow-source-tag">
            {workflow.source === "imported" ? "已导入" : "本地"}
          </span>
        </div>
        <p>{workflow.description}</p>
        <small>{new Date(workflow.updatedAt).toLocaleString("zh-CN")}</small>
        <div className="workflow-card-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => onRun(workflow)}
          >
            运行
          </button>
          <button
            type="button"
            className="ui-button"
            onClick={() => onOpen(workflow)}
          >
            编辑 JSON
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`导出 ${workflow.name}`}
            title="导出工作流 JSON"
            onClick={() => onExport(workflow)}
          >
            <UiIcon name="download" size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`删除 ${workflow.name}`}
            title="删除本地工作流"
            onClick={() => onDelete(workflow)}
          >
            <UiIcon name="delete" size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
