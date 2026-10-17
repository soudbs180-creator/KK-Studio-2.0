import React, { useEffect } from "react";
import UiIcon from "../UiIcon.tsx";

export interface ChatImageLightboxProps {
  src: string;
  alt?: string;
  prompt?: string;
  onClose: () => void;
  onSetReference?: (src: string) => void;
}

export default function ChatImageLightbox({
  src,
  alt = "预览图片",
  prompt,
  onClose,
  onSetReference,
}: ChatImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = src;
    link.download = `kk-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="chat-lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="图片全屏预览"
    >
      <div
        className="chat-lightbox-container"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="chat-lightbox-header">
          <span className="chat-lightbox-title" title={prompt || alt}>
            {prompt ? prompt.slice(0, 60) : alt}
          </span>
          <div className="chat-lightbox-controls">
            {onSetReference && (
              <button
                type="button"
                className="chat-lightbox-btn"
                title="设为主体参考"
                onClick={() => {
                  onSetReference(src);
                  onClose();
                }}
              >
                <UiIcon name="image" size={16} />
                <span>设为参考</span>
              </button>
            )}
            <button
              type="button"
              className="chat-lightbox-btn"
              title="下载原图"
              onClick={handleDownload}
            >
              <UiIcon name="download" size={16} />
              <span>下载</span>
            </button>
            <button
              type="button"
              className="chat-lightbox-btn chat-lightbox-close"
              title="关闭预览 (Esc)"
              onClick={onClose}
              aria-label="关闭预览"
            >
              <UiIcon name="close" size={18} />
            </button>
          </div>
        </header>

        <div className="chat-lightbox-content">
          <img src={src} alt={alt} className="chat-lightbox-img" />
        </div>
      </div>
    </div>
  );
}
