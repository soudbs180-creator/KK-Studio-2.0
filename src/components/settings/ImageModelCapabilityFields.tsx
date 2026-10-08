import {
  imageModelOperations,
  parseImageModelCapabilities,
  type ImageModelCapabilities,
  type ImageModelOperation,
} from "../../domain/imageModelCapabilities";
import type { CapabilitySupport } from "../../features/models/imageModelCapabilities";

export type ImageCapabilityDraft = Record<
  ImageModelOperation,
  CapabilitySupport
> & {
  maxReferences: string;
  maxGenerationCount: string;
};
const operationLabels: Record<ImageModelOperation, string> = {
  generate: "图片生成能力",
  edit: "参考图编辑能力",
  inpaint: "蒙版局部编辑能力",
  outpaint: "扩图能力",
};
export function imageCapabilityDraft(
  image?: ImageModelCapabilities,
): ImageCapabilityDraft {
  const operations = Object.fromEntries(
    imageModelOperations.map((key) => [
      key,
      image?.[key] === undefined
        ? "unknown"
        : image[key]
          ? "supported"
          : "unsupported",
    ]),
  ) as Record<ImageModelOperation, CapabilitySupport>;
  return {
    ...operations,
    maxReferences:
      image?.maxReferences === undefined ? "" : String(image.maxReferences),
    maxGenerationCount:
      image?.maxGenerationCount === undefined
        ? ""
        : String(image.maxGenerationCount),
  };
}
export function imageDeclarationFromDraft(
  draft: ImageCapabilityDraft,
): ImageModelCapabilities | undefined {
  const values: Record<string, unknown> = {};
  for (const operation of imageModelOperations)
    if (draft[operation] !== "unknown")
      values[operation] = draft[operation] === "supported";
  for (const key of ["maxReferences", "maxGenerationCount"] as const) {
    const text = draft[key].trim();
    if (!text) continue;
    const value = Number(text);
    if (
      !/^\d+$/.test(text) ||
      !Number.isInteger(value) ||
      value < (key === "maxReferences" ? 0 : 1) ||
      value > 64
    )
      throw new Error(
        key === "maxReferences"
          ? "参考图数量上限请填写 0 至 64 的整数；留空表示未声明。"
          : "单次任务生成数量上限请填写 1 至 64 的整数；留空表示未声明。",
      );
    values[key] = value;
  }
  return parseImageModelCapabilities(values);
}

export default function ImageModelCapabilityFields({
  value,
  onChange,
  disabled,
}: {
  value: ImageCapabilityDraft;
  onChange: (value: ImageCapabilityDraft) => void;
  disabled?: boolean;
}) {
  return (
    <>
      {imageModelOperations.map((operation) => (
        <label key={operation}>
          {operationLabels[operation]}
          <select
            aria-label={operationLabels[operation]}
            value={value[operation]}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                [operation]: event.target.value as CapabilitySupport,
              })
            }
          >
            <option value="unknown">未声明</option>
            <option value="supported">支持</option>
            <option value="unsupported">不支持</option>
          </select>
        </label>
      ))}
      <label>
        参考图数量上限
        <input
          aria-label="参考图数量上限"
          type="number"
          min={0}
          max={64}
          step={1}
          disabled={disabled}
          value={value.maxReferences}
          placeholder="留空未声明；0 表示不接收参考图"
          onChange={(event) =>
            onChange({ ...value, maxReferences: event.target.value })
          }
        />
      </label>
      <label>
        单次任务生成数量上限
        <input
          aria-label="单次任务生成数量上限"
          type="number"
          min={1}
          max={64}
          step={1}
          disabled={disabled}
          value={value.maxGenerationCount}
          placeholder="留空表示未声明"
          onChange={(event) =>
            onChange({ ...value, maxGenerationCount: event.target.value })
          }
        />
      </label>
      <p>
        蒙版与扩图执行尚未接通，当前仅保存声明。参考图上限包含编辑原图；生成数量上限限制一次任务。
      </p>
    </>
  );
}
