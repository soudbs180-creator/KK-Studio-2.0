import type { CreationDraft } from "../features/creation/model";
import { useImageModelCapabilities } from "../features/models/useImageModelCapabilities";

/** Creation options shared by the start composer and future task detail panel. */
export default function GenerationOptions({
  draft,
  onChange,
}: {
  draft: CreationDraft;
  onChange: (patch: Partial<CreationDraft>) => void;
}) {
  const capabilities = useImageModelCapabilities({
    source: "api",
    model: draft.model,
    connectionId: draft.providerConnectionId,
  });
  const maximum =
    draft.kind === "image" ? capabilities.maxGenerationCount : undefined;
  const counts = [1, 4, 8, 16, 32].filter(
    (count) => maximum === undefined || count <= maximum,
  );
  if (maximum !== undefined && !counts.includes(maximum)) counts.push(maximum);
  return (
    <>
      <label className="start-count-picker">
        <span>批量</span>
        <select
          aria-label="生成数量"
          value={draft.outputCount}
          onChange={(event) =>
            onChange({ outputCount: Number(event.target.value) })
          }
        >
          {!counts.includes(draft.outputCount) && (
            <option value={draft.outputCount} disabled>
              {draft.outputCount} 张（超出当前模型上限）
            </option>
          )}
          {counts
            .sort((a, b) => a - b)
            .map((count) => (
              <option key={count} value={count}>
                {count} 张
              </option>
            ))}
        </select>
      </label>
      <label className="start-count-picker">
        <span>数据</span>
        <select
          aria-label="隐私模式"
          value={draft.privacyMode}
          onChange={(event) =>
            onChange({
              privacyMode: event.target.value as CreationDraft["privacyMode"],
            })
          }
        >
          <option value="byok_local">BYOK 本地</option>
          <option value="local_only">仅本地</option>
          <option value="platform_backed">平台额度（Prototype）</option>
        </select>
      </label>
    </>
  );
}
