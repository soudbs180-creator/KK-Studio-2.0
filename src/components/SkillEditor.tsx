import { useEffect, useRef, useState } from "react";
import type { SkillRecord } from "../features/skills/skillRegistry";

export default function SkillEditor({
  record,
  onClose,
  onSave,
}: {
  record: SkillRecord | null;
  onClose: () => void;
  onSave: (value: {
    manifest: {
      id: string;
      name: string;
      version: string;
      description: string;
      author: string;
      category: string;
    };
    instructions: string;
    imports?: string[];
  }) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [name, setName] = useState(record?.manifest.name ?? "");
  const [id, setId] = useState(record?.manifest.id ?? "");
  const [version, setVersion] = useState(record?.manifest.version ?? "0.1.0");
  const [description, setDescription] = useState(
    record?.manifest.description ?? "",
  );
  const [author, setAuthor] = useState(record?.manifest.author ?? "本地");
  const [category, setCategory] = useState(record?.manifest.category ?? "本地");
  const [instructions, setInstructions] = useState(record?.instructions ?? "");
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      ref={dialogRef}
      className="catalog-tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="编辑本地 Skill"
      tabIndex={-1}
    >
      <div className="settings-detail-stack">
        <h2>{record ? "编辑 Skill" : "新建本地 Skill"}</h2>
        <p>
          只保存指令文本和非敏感元数据。不要粘贴 API Key、令牌或可执行脚本。
        </p>
        <label>
          ID
          <input
            value={id}
            onChange={(event) => setId(event.target.value)}
            disabled={Boolean(record)}
          />
        </label>
        <label>
          名称
          <input
            ref={firstFieldRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          版本
          <input
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          />
        </label>
        <label>
          描述
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          作者
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </label>
        <label>
          分类
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>
        <label>
          指令文本
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            maxLength={12000}
            rows={8}
          />
        </label>
        <div className="settings-action-group">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              onSave({
                manifest: { id, name, version, description, author, category },
                instructions,
              })
            }
          >
            保存 Skill
          </button>
          <button type="button" className="ui-button" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
