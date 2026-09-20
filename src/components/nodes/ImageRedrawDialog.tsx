import { useState } from "react";
import Modal from "../Modal";
import { useCanvasImageGeneration } from "../../features/creation/CanvasImageCommand";
import { GenerationStatus } from "./GenerationAction";

export default function ImageRedrawDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const generation = useCanvasImageGeneration();
  const loading = generation.phase === "loading";
  return (
    <Modal title="重绘参考图片" onClose={onClose} className="redraw-modal">
      <h2>重绘参考图片</h2>
      <p className="redraw-description">
        使用已配置的图片连接编辑归档原件。生成结果另存为新节点，原图保留。
      </p>
      <textarea
        aria-label="重绘指令"
        value={prompt}
        maxLength={2000}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="例如：保留主体，将背景改成蓝调夜景"
      />
      <footer className="redraw-actions">
        <button
          type="button"
          className="ui-button"
          onClick={() => {
            if (loading) generation.cancel();
            onClose();
          }}
        >
          取消
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={loading || !generation.available}
          onClick={() => void generation.run(prompt, 1, generation.model)}
        >
          {loading ? "正在重绘…" : "开始重绘"}
        </button>
      </footer>
      <GenerationStatus generation={generation} />
    </Modal>
  );
}
