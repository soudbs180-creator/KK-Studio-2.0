import { useEffect, useMemo, useRef, useState } from "react";
import {
  applySkillInstructions,
  createSkillRegistry,
  searchSkillRecords,
  serializeSkill,
  type SkillRecord,
  type SkillRegistry,
} from "../features/skills/skillRegistry";
import SkillEditor from "./SkillEditor";
import ConnectorCatalog from "./ConnectorCatalog";
import SkillCollection from "./SkillCollection";
import SkillPageControls from "./SkillPageControls";

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

const OFFICIAL_SKILLS = [
  ["3D 动画短片", "根据故事创意完成角色、场景、镜头规划与视频整合。"],
  ["品牌宣传短片生成器", "基于品牌素材与推广目标，完成脚本、分镜和音画合成。"],
  ["极简产品广告生成器", "从产品图片和广告需求出发，输出可编辑的卖点表达。"],
  ["H3 提示词专家", "把参考素材整理成可控的多模态视频生成指令。"],
] as const;

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

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
  registry: providedRegistry,
  onApply,
  onOpenMcp,
}: {
  registry?: SkillRegistry;
  onApply?: (record: SkillRecord) => string | void;
  onOpenMcp?: () => void;
}) {
  const [localRegistry] = useState(createSkillRegistry);
  const registry = providedRegistry ?? localRegistry;
  const [, refresh] = useState(0);
  const [tab, setTab] = useState<"catalog" | "mine">("catalog");
  const [view, setView] = useState<"skills" | "connectors">("skills");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<SkillRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const importSequence = useRef(0);
  const activeReader = useRef<FileReader | null>(null);
  useEffect(() => {
    try {
      if (registry.persistenceWarning) {
        setStatus(registry.persistenceWarning);
        return;
      }
      ensureTemplates(registry);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Skill 初始化失败，原有记录未改变。",
      );
    }
    refresh((value) => value + 1);
  }, [registry]);
  useEffect(
    () => () => {
      importSequence.current += 1;
      activeReader.current?.abort();
      activeReader.current = null;
    },
    [],
  );
  const records = registry.listRecords();
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
    const sequence = ++importSequence.current;
    activeReader.current?.abort();
    if (file.size > MAX_IMPORT_BYTES) {
      setStatus("Skill 文件超过 2 MB 限制，未读取原文件。");
      return;
    }
    const reader = new FileReader();
    activeReader.current = reader;
    reader.onload = () => {
      if (sequence !== importSequence.current) return;
      try {
        const value = file.name.toLowerCase().endsWith(".json")
          ? JSON.parse(String(reader.result))
          : String(reader.result);
        registry.importSkill(value);
        redraw("Skill 已导入本地库；它只提供文本指令，不会自动执行。");
        activeReader.current = null;
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Skill 导入失败，原记录未改变。",
        );
      } finally {
        if (sequence === importSequence.current) activeReader.current = null;
      }
    };
    reader.onerror = () => {
      if (sequence === importSequence.current)
        setStatus("Skill 文件读取失败，原记录未改变。");
      if (sequence === importSequence.current) activeReader.current = null;
    };
    reader.onabort = () => {
      if (sequence === importSequence.current) activeReader.current = null;
    };
    reader.readAsText(file);
  }
  return (
    <section className="catalog-page catalog-page-skills" aria-label="Skill">
      <SkillPageControls
        view={view}
        tab={tab}
        query={query}
        status={status}
        fileInput={fileInput}
        onView={(next) => {
          setView(next);
          setQuery("");
        }}
        onTab={setTab}
        onQuery={setQuery}
        onCreate={openCreate}
        onImport={importFile}
        onOpenMcp={onOpenMcp}
      />
      {view === "skills" ? (
        <>
          {tab === "catalog" && !query.trim() && (
            <>
              <h2 className="catalog-section-title">精选示例</h2>
              <p className="catalog-page-subtitle">
                本地演示 Prototype；没有联网目录、官方安装或下载统计。
              </p>
              <div className="catalog-card-grid">
                {OFFICIAL_SKILLS.map(([name, description]) => (
                  <button
                    className="catalog-card"
                    key={name}
                    type="button"
                    onClick={() => setStatus(`已选择Skill：${name}。`)}
                  >
                    <div className="catalog-card-image">
                      <img
                        src="/fixtures/demo/blue-hour.png"
                        alt=""
                        draggable={false}
                      />
                      <span>H3</span>
                    </div>
                    <div className="catalog-card-body">
                      <strong>{name}</strong>
                      <p>{description}</p>
                      <small>KK Studio 本地演示 · Prototype · 仅本地预览</small>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          <SkillCollection
            records={visible}
            category={category}
            tab={tab}
            registry={registry}
            onCategory={setCategory}
            onApply={onApply}
            onEdit={(value) => {
              setEditing(value);
              setEditorOpen(true);
            }}
            onExport={(value) => downloadSkill(value, "markdown")}
            onStatus={redraw}
          />
        </>
      ) : (
        <ConnectorCatalog
          query={query}
          onOpenMcp={onOpenMcp}
          onStatus={setStatus}
        />
      )}
      {editorOpen && (
        <SkillEditor
          record={editing}
          onClose={() => setEditorOpen(false)}
          onSave={(value) => {
            try {
              if (editing) registry.updateSkill(editing.manifest.id, value);
              else registry.createSkill(value);
              setEditorOpen(false);
              redraw("Skill 已保存到本地库。");
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
