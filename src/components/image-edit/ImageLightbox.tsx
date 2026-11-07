import { useContext, useState } from "react";
import Modal from "../Modal.tsx";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import {
  CanvasImageCommandContext,
  CanvasImageNodeContext,
} from "../../runtime/canvasCommandRuntime.tsx";
import {
  ImageLightboxStage,
  useAvailableImageHeight,
} from "../../features/image-edit/index.ts";
import ImageEditor from "./ImageEditor.tsx";

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
    allRelated = items.filter(
      (item) =>
        item.kind === "image" &&
        item.assetId &&
        (relatedIds.has(item.id) || references.has(item.assetId)),
    );
  const currentRelatedIndex = Math.max(
    0,
    allRelated.findIndex((item) => item.id === current.id),
  );
  const relatedStart = Math.max(
    0,
    Math.min(currentRelatedIndex - 2, allRelated.length - 6),
  );
  const related = allRelated.slice(relatedStart, relatedStart + 6);
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
              <div className="image-lightbox-body">
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
              </div>
              <footer>
                <div className="image-lightbox-info">
                  {current.model ?? "本地原件"} · {current.description}
                  {dimensions && ` · ${dimensions}`}
                </div>
                <a
                  className="ui-button"
                  download={`${current.title}.png`}
                  href={current.preview ?? current.result?.src}
                >
                  下载
                </a>
                {current.assetId && (
                  <button
                    className="ui-button"
                    onClick={() => setEditing(true)}
                  >
                    编辑
                  </button>
                )}
                {command?.regenerateTask && task && (
                  <button
                    className="ui-button"
                    onClick={() => {
                      command.regenerateTask?.(task.id);
                      onClose();
                    }}
                  >
                    再次生成
                  </button>
                )}
                {command?.deleteItem &&
                  (confirmDelete ? (
                    <>
                      <span>确定删除？</span>
                      <button
                        className="ui-button is-danger"
                        onClick={() => {
                          command.deleteItem?.(current.id);
                          onClose();
                        }}
                      >
                        确认删除
                      </button>
                      <button
                        className="ui-button"
                        onClick={() => setConfirmDelete(false)}
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      className="ui-button"
                      onClick={() => setConfirmDelete(true)}
                    >
                      删除
                    </button>
                  ))}
              </footer>
            </>
          )}
        </CanvasImageNodeContext.Provider>
      </div>
    </Modal>
  );
}
