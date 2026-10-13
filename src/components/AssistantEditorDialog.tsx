import { useId, useRef, useState, type FormEvent } from "react";
import { ZodError } from "zod";
import Modal from "./Modal.tsx";
import {
  ASSISTANT_CATEGORIES,
  saveAssistantProfile,
  type AssistantCategory,
} from "../features/assistants/assistantProfiles.ts";
import type {
  SkillRecord,
  SkillRegistry,
} from "../features/skills/skillRegistry.ts";

export default function AssistantEditorDialog({
  registry,
  record,
  disabled = false,
  onClose,
  onSaved,
}: {
  registry: SkillRegistry;
  record: SkillRecord | null;
  disabled?: boolean;
  onClose: () => void;
  onSaved: (record: SkillRecord) => void;
}) {
  const hintId = useId();
  const readOnly = Boolean(record && record.manifest.source !== "local");
  const initialCategory =
    ASSISTANT_CATEGORIES.find(
      (category) => record?.manifest.category === "助手 · " + category,
    ) ?? "编程";
  const [name, setName] = useState(record?.manifest.name ?? "");
  const [category, setCategory] = useState<AssistantCategory>(initialCategory);
  const [instructions, setInstructions] = useState(record?.instructions ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const title = readOnly
    ? "查看内置助手"
    : record
      ? "编辑自定义助手"
      : "新建自定义助手";
  function save(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (disabled || readOnly || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    let saved: SkillRecord;
    try {
      saved = saveAssistantProfile(registry, {
        id: record?.manifest.id,
        name,
        category,
        instructions,
      });
    } catch (failure) {
      const message =
        failure instanceof ZodError
          ? failure.issues.map((issue) => issue.message).join("；")
          : failure instanceof Error
            ? failure.message
            : "请检查本地存储后重试。";
      setError("助手保存失败：" + message);
      saveLock.current = false;
      setSaving(false);
      return;
    }
    onSaved(saved);
  }
  return (
    <Modal
      title={title}
      className="catalog-tutorial skill-editor assistant-editor"
      onClose={onClose}
    >
      <form className="assistant-editor-form" onSubmit={save}>
        <h2>{title}</h2>
        <p id={hintId}>
          {readOnly
            ? "内置助手仅供查看。需要自己的指令时，请新建自定义助手。"
            : "指令最多 3000 字符；使用当前模型与工具权限。请勿填入密钥和凭据。"}
        </p>
        <label>
          助手名称
          <input
            className="ui-input"
            value={name}
            required
            maxLength={120}
            readOnly={readOnly}
            disabled={disabled || saving}
            aria-describedby={hintId}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          助手分类
          <select
            className="ui-input"
            value={category}
            disabled={readOnly || disabled || saving}
            onChange={(event) =>
              setCategory(event.target.value as AssistantCategory)
            }
          >
            {ASSISTANT_CATEGORIES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          助手指令
          <textarea
            className="ui-input"
            value={instructions}
            rows={8}
            required
            maxLength={3000}
            readOnly={readOnly}
            disabled={disabled || saving}
            aria-describedby={hintId}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </label>
        {error && (
          <p className="assistant-editor-error" role="alert">
            {error}
          </p>
        )}
        {disabled && <p role="status">当前任务执行中，暂不能保存助手。</p>}
        <div className="assistant-editor-actions">
          {!readOnly && (
            <button
              type="submit"
              className="primary-button"
              disabled={disabled || saving}
            >
              {saving ? "保存中…" : "保存助手"}
            </button>
          )}
          <button type="button" className="ui-button" onClick={onClose}>
            {readOnly ? "关闭" : "取消"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
