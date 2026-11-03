import type { ImageCapabilityId } from "../../../packages/creation-contracts/index.ts";
import type { useImageCapabilityDialog } from "./useImageCapabilityDialog.ts";
export default function ImageCapabilityParameters({
  capabilityId,
  state,
}: {
  capabilityId: ImageCapabilityId;
  state: ReturnType<typeof useImageCapabilityDialog>;
}) {
  const {
    record,
    checkpoint,
    setCheckpoint,
    models,
    upscaleModel,
    setUpscaleModel,
    backgroundModel,
    setBackgroundModel,
    padding,
    setPadding,
    scale,
    setScale,
  } = state;
  function modelSelect(
    label: string,
    value: string,
    choices: string[],
    change: (value: string) => void,
  ) {
    return (
      <label>
        <span>{label}</span>
        <select value={value} onChange={(event) => change(event.target.value)}>
          <option value="">
            {capabilityId === "image.upscale"
              ? "Lanczos 精确缩放（无修复模型）"
              : "未安装，请先配置模型"}
          </option>
          {choices.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <>
      {!record &&
        capabilityId === "image.outpaint" &&
        modelSelect(
          "Checkpoint 模型",
          checkpoint,
          models.checkpoints,
          setCheckpoint,
        )}
      {!record &&
        capabilityId === "image.upscale" &&
        modelSelect(
          "高清修复模型",
          upscaleModel,
          models.upscaleModels,
          setUpscaleModel,
        )}
      {!record &&
        capabilityId === "image.layer-split" &&
        modelSelect(
          "背景分离模型",
          backgroundModel,
          models.backgroundModels,
          setBackgroundModel,
        )}
      {capabilityId === "image.outpaint" && (
        <div className="image-capability-padding">
          {(["left", "right", "top", "bottom"] as const).map((side, index) => (
            <label key={side}>
              <span>{["左", "右", "上", "下"][index]}边距</span>
              <input
                type="number"
                min={0}
                max={4096}
                step={8}
                value={padding[side]}
                onChange={(event) =>
                  setPadding((value) => ({
                    ...value,
                    [side]: Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>
      )}
      {capabilityId === "image.upscale" && (
        <label>
          <span>放大倍数</span>
          <select
            value={scale}
            onChange={(event) => setScale(Number(event.target.value) as 2 | 4)}
          >
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </label>
      )}
      {capabilityId === "image.layer-split" && (
        <p>输出前景与背景两个透明图层，保留原图像素位置。</p>
      )}
    </>
  );
}
