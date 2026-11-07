import ImageCapabilityParameters from "./ImageCapabilityParameters.tsx";
import Modal from "../../shared/ui/Dialog.tsx";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { ImageCapabilityId } from "../../../packages/creation-contracts/index.ts";
import {
  createImportedWorkflow,
  parseComfyWorkflow,
} from "../comfyui/index.ts";
import { imageCapabilityActionLabels } from "./imageCapabilityActions.ts";
import { useImageCapabilityDialog } from "./useImageCapabilityDialog.ts";
import { LocalComfyConnection } from "../models/index.ts";

function ImageCapabilityDialogContent({
  source,
  capabilityId,
  onClose,
}: {
  source: CanvasCollectionItem;
  capabilityId: ImageCapabilityId;
  onClose: () => void;
}) {
  const state = useImageCapabilityDialog(source, capabilityId);
  const {
    command,
    connections,
    connectionId,
    setConnectionId,
    connection,
    records,
    record,
    setRecord,
    setRecords,
    prompt,
    setPrompt,
    error,
    setError,
    reading,
    task,
    running,
    unresolved,
    setRefresh,
    submit,
  } = state;
  return (
    <Modal
      title={imageCapabilityActionLabels[capabilityId]}
      onClose={onClose}
      className="image-capability-modal"
    >
      <header>
        <h2>{imageCapabilityActionLabels[capabilityId]}</h2>
        <button className="kk-button kk-button--tertiary" onClick={onClose}>
          关闭
        </button>
      </header>
      <p>使用归档原图在本地 ComfyUI 执行，结果自动保存并连接到画布。</p>
      <LocalComfyConnection onSaved={setConnectionId} />
      <fieldset className="comfy-parameters" disabled={running}>
        <label>
          <span>执行连接</span>
          <select
            value={connectionId}
            onChange={(event) => setConnectionId(event.target.value)}
            aria-label="图片编辑执行连接"
          >
            <option value="">选择本地 ComfyUI 连接</option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.displayName} · {connection.baseUrl}
              </option>
            ))}
          </select>
        </label>
        {!connection && (
          <p role="status">
            尚未配置本地
            ComfyUI。请前往模型设置添加本地连接，填入运行地址并选择无 Key 认证。
          </p>
        )}
        <div className="comfy-workflow-actions">
          <button
            className="kk-button kk-button--secondary"
            onClick={() => {
              onClose();
              command?.configure?.();
            }}
          >
            前往模型设置
          </button>
          <button
            className="kk-button kk-button--secondary"
            disabled={!connection || reading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            刷新模型
          </button>
        </div>
        <label>
          <span>工作流</span>
          <select
            aria-label="图片编辑工作流"
            value={record?.id ?? ""}
            onChange={(event) =>
              setRecord(
                records.find((record) => record.id === event.target.value),
              )
            }
          >
            <option value="">内置标准工作流</option>
            {records
              .filter((record) => !record.needsConversion)
              .map((record) => (
                <option key={record.id} value={record.id}>
                  {record.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          导入 API 工作流
          <input
            aria-label="导入图片编辑 API 工作流"
            type="file"
            accept=".json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file)
                void file
                  .text()
                  .then((text) => {
                    const imported = createImportedWorkflow(
                      file.name,
                      parseComfyWorkflow(JSON.parse(text)),
                    );
                    if (imported.needsConversion)
                      throw new Error(
                        "请导入 API JSON，UI JSON 需要先在原生编辑器转换。",
                      );
                    setRecords((records) => [imported, ...records]);
                    setRecord(imported);
                  })
                  .catch((error) =>
                    setError(
                      error instanceof Error ? error.message : String(error),
                    ),
                  );
            }}
          />
        </label>
        <ImageCapabilityParameters capabilityId={capabilityId} state={state} />
        <label>
          <span>编辑描述</span>
          <textarea
            rows={2}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              capabilityId === "image.outpaint"
                ? "描述希望扩展的画面内容"
                : "可选备注"
            }
          />
        </label>
      </fieldset>
      <p role="status">
        {reading
          ? "正在读取本地模型…"
          : error ||
            (unresolved
              ? "原任务受理状态未知，请在任务列表查询原任务，当前不会重复提交。"
              : "") ||
            task?.error ||
            (running
              ? "任务执行中，关闭窗口后仍可在任务列表查看。"
              : task?.status === "succeeded"
                ? "产物已归档并回写画布。"
                : !source.assetId
                  ? "请先归档图片原件。"
                  : "")}
      </p>
      <footer>
        <button
          className="kk-button kk-button--primary"
          disabled={
            !source.assetId ||
            !connection ||
            reading ||
            running ||
            unresolved ||
            !command
          }
          onClick={() => void submit()}
        >
          提交任务
        </button>
        {task && running && (
          <button
            className="kk-button kk-button--secondary"
            onClick={() => command?.cancel(task.id)}
          >
            取消任务
          </button>
        )}
      </footer>
    </Modal>
  );
}

export default function ImageCapabilityDialog(props: {
  source: CanvasCollectionItem;
  capabilityId?: ImageCapabilityId;
  onClose: () => void;
}) {
  return props.capabilityId ? (
    <ImageCapabilityDialogContent
      key={`${props.source.id}:${props.capabilityId}`}
      {...props}
      capabilityId={props.capabilityId}
    />
  ) : null;
}
