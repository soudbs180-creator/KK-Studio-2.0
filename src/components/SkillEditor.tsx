import { useState } from "react";
import type { SkillRecord } from "../features/skills/skillRegistry";
import Modal from "./Modal";

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
  const [name, setName] = useState(record?.manifest.name ?? "");
  const [id, setId] = useState(record?.manifest.id ?? "");
  const [version, setVersion] = useState(record?.manifest.version ?? "0.1.0");
  const [description, setDescription] = useState(
    record?.manifest.description ?? "",
  );
  const [author, setAuthor] = useState(record?.manifest.author ?? "本地");
  const [category, setCategory] = useState(record?.manifest.category ?? "本地");
  const [instructions, setInstructions] = useState(record?.instructions ?? "");
  return (
    <Modal
      className="catalog-tutorial skill-editor"
      title="编辑本地 Skill"
      onClose={onClose}
    >
      <div className="settings-detail-stack">
        <h2>{record ? "编辑 Skill" : "新建本地 Skill"}</h2>
        <p>
          只保存指令文本和非敏感元数据。不要粘贴 API Key、令牌或可执行脚本。
        </p>
        <label>
          ID
          <input
            className="ui-input"
            value={id}
            onChange={(event) => setId(event.target.value)}
            disabled={Boolean(record)}
          />
        </label>
        <label>
          名称
          <input
            className="ui-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          版本
          <input
            className="ui-input"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          />
        </label>
        <label>
          描述
          <input
            className="ui-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          作者
          <input
            className="ui-input"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </label>
        <label>
          分类
          <input
            className="ui-input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>
        <label>
          指令文本
          <textarea
            className="ui-input"
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
    </Modal>
  );
}
