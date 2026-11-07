import { useState } from "react";
import { flushSync } from "react-dom";
import type {
  CanvasCollectionItem,
  NodeEditingProps,
} from "../../domain/canvasItems.ts";
import { useComfyWorkflowNode } from "./useComfyWorkflowNode.ts";
import ComfyWorkflowEditor from "./ComfyWorkflowEditor.tsx";
import {
  ComfyWorkflowParameters,
  ComfyWorkflowConnection,
} from "../../features/comfyui/index.ts";

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
  const activeRecord = state.activeRecord;
  const records =
    activeRecord &&
    !state.records.some((record) => record.id === activeRecord.id)
      ? [activeRecord, ...state.records]
      : state.records;
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
              disabled={
                state.working || Boolean(item.comfyWorkflow?.submission)
              }
              value={item.comfyWorkflow?.workflowId ?? ""}
              onFocus={state.refresh}
              onChange={(e) => state.chooseWorkflow(e.target.value)}
            >
              <option value="">选择已保存工作流</option>
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label
            className="kk-button kk-button--secondary comfy-workflow-import-btn"
            title="导入本地工作流 JSON"
          >
            <input
              type="file"
              disabled={
                state.working || Boolean(item.comfyWorkflow?.submission)
              }
              accept=".json"
              style={{ display: "none" }}
              aria-label="导入工作流 JSON"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void state.importWorkflowFile(file);
                e.target.value = "";
              }}
            />
            导入工作流
          </label>
          <p role="status" title={state.message}>
            {getComfyStatusText(state.status, state.message, state.savedRoot)}
          </p>
        </div>
      </div>
      <div className="comfy-workflow-actions">
        <button
          className="kk-button kk-button--secondary"
          disabled={!state.status.ready || state.working}
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
        <ComfyOfflineActions
          desktop={desktop}
          status={state.status}
          working={state.working}
          savedRoot={state.savedRoot}
          guideOpen={guideOpen}
          onStartSaved={() => void state.startSavedDirectory()}
          onChoose={() => void state.chooseDirectory()}
          onToggleGuide={() => setGuideOpen((v) => !v)}
        />
      </div>
      <ComfyWorkflowConnection
        key={item.comfyWorkflow?.endpoint}
        endpoint={item.comfyWorkflow?.endpoint}
        disabled={Boolean(item.comfyWorkflow?.submission) || state.working}
        onConnect={state.connect}
        onStart={
          desktop
            ? () =>
                void (state.savedRoot
                  ? state.startSavedDirectory()
                  : state.chooseDirectory())
            : undefined
        }
      />
      {activeRecord && (
        <details
          className="comfy-node-parameters"
          open={Boolean(item.comfyWorkflow?.parametersOpen)}
          onToggle={(event) => {
            const parametersOpen = event.currentTarget.open;
            if (parametersOpen !== Boolean(item.comfyWorkflow?.parametersOpen))
              editing.onChange({
                comfyWorkflow: { ...item.comfyWorkflow, parametersOpen },
              });
          }}
        >
          <summary>参数微调</summary>
          <ComfyWorkflowParameters
            record={activeRecord}
            onChange={state.updateRecord}
            disabled={Boolean(item.comfyWorkflow?.submission)}
          />
        </details>
      )}
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
          workflowRecord={activeRecord}
          runtime={state.runtime ?? state.host?.runtime}
          savedRoot={state.savedRoot}
          onSave={async (record) => {
            flushSync(() => state.updateRecord(record));
            await state.host?.flush();
          }}
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

function getComfyStatusText(
  status: { ready: boolean; owned: boolean },
  message: string,
  savedRoot: string | null,
): string {
  if (message) return message;
  if (status.ready) return "已连接 · 模型由工作流决定";
  if (status.owned) return "后台启动中";
  if (savedRoot) return `未连接 · 已记忆路径 (${savedRoot})`;
  return "未连接 · 选择本地目录";
}

interface ComfyOfflineActionsProps {
  desktop: boolean;
  status: { ready: boolean; owned: boolean };
  working: boolean;
  savedRoot: string | null;
  guideOpen: boolean;
  onStartSaved: () => void;
  onChoose: () => void;
  onToggleGuide: () => void;
}

function ComfyOfflineActions({
  desktop,
  status,
  working,
  savedRoot,
  guideOpen,
  onStartSaved,
  onChoose,
  onToggleGuide,
}: ComfyOfflineActionsProps) {
  if (status.ready) return null;
  return (
    <>
      {savedRoot && !status.owned && (
        <button
          className="kk-button kk-button--secondary"
          disabled={!desktop || working}
          onClick={onStartSaved}
          title={`从已记忆路径启动：${savedRoot}`}
        >
          启动记忆目录
        </button>
      )}
      <button
        className="kk-button kk-button--secondary"
        disabled={!desktop || working || status.owned}
        onClick={onChoose}
      >
        选择目录
      </button>
      {desktop && (
        <button
          className="kk-button kk-button--secondary"
          type="button"
          aria-expanded={guideOpen}
          onClick={onToggleGuide}
        >
          未安装？获取 ComfyUI
        </button>
      )}
    </>
  );
}
