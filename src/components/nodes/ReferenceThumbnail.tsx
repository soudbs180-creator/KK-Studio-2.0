import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasReference } from "../../domain/canvasItems";
import UiIcon from "../UiIcon";
import ReferenceMedia from "./ReferenceMedia";
import ReferencePreview, { ReferenceFullscreen } from "./ReferencePreview";
import { referenceRatio } from "./referenceLayout";

export default function ReferenceThumbnail({
  reference,
  label = "",
  disabled = false,
  onAdd,
  addDisabledReason,
  onRemove,
  removeLabel = "移除参考图",
}: {
  reference?: CanvasReference;
  label?: string;
  disabled?: boolean;
  onAdd?: () => void;
  addDisabledReason?: string;
  onRemove?: (id: string) => void;
  removeLabel?: string;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [preview, setPreview] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [size, setSize] = useState({ source: "", ratio: "1:1" });
  const close = useCallback(() => setPreview(false), []);
  const keep = useCallback(() => clearTimeout(closeTimer.current), []);
  const leave = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(close, 120);
  }, [close]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const ratio = size.source === reference?.preview ? size.ratio : "1:1";
  const showFullscreen = () => {
    keep();
    anchor.current?.focus({ preventScroll: true });
    setPreview(false);
    setFullscreen(true);
  };
  return (
    <span
      className={`reference-thumb ${reference ? "composer-ref-thumb" : "is-empty"}`}
      data-ratio={ratio}
      onPointerLeave={leave}
    >
      <button
        ref={anchor}
        type="button"
        className={reference ? "reference-thumb-preview" : "reference-slot-add"}
        aria-label={
          reference ? `预览参考素材：${reference.title}` : `添加${label}参考图`
        }
        aria-haspopup={reference ? "dialog" : undefined}
        disabled={!reference && (disabled || !!addDisabledReason || !onAdd)}
        title={reference ? reference.title : addDisabledReason}
        onClick={reference ? showFullscreen : onAdd}
        onPointerEnter={(event) => {
          keep();
          if (
            reference?.preview &&
            event.pointerType === "mouse" &&
            typeof HTMLElement.prototype.showPopover === "function"
          )
            setPreview(true);
        }}
      >
        {reference ? (
          <ReferenceMedia
            reference={reference}
            onDimensions={(width, height) =>
              setSize({
                source: reference.preview ?? "",
                ratio: referenceRatio(width, height),
              })
            }
          />
        ) : (
          <UiIcon name="add" size={24} />
        )}
        {label && <span className="reference-slot-label">{label}</span>}
      </button>
      {reference?.id && onRemove && (
        <button
          type="button"
          className="reference-remove"
          disabled={disabled}
          aria-label={removeLabel}
          title={disabled ? "生成中暂不能移除参考素材" : removeLabel}
          onClick={() => {
            close();
            onRemove(reference.id!);
          }}
        >
          <UiIcon name="close" size={16} />
        </button>
      )}
      {preview && reference && (
        <ReferencePreview
          reference={reference}
          anchor={anchor}
          onClose={close}
          onKeepOpen={keep}
          onLeave={leave}
          onFullscreen={showFullscreen}
        />
      )}
      {fullscreen && reference && (
        <ReferenceFullscreen
          reference={reference}
          onClose={() => setFullscreen(false)}
        />
      )}
    </span>
  );
}
