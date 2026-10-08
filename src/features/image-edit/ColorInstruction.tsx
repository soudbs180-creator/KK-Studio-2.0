import { useEffect, useState } from "react";
import { nextColorLabel, type MaskRegion } from "./mask.ts";
export default function ColorInstruction({
  region,
  left,
  top,
  disabled,
  onConfirm,
  onDelete,
}: {
  region: MaskRegion;
  left: number;
  top: number;
  disabled: boolean;
  onConfirm: (text: string) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(region.instruction ?? "");
  useEffect(
    () => setText(region.instruction ?? ""),
    [region.id, region.instruction],
  );
  return (
    <div
      className="image-region-instruction"
      data-ui-overlay
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label>
        {nextColorLabel(region.colorName!, region.number!)}
        <input
          aria-label="色块修改意见"
          maxLength={600}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && text.trim())
              onConfirm(text.trim());
          }}
        />
      </label>
      <button
        type="button"
        className="ui-button"
        disabled={disabled || !text.trim()}
        onClick={() => onConfirm(text.trim())}
      >
        确认
      </button>
      <button
        type="button"
        className="ui-button"
        disabled={disabled}
        onClick={onDelete}
      >
        删除色块
      </button>
    </div>
  );
}
