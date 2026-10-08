import type { RefObject } from "react";
import type { MaskDocument, MaskRegion } from "./mask.ts";
import { maskBounds } from "./mask.ts";
import ColorInstruction from "./ColorInstruction.tsx";
export default function RegionPromptOverlay({
  region,
  document,
  viewport,
  view,
  disabled,
  commit,
  onClose,
}: {
  region?: MaskRegion;
  document: MaskDocument;
  viewport: RefObject<HTMLDivElement>;
  view: { x: number; y: number; scale: number };
  disabled: boolean;
  commit: (document: MaskDocument) => void;
  onClose: () => void;
}) {
  if (!region) return null;
  const bounds = maskBounds(region.runs);
  return (
    <ColorInstruction
      region={region}
      left={Math.max(
        0,
        Math.min(
          (viewport.current?.clientWidth ?? 300) - 280,
          view.x + (bounds.x + bounds.width / 2) * view.scale,
        ),
      )}
      top={Math.max(
        0,
        Math.min(
          (viewport.current?.clientHeight ?? 200) - 96,
          view.y + (bounds.y + bounds.height / 2) * view.scale,
        ),
      )}
      disabled={disabled}
      onConfirm={(instruction) => {
        commit({
          ...document,
          regions: document.regions.map((r) =>
            r.id === region.id ? { ...r, instruction } : r,
          ),
        });
        onClose();
      }}
      onDelete={() => {
        commit({
          ...document,
          regions: document.regions.filter((r) => r.id !== region.id),
        });
        onClose();
      }}
    />
  );
}
