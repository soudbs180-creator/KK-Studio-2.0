import { useEffect, useId, useState } from "react";
import {
  SKILLS_CHANGED_EVENT,
  type SkillRecord,
  type SkillRegistry,
} from "../features/skills/skillRegistry.ts";
import {
  ASSISTANT_CATEGORIES,
  listAssistantProfiles,
} from "../features/assistants/assistantProfiles.ts";
import AssistantEditorDialog from "./AssistantEditorDialog.tsx";

export interface AssistantPickerProps {
  registry: SkillRegistry;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  onStatus: (message: string) => void;
  disabled?: boolean;
}

function unavailableReason(record: SkillRecord): string {
  if (!record.installed) return "未安装";
  if (!record.enabled) return "已禁用";
  return "";
}

export default function AssistantPicker({
  registry,
  selectedId,
  onSelect,
  onStatus,
  disabled = false,
}: AssistantPickerProps) {
  const noteId = useId();
  const [, refresh] = useState(0);
  const [editing, setEditing] = useState<SkillRecord | null | undefined>(
    undefined,
  );
  useEffect(() => {
    const changed = () => refresh((revision) => revision + 1);
    window.addEventListener(SKILLS_CHANGED_EVENT, changed);
    return () => window.removeEventListener(SKILLS_CHANGED_EVENT, changed);
  }, [registry]);
  const profiles = listAssistantProfiles(registry.listRecords());
  const selected = profiles.find((record) => record.manifest.id === selectedId);
  const selectionReason = selected
    ? unavailableReason(selected)
    : selectedId
      ? "已移除"
      : "";
  const note = disabled
    ? "当前任务执行中，完成后可调整助手。"
    : selectionReason
      ? "当前助手" + selectionReason + "，请重新选择或在技能设置中恢复。"
      : "助手提供任务指令，使用当前模型与工具权限。";
  function select(id: string): void {
    if (disabled) return;
    if (!id) {
      onSelect(undefined);
      onStatus("已切回默认助手。");
      return;
    }
    const record = registry.getRecord(id);
    if (
      !record ||
      !profiles.some((item) => item.manifest.id === id) ||
      unavailableReason(record)
    ) {
      onStatus("助手尚未安装或已禁用，请先恢复后再选择。");
      return;
    }
    onSelect(id);
    onStatus(
      "已选择" + record.manifest.name + "，模型与工具权限保持当前设置。",
    );
  }
  function saved(record: SkillRecord): void {
    setEditing(undefined);
    refresh((revision) => revision + 1);
    if (record.installed && record.enabled) onSelect(record.manifest.id);
    onStatus(
      record.installed && record.enabled
        ? "助手已保存在本机并选中。"
        : "助手已保存在本机，安装或启用后才能选择。",
    );
  }
  return (
    <div className="assistant-picker">
      <div className="assistant-picker-controls">
        <label className="assistant-picker-field">
          <span>助手</span>
          <select
            aria-label="对话助手"
            aria-describedby={noteId}
            value={selectedId ?? ""}
            disabled={disabled}
            onChange={(event) => select(event.target.value)}
          >
            <option value="">默认助手</option>
            {selectedId && !selected && (
              <option value={selectedId} disabled>
                已移除助手
              </option>
            )}
            {ASSISTANT_CATEGORIES.map((category) => (
              <optgroup key={category} label={category}>
                {profiles
                  .filter(
                    (record) =>
                      record.manifest.category === "助手 · " + category,
                  )
                  .map((record) => {
                    const reason = unavailableReason(record);
                    return (
                      <option
                        key={record.manifest.id}
                        value={record.manifest.id}
                        disabled={Boolean(reason)}
                      >
                        {record.manifest.name +
                          (reason ? "（" + reason + "）" : "")}
                      </option>
                    );
                  })}
              </optgroup>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ui-button"
          disabled={disabled}
          onClick={() => setEditing(null)}
        >
          新建助手
        </button>
        {selected && (
          <button
            type="button"
            className="ui-button"
            disabled={disabled}
            onClick={() => setEditing(selected)}
          >
            {selected.manifest.source === "local" ? "编辑助手" : "查看助手"}
          </button>
        )}
      </div>
      <p className="assistant-picker-note" id={noteId}>
        {note}
      </p>
      {editing !== undefined && (
        <AssistantEditorDialog
          key={editing?.manifest.id ?? "new"}
          registry={registry}
          record={editing}
          disabled={disabled}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
