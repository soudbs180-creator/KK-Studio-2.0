import { useState } from "react";
import type {
  CanvasCollectionItem,
  NodeEditingProps,
} from "../../domain/canvasItems.ts";
import { useComfyWorkflowNode } from "./useComfyWorkflowNode.ts";
import ComfyWorkflowEditor from "./ComfyWorkflowEditor.tsx";

export default function ComfyWorkflowNode({
  item,
  editing,
}: {
  item: CanvasCollectionItem;
  editing: NodeEditingProps;
}) {
  const state = useComfyWorkflowNode(item, editing),
    [open, setOpen] = useState<boolean>(),
    [guideOpen, setGuideOpen] = useState(false);
  const desktop = Boolean(state.host?.runtime.desktop);
  return (
    <article
      className="comfy-workflow-node"
      data-testid="comfy-workflow-node"
      onPointerDown={stopControlEvent}
      onKeyDown={stopControlEvent}
    >
      <div className="comfy-workflow-info">
        <strong>ComfyUI 工作流</strong>
        <div className="comfy-workflow-meta">
          <label className="comfy-workflow-picker">
            工作流：
            <select
              aria-label="选择 ComfyUI 工作流"
              value={item.comfyWorkflow?.workflowId ?? ""}
              onFocus={state.refresh}
              onChange={(e) => state.chooseWorkflow(e.target.value)}
            >
              <option value="">选择已保存工作流</option>
              {state.records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <p role="status" title={state.message}>
            {state.message ||
              (state.status.ready
                ? "已连接 · 模型由工作流决定"
                : state.status.owned
                  ? "后台启动中"
                  : "未连接 · 选择本地目录")}
          </p>
        </div>
      </div>
      <div className="comfy-workflow-actions">
        <button
          className="kk-button kk-button--secondary"
          disabled={!state.status.ready}
          onClick={() => setOpen(true)}
        >
          进入工作流
        </button>
        <button
          className="kk-button kk-button--secondary"
          disabled={
            !state.status.ready ||
            state.working ||
            !item.comfyWorkflow?.workflowId ||
            Boolean(item.comfyWorkflow?.submission)
          }
          onClick={() => void state.run()}
        >
          快速生成
        </button>
        {!state.status.ready && (
          <>
            <button
              className="kk-button kk-button--secondary"
              disabled={!desktop || state.working || state.status.owned}
              onClick={() => void state.chooseDirectory()}
            >
              选择目录
            </button>
            {desktop && (
              <button
                className="kk-button kk-button--secondary"
                type="button"
                aria-expanded={guideOpen}
                onClick={() => setGuideOpen((value) => !value)}
              >
                未安装？获取 ComfyUI
              </button>
            )}
          </>
        )}
      </div>
      {guideOpen && !state.status.ready && desktop && (
        <aside
          className="comfy-workflow-guide"
          role="region"
          aria-label="ComfyUI 安装指南"
        >
          <strong>未安装？获取 ComfyUI</strong>
          <a
            href="https://comfy.org/download/"
            target="_blank"
            rel="noreferrer"
          >
            打开 ComfyUI 官方下载页
          </a>
          <ol>
            <li>下载 Desktop 或 Portable，并完成首次启动。</li>
            <li>把模型放进 ComfyUI 的 models 文件夹。</li>
            <li>回到这里，选择包含 models 文件夹的目录。</li>
          </ol>
        </aside>
      )}
      {!desktop && <p>请在桌面客户端连接本地 ComfyUI</p>}
      {open !== undefined && (
        <ComfyWorkflowEditor
          open={open}
          clientId={state.clientId + "-editor"}
          onBack={() => setOpen(false)}
        />
      )}
    </article>
  );
}

function stopControlEvent(event: {
  target: EventTarget | null;
  stopPropagation: () => void;
}): void {
  if (
    event.target instanceof Element &&
    event.target.closest("button,select,input,textarea")
  )
    event.stopPropagation();
}
