import type { ApprovalGate } from "../domain/agentWorkflow";
import type { CreationTask } from "../features/creation/model";
import Modal from "./Modal";

export default function TaskExecutionApproval({
  task,
  gates,
  onApprove,
  onCancel,
}: {
  task: CreationTask;
  gates: ApprovalGate[];
  onApprove: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title="人工审批任务" onClose={onCancel}>
      <section className="task-approval-dialog">
        <h2>人工审批任务</h2>
        <p>
          {gates.includes("remote_transfer")
            ? "提示词和参考素材将离开本机，发送到下列连接。"
            : "该批量达到高成本审批阈值，确认后才会提交。"}
        </p>
        <dl>
          <dt>Provider</dt>
          <dd>{task.providerName ?? "未记录"}</dd>
          <dt>连接地址</dt>
          <dd>{task.providerBaseUrl}</dd>
          <dt>模型 / 数量</dt>
          <dd>
            {task.model} · {task.requestedOutputs} 个输出
          </dd>
          <dt>参考素材</dt>
          <dd>{task.attachments.length} 项</dd>
          <dt>数据保留</dt>
          <dd>当前连接未声明保留策略，请以供应商服务条款为准。</dd>
          <dt>成本预估</dt>
          <dd>
            Prototype 示例单价 $0.04/张，合计 $
            {(task.requestedOutputs * 0.04).toFixed(2)}；未取得供应商报价。
          </dd>
        </dl>
        <p>审批只适用于本次任务。暂停后恢复仍使用同一任务；重试将重新审批。</p>
        <footer>
          <button type="button" data-initial-focus onClick={onCancel}>
            取消任务
          </button>
          <button type="button" className="primary-button" onClick={onApprove}>
            批准并提交
          </button>
        </footer>
      </section>
    </Modal>
  );
}
