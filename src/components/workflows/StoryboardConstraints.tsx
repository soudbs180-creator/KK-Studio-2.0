import { Select } from "../ui/Select.tsx";
import type { ContinuityConstraint } from "../../domain/storyboardPipeline.ts";

export interface ContinuityDraft {
  characterName: string;
  kind: NonNullable<ContinuityConstraint["kind"]>;
  attributes: string;
}

export default function StoryboardConstraints({
  value,
  onChange,
  disabled,
}: {
  value: ContinuityDraft[];
  onChange(value: ContinuityDraft[]): void;
  disabled: boolean;
}) {
  const update = (index: number, patch: Partial<ContinuityDraft>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <fieldset disabled={disabled}>
      <legend>一致性约束</legend>
      <p>为角色、服装、场景或道具指定每次出镜都要保留的特征。</p>
      {value.map((row, index) => (
        <div key={index} className="storyboard-constraint-row">
          <Select
            aria-label={`约束 ${index + 1} 类型`}
            disabled={disabled}
            value={row.kind}
            options={[
              { value: "character", label: "角色" },
              { value: "costume", label: "服装" },
              { value: "scene", label: "场景" },
              { value: "prop", label: "道具" },
            ]}
            onChange={(kind) => update(index, { kind })}
          />
          <label>
            名称
            <input
              value={row.characterName}
              maxLength={160}
              onChange={(e) => update(index, { characterName: e.target.value })}
            />
          </label>
          <label>
            固定特征
            <input
              value={row.attributes}
              maxLength={4000}
              placeholder="如：红色外套、银色纽扣"
              onChange={(e) => update(index, { attributes: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="ui-button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            移除约束 {index + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="ui-button"
        disabled={disabled || value.length >= 128}
        onClick={() =>
          onChange([
            ...value,
            { characterName: "", kind: "character", attributes: "" },
          ])
        }
      >
        添加约束
      </button>
    </fieldset>
  );
}
