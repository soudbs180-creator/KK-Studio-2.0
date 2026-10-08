import { useContext, useEffect, useRef, useState } from "react";
import ComposerTextarea from "../../components/ComposerTextarea.tsx";
import UiIcon from "../../components/UiIcon.tsx";
import { readReferenceImages } from "../../components/nodes/referenceUpload.ts";
import { CanvasImageCommandContext } from "../creation/CanvasImageCommand.tsx";
import { catalogForConnection } from "../models/modelCatalog.ts";
import { readProviderConnections } from "../creation/providerRegistry.ts";
import { nextColorLabel, type MaskDocument, type MaskRegion } from "./mask.ts";
import type {
  CanvasCollectionItem,
  CanvasReference,
} from "../../domain/canvasItems.ts";
function tagColor(color: string) {
  return (
    "#" +
    color
      .slice(1)
      .match(/../g)!
      .map((c) =>
        Math.round(parseInt(c, 16) * 0.65)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export default function EditComposer({
  source,
  document,
  prompt,
  onPrompt,
  references,
  onReferences,
  onRegion,
  onSend,
  disabled,
  loading,
  onCancel,
  onError,
}: {
  source: CanvasCollectionItem;
  document: MaskDocument;
  prompt: string;
  onPrompt: (prompt: string) => void;
  references: CanvasReference[];
  onReferences: (refs: CanvasReference[]) => void;
  onRegion: (region: MaskRegion) => void;
  onSend: () => void;
  disabled: boolean;
  loading: boolean;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const command = useContext(CanvasImageCommandContext),
    file = useRef<HTMLInputElement>(null),
    [uploading, setUploading] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, [source.assetId]);
  const confirmed = document.regions.filter(
      (r) => r.color && r.instruction?.trim(),
    ),
    candidates = document.regions.filter((r) => r.color),
    showCandidates = /@[^\s@]*$/u.test(prompt);
  const connectionId =
      source.providerConnectionId ?? command?.providerConnectionId,
    connections = readProviderConnections().filter((c) =>
      c.capabilities.modalities.includes("image"),
    );
  return (
    <div className="image-edit-composer">
      <div className="image-edit-tags">
        {confirmed.map((region) => (
          <button
            key={region.id}
            type="button"
            style={{ backgroundColor: tagColor(region.color!) }}
            onClick={() => onRegion(region)}
          >
            {nextColorLabel(region.colorName!, region.number!)} ·{" "}
            {region.instruction}
          </button>
        ))}
        {references.map((ref, i) => (
          <span key={ref.assetId ?? i}>
            <img src={ref.preview} alt={ref.title} />
            <button
              type="button"
              aria-label={`移除参考图${i + 1}`}
              disabled={loading}
              onClick={() =>
                onReferences(references.filter((_, index) => index !== i))
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {showCandidates && (
        <div
          className="image-edit-mentions"
          role="listbox"
          aria-label="色块引用"
        >
          {candidates.length ? (
            candidates.map((r) => (
              <button
                type="button"
                role="option"
                aria-selected={false}
                key={r.id}
                onClick={() =>
                  onPrompt(
                    prompt.replace(
                      /@[^\s@]*$/u,
                      `@${nextColorLabel(r.colorName!, r.number!)} `,
                    ),
                  )
                }
              >
                {nextColorLabel(r.colorName!, r.number!)}
              </button>
            ))
          ) : (
            <span>当前图片没有色块。</span>
          )}
        </div>
      )}
      <div className="image-edit-input">
        <button
          type="button"
          className="ui-button"
          aria-label="上传重绘参考图"
          disabled={loading || uploading}
          onClick={() => file.current?.click()}
        >
          <UiIcon name="add" />
        </button>
        <input
          type="file"
          ref={file}
          hidden
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (!files.length) return;
            setUploading(true);
            void readReferenceImages(files)
              .then((refs) => {
                if (active.current) onReferences([...references, ...refs]);
              })
              .catch(
                (error: unknown) =>
                  active.current &&
                  onError(
                    error instanceof Error
                      ? error.message
                      : "参考图归档失败，请重试。",
                  ),
              )
              .finally(() => {
                if (active.current) setUploading(false);
              });
          }}
        />
        <ComposerTextarea
          aria-label="重绘指令"
          placeholder="描述修改意见，或输入 @ 引用色块"
          value={prompt}
          disabled={loading}
          maxLength={2000}
          onChange={(e) => onPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              if (!disabled && !uploading) onSend();
            }
          }}
        />
        <button
          type="button"
          className={loading ? "ui-button" : "primary-button"}
          aria-label={loading ? "取消本轮重绘" : "开始重绘"}
          disabled={!loading && (disabled || uploading)}
          onClick={loading ? onCancel : onSend}
        >
          {loading ? "取消" : "发送"}
        </button>
      </div>
      <div className="image-edit-model">
        <label>
          模型
          <select
            aria-label="重绘模型"
            disabled={loading || source.generationSource === "codex"}
            value={`${connectionId ?? ""}|${source.model ?? command?.model ?? ""}`}
            onChange={(e) => {
              const [id, model] = e.target.value.split("|");
              command?.updateItem?.(source.id, {
                model,
                providerConnectionId: id,
              });
            }}
          >
            <option
              value={`${connectionId ?? ""}|${source.model ?? command?.model ?? ""}`}
            >
              {source.model ?? command?.model ?? "未选择模型"}
            </option>
            {connections.flatMap((c) =>
              catalogForConnection(c)
                .filter((m) => m.kind === "image" || m.kind === "unknown")
                .map((m) => (
                  <option key={`${c.id}|${m.id}`} value={`${c.id}|${m.id}`}>
                    {c.displayName} · {m.id}
                  </option>
                )),
            )}
          </select>
        </label>
        <span>
          Enter 发送 · Shift+Enter 换行{uploading ? " · 正在归档参考图…" : ""}
        </span>
      </div>
    </div>
  );
}
