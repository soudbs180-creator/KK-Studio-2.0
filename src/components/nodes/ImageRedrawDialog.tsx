import { useContext } from "react";
import Modal from "../Modal";
import { CanvasImageNodeContext } from "../../features/creation/CanvasImageCommand";
import ImageEditor from "../../features/image-edit/ImageEditor.tsx";
import type { CanvasReference } from "../../domain/canvasItems";
import { useAvailableImageHeight } from "../../features/image-edit/useAvailableImageHeight.ts";

export default function ImageRedrawDialog({
  onClose,
  references,
}: {
  onClose: () => void;
  references?: CanvasReference[];
}) {
  const source = useContext(CanvasImageNodeContext);
  const height = useAvailableImageHeight();
  return (
    <Modal
      title="重绘参考图片"
      onClose={onClose}
      className="redraw-modal image-edit-modal"
      style={height}
    >
      <div className="image-editor-host" style={height}>
        {source ? (
          <ImageEditor
            source={source}
            references={references}
            onClose={onClose}
          />
        ) : (
          <p role="status">图片来源已失效，请重新打开。</p>
        )}
      </div>
    </Modal>
  );
}
