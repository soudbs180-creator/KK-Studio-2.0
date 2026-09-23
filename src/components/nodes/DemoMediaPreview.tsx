import { useEffect, useState } from "react";
import type { DemoResult } from "../../domain/canvasItems";
import Modal from "../Modal";
import UiIcon from "../UiIcon";

export default function DemoMediaPreview({
  result,
  onClose,
  onTextChange,
}: {
  result: DemoResult;
  onClose: () => void;
  onTextChange: (text: string) => void;
}) {
  const [text, setText] = useState(result.text ?? "");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [textUrl, setTextUrl] = useState("");
  useEffect(() => {
    if (result.kind !== "text") return;
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    setTextUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [text, result.kind]);
  const media =
    result.kind === "video" ? (
      <video
        key={retry}
        src={result.src}
        poster={result.poster}
        controls
        preload="metadata"
        onError={() => setError(true)}
      />
    ) : result.kind === "audio" ? (
      <div className="audio-preview">
        <UiIcon name="audio" size={64} />
        <audio
          key={retry}
          src={result.src}
          controls
          preload="metadata"
          onError={() => setError(true)}
        />
      </div>
    ) : result.kind === "image" ? (
      <img
        key={retry}
        src={result.src}
        alt={result.title}
        onError={() => setError(true)}
      />
    ) : (
      <textarea
        aria-label="编辑文案"
        value={text}
        maxLength={32768}
        onChange={(event) => setText(event.target.value)}
      />
    );
  return (
    <Modal
      title={`预览${result.title}`}
      onClose={onClose}
      className="demo-preview-modal"
    >
      <header>
        <div>
          <span className="demo-badge">
            {result.source === "provider" ? "已生成" : "示范素材"}
          </span>
          <h2>{result.title}</h2>
          <p>{result.description}</p>
        </div>
        <button
          className="ui-button"
          aria-label="关闭素材预览"
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className="demo-preview-media">{media}</div>
      {error && (
        <p role="alert">
          素材无法加载。
          <button
            className="ui-button"
            onClick={() => {
              setError(false);
              setRetry((value) => value + 1);
            }}
          >
            重新加载
          </button>
        </p>
      )}
      <footer>
        <a
          className="ui-button"
          href={result.kind === "text" ? textUrl : result.src}
          download={
            result.kind === "text"
              ? `${result.title}.txt`
              : result.src?.split("/").pop()
          }
        >
          <UiIcon name="download" />
          下载素材
        </a>
        {result.kind === "text" && (
          <>
            <button
              className="ui-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setFeedback("已复制文案");
                } catch {
                  setFeedback("复制未获允许，请在文本框中全选复制。");
                }
              }}
            >
              <UiIcon name="copy" />
              复制文案
            </button>
            <button
              className="ui-button"
              onClick={() => {
                if (new TextEncoder().encode(text).length > 32768) {
                  setFeedback("文案超过 32 KiB 保存上限，请缩短内容后再保存。");
                  return;
                }
                onTextChange(text);
                setFeedback("文案已更新到当前卡片");
              }}
            >
              保存文案到卡片
            </button>
          </>
        )}
        <span role="status">{feedback}</span>
      </footer>
    </Modal>
  );
}
