import { useLayoutEffect, useRef, type RefObject } from "react";
import type { CanvasReference } from "../../domain/canvasItems";
import UiIcon from "../UiIcon";
import Modal from "../Modal";
import ReferenceMedia from "./ReferenceMedia";
import { referencePreviewPosition } from "./referenceLayout";

export function ReferenceFullscreen({
  reference,
  onClose,
}: {
  reference: CanvasReference;
  onClose: () => void;
}) {
  return (
    <Modal
      title={`预览参考素材：${reference.title}`}
      onClose={onClose}
      className="reference-fullscreen"
    >
      <header>
        <span title={reference.title}>{reference.title}</span>
        <button type="button" aria-label="关闭参考素材预览" onClick={onClose}>
          <UiIcon name="close" size={20} />
        </button>
      </header>
      <div className="reference-fullscreen-media">
        <ReferenceMedia reference={reference} controls />
      </div>
    </Modal>
  );
}

/** The native top layer escapes scroll clipping while retaining inert ancestry. */
export default function ReferencePreview({
  reference,
  anchor,
  onClose,
  onKeepOpen,
  onLeave,
  onFullscreen,
}: {
  reference: CanvasReference;
  anchor: RefObject<HTMLButtonElement>;
  onClose: () => void;
  onKeepOpen: () => void;
  onLeave: () => void;
  onFullscreen: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const popup = ref.current;
    const trigger = anchor.current;
    if (!popup || !trigger || typeof popup.showPopover !== "function") return;
    popup.setAttribute("popover", "auto");
    const closed = () => {
      if (!popup.matches(":popover-open")) onClose();
    };
    popup.addEventListener("toggle", closed);
    popup.showPopover();
    const place = () => {
      const position = referencePreviewPosition(
        trigger.getBoundingClientRect(),
        popup.getBoundingClientRect(),
        { width: innerWidth, height: innerHeight },
      );
      popup.style.left = position.left + "px";
      popup.style.top = position.top + "px";
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(popup);
    observer.observe(trigger);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      popup.removeEventListener("toggle", closed);
      if (popup.matches(":popover-open")) popup.hidePopover();
    };
  }, [anchor, onClose]);
  return (
    <div
      ref={ref}
      className="reference-preview-popover"
      role="dialog"
      aria-label={`参考素材预览：${reference.title}`}
      onPointerEnter={onKeepOpen}
      onPointerLeave={onLeave}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="reference-preview-media">
        <ReferenceMedia reference={reference} />
      </div>
      <p className="reference-preview-title" title={reference.title}>
        {reference.title}
      </p>
      <div className="reference-preview-actions">
        <button
          type="button"
          disabled
          title="定位参考节点：当前入口尚未接入"
          aria-label="定位参考节点：当前入口尚未接入"
        >
          <span className="reference-locate-glyph" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled
          className="reference-preview-replace"
          title="原位替换尚未接入；可移除后重新添加"
        >
          替换
        </button>
        <button
          type="button"
          onClick={onFullscreen}
          aria-label="全屏预览参考素材"
          title="全屏预览"
        >
          <UiIcon name="preview" size={20} />
        </button>
      </div>
    </div>
  );
}
