import { useMemo, useRef, useState } from "react";
import {
  applySkillInstructions,
  createSkillRegistry,
  searchSkillRecords,
  serializeSkill,
  type SkillRecord,
  type SkillRegistry,
} from "../features/skills/skillRegistry";
import SkillEditor from "./SkillEditor";
import SkillRecordCard from "./SkillRecordCard";

const TEMPLATE_SKILLS = [
  {
    manifest: {
      id: "shot-planner",
      name: "镜头规划助手",
      version: "0.1.0",
      description: "把一句创意整理成可检查的镜头、主体和构图提示。",
      author: "KK Studio 本地模板",
      category: "分镜",
      permissions: ["canvas:read"],
      dependencies: [],
      source: "bundled" as const,
      readOnly: true as const,
    },
    instructions:
      "先提取主体、环境、镜头运动和画面比例，再输出 3 个可编辑镜头草稿。不要替用户提交任务。",
  },
  {
    manifest: {
      id: "product-prompt-review",
      name: "产品提示复核",
      version: "0.1.0",
      description: "检查产品图提示词中的主体、材质、背景和限制条件。",
      author: "KK Studio 本地模板",
      category: "产品",
      permissions: ["asset:inspect"],
      dependencies: [],
      source: "bundled" as const,
      readOnly: true as const,
    },
    instructions:
      "按主体、材质、光线、背景、构图和禁止项逐项复核，并把缺失项写成问题供用户补充。",
  },
] as const;

function ensureTemplates(registry: SkillRegistry): void {
  for (const template of TEMPLATE_SKILLS) {
    if (!registry.getRecord(template.manifest.id))
      registry.importSkill(template);
  }
}

function downloadSkill(record: SkillRecord, format: "json" | "markdown"): void {
  const blob = new Blob([serializeSkill(record, format)], {
    type: format === "json" ? "application/json" : "text/markdown",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    record.manifest.id + (format === "json" ? ".json" : ".SKILL.md");
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SkillsPage({
  registry = createSkillRegistry(),
  onApply,
}: {
  registry?: SkillRegistry;
  onApply?: (record: SkillRecord) => void;
}) {
  const [, refresh] = useState(0);
  const [tab, setTab] = useState<"catalog" | "mine">("catalog");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<SkillRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  ensureTemplates(registry);
  const records = registry.listRecords();
  const categories = [
    "全部",
    ...new Set(records.map((record) => record.manifest.category)),
  ];
  const visible = useMemo(
    () =>
      searchSkillRecords(
        records.filter((record) => tab === "catalog" || record.installed),
        query,
        category,
      ),
    [records, query, category, tab],
  );
  const redraw = (message: string): void => {
    setStatus(message);
    refresh((value) => value + 1);
  };
  function openCreate(): void {
    setEditing(null);
    setEditorOpen(true);
    setStatus("");
  }
  function importFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const value = file.name.toLowerCase().endsWith(".json")
          ? JSON.parse(String(reader.result))
          : String(reader.result);
        registry.importSkill(value);
        redraw("Skill 已导入本地库；它只提供文本指令，不会自动执行。");
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Skill 导入失败，原记录未改变。",
        );
      }
    };
    reader.onerror = () => setStatus("Skill 文件读取失败，原记录未改变。");
    reader.readAsText(file);
  }
  return (
    <section className="catalog-page catalog-page-skills" aria-label="Skill">
      <header className="catalog-page-header">
        <div>
          <h1>Skill</h1>
          <p>
            管理本地指令模板；应用时会把明确文本加入草稿，不会运行脚本或调用云端服务。
          </p>
        </div>
        <div className="catalog-page-actions">
          <button type="button" className="primary-button" onClick={openCreate}>
            新建本地 Skill
          </button>
          <button
            type="button"
            className="ui-button"
            onClick={() => fileInput.current?.click()}
          >
            导入 JSON / SKILL.md
          </button>
          <input
            ref={fileInput}
            hidden
            type="file"
            accept=".json,.md,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importFile(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </header>
      <p className="catalog-page-status" role="status">
        本地 Skill 已保存到当前浏览器；没有联网安装、官方下载量或自动 Agent
        运行。
      </p>
      {status && (
        <p className="catalog-page-status" role="status">
          {status}
        </p>
      )}
      <div className="catalog-page-rule" />
      <div className="catalog-page-toolbar">
        <div
          className="catalog-page-tabs"
          role="tablist"
          aria-label="Skill分类"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "catalog"}
            onClick={() => setTab("catalog")}
          >
            全部 Skill
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mine"}
            onClick={() => setTab("mine")}
          >
            我的 Skill
          </button>
        </div>
        <label className="catalog-page-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="搜索 Skill"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索 Skill"
          />
        </label>
      </div>
      <div className="catalog-categories" role="list" aria-label="Skill分类">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? "is-selected" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <h2 className="catalog-section-title">
        {tab === "mine" ? "我的 Skill" : "本地模板与已导入"}
      </h2>
      <div className="catalog-card-grid">
        {visible.map((record) => (
          <SkillRecordCard
            key={record.manifest.id}
            record={record}
            registry={registry}
            onApply={onApply}
            onEdit={(value) => {
              setEditing(value);
              setEditorOpen(true);
            }}
            onExport={(value) => downloadSkill(value, "markdown")}
            onStatus={redraw}
          />
        ))}
      </div>
      {!visible.length && (
        <div className="catalog-empty" role="status">
          <strong>没有匹配的 Skill</strong>
          <p>可以新建本地模板，或导入受限的 JSON / SKILL.md。</p>
        </div>
      )}
      {editorOpen && (
        <SkillEditor
          record={editing}
          onClose={() => setEditorOpen(false)}
          onSave={(value) => {
            try {
              const saved = editing
                ? registry.updateSkill(editing.manifest.id, value)
                : registry.createSkill(value);
              setEditorOpen(false);
              redraw("Skill 已保存到本地库。");
              if (onApply) onApply(saved);
            } catch (error) {
              setStatus(
                error instanceof Error
                  ? error.message
                  : "Skill 保存失败，原记录未改变。",
              );
            }
          }}
        />
      )}
    </section>
  );
}

export { applySkillInstructions };
