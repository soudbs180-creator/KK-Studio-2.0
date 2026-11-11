import { useState } from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { ImageCapabilityId } from "../../../packages/creation-contracts/index.ts";
import ImageCapabilityDialog from "./ImageCapabilityDialog.tsx";
export default function ImageCapabilityActions({
  source,
}: {
  source: CanvasCollectionItem;
}) {
  const [capability, setCapability] = useState<ImageCapabilityId>();
  return (
    <>
      {(
        [
          ["image.outpaint", "扩图"],
          ["image.upscale", "高清修复"],
          ["image.layer-split", "图层拆分"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className="kk-button kk-button--tertiary"
          onClick={() => setCapability(id)}
        >
          {label}
        </button>
      ))}
      <ImageCapabilityDialog
        source={source}
        capabilityId={capability}
        onClose={() => setCapability(undefined)}
      />
    </>
  );
}
