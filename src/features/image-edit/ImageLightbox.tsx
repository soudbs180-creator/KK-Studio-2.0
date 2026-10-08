import { useContext, useState } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import Modal from "../../components/Modal.tsx";
import {
  CanvasImageCommandContext,
  CanvasImageNodeContext,
} from "../creation/CanvasImageCommand.tsx";
import ImageEditor from "./ImageEditor.tsx";
import ImageLightboxStage from "./ImageLightboxStage.tsx";

import { useAvailableImageHeight } from "./useAvailableImageHeight.ts";

export default function ImageLightbox({
  source,
  onClose,
  title,
}: {
  source: CanvasCollectionItem;
  onClose: () => void;
  title: string;
}) {
  const command = useContext(CanvasImageCommandContext),
    [id, setId] = useState(source.id),
    [editing, setEditing] = useState(false),
    [dimensions, setDimensions] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const items = command?.items ?? [source],
    current = items.find((item) => item.id === id) ?? source;
  // Include source/sibling/descendant images from the same editing lineage.
  const relatedIds = new Set([source.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of command?.tasks ?? []) {
      const resultIds = items
        .filter(
          (item) =>
            item.id.includes(`-${task.id}-result-`) ||
            item.id === task.resultItemId,
        )
        .map((item) => item.id);
      if (
        relatedIds.has(task.sourceItemId ?? "") ||
        resultIds.some((result) => relatedIds.has(result))
      ) {
        for (const candidate of [task.sourceItemId, ...resultIds])
          if (candidate && !relatedIds.has(candidate)) {
            relatedIds.add(candidate);
            changed = true;
          }
      }
    }
  }
  const references = new Set(current.imageEditContext?.referenceAssetIds ?? []),
    related = items.filter(
      (item) =>
        item.kind === "image" &&
        item.assetId &&
        (relatedIds.has(item.id) || references.has(item.assetId)),
    );
  const height = useAvailableImageHeight();
  function select(next: string) {
    setId(next);
    setDimensions("");
    setConfirmDelete(false);
  }
  const task = command?.tasks.find(
    (task) =>
      task.resultItemId === current.id ||
      current.id.includes(`-${task.id}-result-`),
  );
  return (
    <Modal
      style={height}
      title={editing ? "重绘参考图片" : `预览${title}`}
      onClose={() => (editing ? setEditing(false) : onClose())}
      className={
        editing ? "image-edit-modal" : "demo-preview-modal image-lightbox-modal"
      }
    >
      <div
        style={height}
        className={editing ? "image-editor-host" : "image-lightbox"}
      >
        <CanvasImageNodeContext.Provider value={current}>
          {editing ? (
            <ImageEditor
              key={current.assetId}
              source={current}
              onClose={() => setEditing(false)}
            />
          ) : (
            <>
              <header>
                <h2>{current.title}</h2>
                <button
                  className="ui-button"
                  aria-label="关闭素材预览"
                  onClick={onClose}
                >
                  关闭
                </button>
              </header>
              <ImageLightboxStage
                key={current.assetId}
                source={current}
                onDimensions={setDimensions}
                onSwitch={(delta) => {
                  const index = related.findIndex(
                      (item) => item.id === current.id,
                    ),
                    next = related[index + delta];
                  if (next) select(next.id);
                }}
              />
              {related.length > 1 && (
                <nav className="image-lightbox-strip" aria-label="相关图片">
                  {related.map((item) => (
                    <button
                      key={item.id}
                      aria-label={`查看${item.title}`}
                      aria-current={item.id === current.id}
                      onClick={() => select(item.id)}
                    >
                      <img
                        src={item.preview ?? item.result?.src}
                        alt={item.title}
                      />
                    </button>
                  ))}
                </nav>
              )}
              <footer>
                <div className="image-lightbox-info">
                  {current.model ?? "本地原件"} · {current.description}
                  {dimensions && ` · ${dimensions}`}
                </div>
                <a
                  className="ui-button"
                  href={current.preview ?? current.result?.src}
                  download={`${current.title}.${/^data:image\/jpeg;/.test(current.preview ?? current.result?.src ?? "") ? "jpg" : /^data:image\/webp;/.test(current.preview ?? current.result?.src ?? "") ? "webp" : /^data:image\/gif;/.test(current.preview ?? current.result?.src ?? "") ? "gif" : "png"}`}
                >
                  下载素材
                </a>
                <button
                  className="ui-button"
                  aria-label="重绘当前图片"
                  onClick={() => setEditing(true)}
                >
                  重绘
                </button>
                <button
                  className="ui-button"
                  disabled={
                    !task ||
                    !command?.regenerateTask ||
                    command.tasks.some((task) =>
                      ["queued", "running"].includes(task.status),
                    )
                  }
                  title={
                    !task
                      ? "本地原件没有生成任务，请使用重绘"
                      : "按原任务快照生成新候选"
                  }
                  onClick={() => {
                    if (task) command?.regenerateTask?.(task.id);
                  }}
                >
                  重新生成
                </button>
                <button
                  className="ui-button is-danger"
                  disabled={!command?.deleteItem}
                  onClick={() => setConfirmDelete(true)}
                >
                  删除图片
                </button>
              </footer>
              {confirmDelete && (
                <div role="alert">
                  删除当前画布图片？原件仍保留在素材库。
                  <button
                    className="ui-button"
                    onClick={() => setConfirmDelete(false)}
                  >
                    保留图片
                  </button>
                  <button
                    className="ui-button is-danger"
                    onClick={() => {
                      command?.deleteItem?.(current.id);
                      const index = related.findIndex(
                          (item) => item.id === current.id,
                        ),
                        next = related[index + 1] ?? related[index - 1];
                      if (next) select(next.id);
                      else onClose();
                    }}
                  >
                    确认删除图片
                  </button>
                </div>
              )}
            </>
          )}
        </CanvasImageNodeContext.Provider>
      </div>
    </Modal>
  );
}
