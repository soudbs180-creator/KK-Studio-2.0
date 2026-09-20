import type { ApprovalGate } from "../domain/agentWorkflow";
import type { CreationTask } from "../features/creation/model";

const GATE_LABELS: Record<ApprovalGate, string> = {
  remote_transfer: "远程传输",
  high_cost_batch: "高成本批量",
  overwrite_original: "覆盖原图",
  external_share: "外部分享",
  account_or_billing_change: "账户或计费变更",
};
const AGENTS = [
  ["Planner", "拆解目标与审批边界 · Prototype"],
  ["Prompt Compiler", "本地规则编译提示词与参数"],
  ["Reference Analyst", "五类参考用途 · 视觉分析未接入"],
  ["Generation Worker", "按连接提交批量任务"],
  ["Asset Tagger", "归档 SHA-256 与 AI 标签"],
  ["Reviewer", "人工审阅与区域评论"],
  ["Compositor / Exporter", "外部导出服务未接入 · Prototype"],
] as const;
export default function TaskWorkbenchReview({
  selected,
  gates,
}: {
  selected: CreationTask;
  gates: ApprovalGate[];
}) {
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
        {AGENTS.map(([label, detail], index) => (
          <div className="agent-card" key={label}>
            <span className="agent-avatar">{index + 1}</span>
            <div>
              <strong>{label}</strong>
              <small>{detail}</small>
            </div>
            <em>
              {label === "Generation Worker"
                ? selected.status === "running"
                  ? "运行中"
                  : "待命"
                : label === "Asset Tagger"
                  ? selected.completedOutputs
                    ? "已归档"
                    : "等待结果"
                  : label === "Reviewer"
                    ? "人工"
                    : label === "Prompt Compiler"
                      ? "本地规则"
                      : "Prototype"}
            </em>
          </div>
        ))}
      </div>
    </div>
  );
}
