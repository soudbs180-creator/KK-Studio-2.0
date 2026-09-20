import type { CreationDraft } from "../features/creation/model";

/** Creation options shared by the start composer and future task detail panel. */
export default function GenerationOptions({
  draft,
  onChange,
}: {
  draft: CreationDraft;
  onChange: (patch: Partial<CreationDraft>) => void;
}) {
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
          {[1, 4, 8, 16, 32].map((count) => (
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
