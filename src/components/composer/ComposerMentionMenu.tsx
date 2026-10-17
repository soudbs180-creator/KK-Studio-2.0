import { useEffect, useRef, useState } from "react";
import {
  CANVAS_REFERENCE_SLOTS,
  type CanvasReferenceSlot,
} from "../../domain/canvasItems.ts";

export interface MentionCandidate {
  id: string;
  name: string;
  preview?: string;
  slot?: CanvasReferenceSlot;
  sourceType: "canvas-node" | "attachment";
}

export default function ComposerMentionMenu({
  candidates,
  selectedIndex,
  onSelect,
  onClose,
}: {
  candidates: MentionCandidate[];
  selectedIndex: number;
  onSelect: (item: MentionCandidate, slot: CanvasReferenceSlot) => void;
  onClose?: () => void;
}) {
  void onClose;
  const listRef = useRef<HTMLDivElement>(null);
  const [activeSlot, setActiveSlot] = useState<CanvasReferenceSlot>("主体");

  useEffect(() => {
    const activeItem = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    ) as HTMLElement | null;
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (candidates.length === 0) {
    return (
      <div
        className="composer-autocomplete-menu mention-menu empty"
        role="listbox"
      >
        <span className="autocomplete-empty-tip">
          未在当前项目或附件中找到匹配图片
        </span>
      </div>
    );
  }

  return (
    <div
      className="composer-autocomplete-menu mention-menu"
      role="listbox"
      aria-label="引用参考图"
      ref={listRef}
    >
      <div className="autocomplete-header">
        <span>引用参考素材</span>
        <div className="slot-selector-quick">
          <span className="slot-label">默认角色:</span>
          {CANVAS_REFERENCE_SLOTS.filter((s) => s !== "Mask").map((slot) => (
            <button
              key={slot}
              type="button"
              className={`slot-pill ${activeSlot === slot ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveSlot(slot);
              }}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>
      <div className="autocomplete-items">
        {candidates.map((item, index) => {
          const isSelected = index === selectedIndex;
          const assignedSlot = item.slot || activeSlot;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-index={index}
              className={`autocomplete-item mention-item ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(item, assignedSlot)}
            >
              <div className="mention-thumb-box">
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt={item.name}
                    className="mention-thumb"
                  />
                ) : (
                  <div className="mention-thumb-placeholder">🖼️</div>
                )}
              </div>
              <div className="mention-info">
                <div className="mention-row">
                  <span className="item-title">{item.name}</span>
                  <span className={`slot-badge slot-${assignedSlot}`}>
                    {assignedSlot}
                  </span>
                </div>
                <div className="item-desc">
                  {item.sourceType === "canvas-node"
                    ? "画布卡片"
                    : "已上传附件"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
