import { useState } from "react";
import type { CreationTask } from "../features/creation/model";
import type { ReviewComment, ReviewRegion } from "../domain/reviewWorkflow";
import type { AgentRole } from "../domain/agentWorkflow";
import CommentRegion from "./CommentRegion";

export default function TaskWorkbenchExport({
  selected,
  comments,
  onChange,
}: {
  selected: CreationTask;
  comments: ReviewComment[];
  onChange: (comments: ReviewComment[]) => void;
}) {
  const [comment, setComment] = useState("");
  const [region, setRegion] = useState<ReviewRegion>();
  const [regionLabel, setRegionLabel] = useState("整个结果");
  const availableOutputs =
    selected.outputs?.filter((output) => output.assetId) ?? [];
  const [outputIndex, setOutputIndex] = useState(availableOutputs[0]?.index);
  const assetId = (
    availableOutputs.find((output) => output.index === outputIndex) ??
    availableOutputs[0]
  )?.assetId;
  const taskComments = comments.filter(
    (entry) => entry.sourceTaskId === selected.id,
  );
  const update = (id: string, patch: Partial<ReviewComment>) =>
    onChange(
      comments.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  const addComment = () => {
    if (!comment.trim()) return;
    onChange([
      ...comments,
      {
        id: `comment-${crypto.randomUUID()}`,
        sourceTaskId: selected.id,
        assetId,
        content: comment.trim(),
        region,
        regionLabel,
        assignee: "reviewer",
        status: "comment",
        createdAt: Date.now(),
      },
    ]);
    setComment("");
  };
  return (
    <div className="export-grid">
      <div className="comment-card">
        <h3>Comments to Tasks</h3>
        {availableOutputs.length > 0 && (
          <label className="comment-output-picker">
            评论对应结果
            <select
              aria-label="评论对应结果"
              value={outputIndex}
              onChange={(event) => {
                setOutputIndex(Number(event.target.value));
                setRegion(undefined);
                setRegionLabel("整个结果");
              }}
            >
              {availableOutputs.map((output) => (
                <option key={output.index} value={output.index}>
                  输出 {output.index + 1} · {output.assetId?.slice(0, 18)}
                </option>
              ))}
            </select>
          </label>
        )}
        <CommentRegion
          key={assetId}
          assetId={assetId}
          value={region}
          onChange={(value) => {
            setRegion(value);
            setRegionLabel(value ? "框选区域" : "整个结果");
          }}
        />
        <textarea
          aria-label="评论"
          value={comment}
          maxLength={2000}
          onChange={(event) => setComment(event.target.value)}
          placeholder="写下这一区域需要修改的内容"
        />
        <button
          type="button"
          className="primary-button"
          onClick={addComment}
          disabled={!comment.trim()}
        >
          添加评论
        </button>
        {taskComments.map((entry) => (
          <div className="comment-entry" key={entry.id}>
            <strong>
              {entry.regionLabel}
              {entry.region
                ? ` · ${Math.round(entry.region.x * 100)}%, ${Math.round(entry.region.y * 100)}%`
                : ""}
            </strong>
            <span>{entry.content}</span>
            {entry.status === "comment" ? (
              <button
                type="button"
                onClick={() =>
                  update(entry.id, {
                    status: "open",
                    reviewTaskId: `review-${crypto.randomUUID()}`,
                  })
                }
              >
                评论转任务
              </button>
            ) : (
              <>
                <label>
                  分配
                  <select
                    aria-label="评论任务分配"
                    value={entry.assignee}
                    onChange={(event) =>
                      update(entry.id, {
                        assignee: event.target.value as AgentRole,
                      })
                    }
                  >
                    <option value="planner">Planner</option>
                    <option value="prompt_compiler">Prompt Compiler</option>
                    <option value="reference_analyst">Reference Analyst</option>
                    <option value="generation_worker">Generation Worker</option>
                    <option value="asset_tagger">Asset Tagger</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="compositor_exporter">
                      Compositor / Exporter
                    </option>
                  </select>
                </label>
                <small>
                  {entry.reviewTaskId} · 本地审阅任务 ·{" "}
                  {entry.status === "done" ? "已完成" : "待处理"}
                </small>
                <button
                  type="button"
                  onClick={() =>
                    update(entry.id, {
                      status: entry.status === "done" ? "open" : "done",
                    })
                  }
                >
                  {entry.status === "done" ? "重新打开" : "完成审阅任务"}
                </button>
              </>
            )}
          </div>
        ))}
        <p>
          评论和任务分配保存在当前本地项目。Agent 自动执行与多人同步为
          Prototype。
        </p>
      </div>
      <div className="provenance-card">
        <h3>Provenance</h3>
        <dl>
          <dt>模型</dt>
          <dd>{selected.model || "未记录"}</dd>
          <dt>连接</dt>
          <dd title={selected.providerConnectionId}>
            {selected.providerName ?? "未绑定"}
          </dd>
          <dt>任务</dt>
          <dd>{selected.id}</dd>
          <dt>父素材</dt>
          <dd
            title={selected.attachments
              .map((attachment) => attachment.assetId)
              .filter(Boolean)
              .join(", ")}
          >
            {selected.attachments.length
              ? `${selected.attachments.length} 项本地素材`
              : "无"}
          </dd>
          <dt>生成时间</dt>
          <dd>
            {selected.outputs?.some((output) => output.status === "succeeded")
              ? new Date(
                  Math.max(
                    ...selected.outputs
                      .filter((output) => output.status === "succeeded")
                      .map((output) => output.createdAt),
                  ),
                ).toLocaleString()
              : "尚未生成"}
          </dd>
          <dt>C2PA / SynthID</dt>
          <dd>未知 · 未收到可验证信号</dd>
          <dt>AI 生成标签</dt>
          <dd>
            {selected.completedOutputs ? "归档结果已添加" : "等待生成结果"}
          </dd>
        </dl>
        <p>覆盖原图和公网分享尚未接入；当前操作不会发送给外部协作者。</p>
        <button
          type="button"
          disabled
          title="外部分享服务尚未接入，启用前需要人工审批"
        >
          外部分享 · Prototype
        </button>
      </div>
    </div>
  );
}
