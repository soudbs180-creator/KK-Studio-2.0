import React, { useState } from "react";
import UiIcon from "../UiIcon.tsx";

export interface ChatImageCardProps {
  src: string;
  alt?: string;
  status?: "pending" | "completed" | "failed";
  prompt?: string;
  onPreview?: (src: string) => void;
  onSetReference?: (src: string) => void;
  onDownload?: (src: string) => void;
}

export default function ChatImageCard({
  src,
  alt = "AI 生成图片",
  status = "completed",
  prompt,
  onPreview,
  onSetReference,
  onDownload,
}: ChatImageCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(status === "failed");

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(src);
      return;
    }
    const link = document.createElement("a");
    link.href = src;
    link.download = `kk-generation-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSetRef = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetReference?.(src);
  };

  return (
    <div
      className={`chat-image-card ${status} ${loaded ? "is-loaded" : ""}`}
      onClick={() => onPreview?.(src)}
      role="button"
      tabIndex={0}
      aria-label={`查看图片：${alt}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview?.(src);
        }
      }}
    >
      {/* 正在生成骨架状态 */}
      {status === "pending" && !loaded && (
        <div className="chat-image-skeleton" aria-live="polite">
          <span className="chat-image-spinner" aria-hidden="true" />
          <span className="chat-image-skeleton-text">正在渲染生成中…</span>
        </div>
      )}

      {/* 图片实体 */}
      {!failed && (
        <img
          src={src}
          alt={alt}
          className="chat-image-thumb"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(true);
            setFailed(true);
          }}
        />
      )}

      {/* 失败重试状态 */}
      {failed && (
        <div className="chat-image-error">
          <UiIcon name="close" size={20} />
          <span>图片生成或加载失败</span>
        </div>
      )}

      {/* 悬停与移动端操作遮罩 */}
      <div className="chat-image-actions">
        {onSetReference && (
          <button
            type="button"
            className="chat-image-btn"
            title="设为主体参考图"
            onClick={handleSetRef}
          >
            <UiIcon name="image" size={14} />
            <span>设为参考</span>
          </button>
        )}
        <button
          type="button"
          className="chat-image-btn"
          title="全屏放大查看"
          onClick={(e) => {
            e.stopPropagation();
            onPreview?.(src);
          }}
        >
          <UiIcon name="eye" size={14} />
          <span>放大</span>
        </button>
        <button
          type="button"
          className="chat-image-btn"
          title="下载图片"
          onClick={handleDownload}
        >
          <UiIcon name="download" size={14} />
          <span>下载</span>
        </button>
      </div>

      {prompt && <div className="chat-image-prompt-badge">{prompt}</div>}
    </div>
  );
}
