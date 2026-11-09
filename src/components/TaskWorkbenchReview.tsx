import type { ApprovalGate } from "../domain/agentWorkflow";
import type { CreationTask } from "../features/creation/index.ts";
import { visibleReviewAgents } from "./TaskWorkbenchVisibility";

export { visibleReviewAgents } from "./TaskWorkbenchVisibility";

const GATE_LABELS: Record<ApprovalGate, string> = {
  remote_transfer: "远程传输",
  high_cost_batch: "高成本批量",
  overwrite_original: "覆盖原图",
  external_share: "外部分享",
  account_or_billing_change: "账户或计费变更",
};

function agentStatus(label: string, selected: CreationTask): string {
  if (label === "Generation Worker") {
    return selected.status === "running" ? "运行中" : "待命";
  }
  if (label === "Asset Tagger") {
    return selected.completedOutputs ? "已归档" : "等待结果";
  }
  if (label === "Reviewer") return "人工";
  if (label === "Prompt Compiler") return "本地规则";
  return "待命";
}

export default function TaskWorkbenchReview({
  selected,
  gates,
}: {
  selected: CreationTask;
  gates: ApprovalGate[];
}) {
  const agents = visibleReviewAgents();
  return (
    <div className="review-grid">
      <div className="approval-card">
        <h3>Approval Gates</h3>
        {(
          [
            "remote_transfer",
            "high_cost_batch",
            "overwrite_original",
            "external_share",
          ] as ApprovalGate[]
        ).map((gate) => (
          <div className="approval-row" key={gate}>
            <span>{GATE_LABELS[gate]}</span>
            <span
              className={
                selected.approvedGates?.includes(gate) ? "is-approved" : ""
              }
            >
              {selected.approvedGates?.includes(gate)
                ? "已批准"
                : gates.includes(gate)
                  ? "等待提交前审批"
                  : "本次未触发"}
            </span>
          </div>
        ))}
        <p>审批记录绑定当前任务。覆盖原图、外部分享入口尚未启用。</p>
      </div>
      <div className="agent-card-list">
        <h3>Agent Cards</h3>
        {agents.map(([label, detail], index) => (
          <div className="agent-card" key={label}>
            <span className="agent-avatar">{index + 1}</span>
            <div>
              <strong>{label}</strong>
              <small>{detail}</small>
            </div>
            <em>{agentStatus(label, selected)}</em>
          </div>
        ))}
      </div>
    </div>
  );
}
