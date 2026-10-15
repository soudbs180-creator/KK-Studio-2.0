import type { RefObject } from "react";

export type ExtensionView = "skills" | "connectors" | "partners";
const VIEWS = [
  {
    id: "skills",
    label: "Skill",
    description: "把常用方法整理成可复用的指令。",
  },
  {
    id: "connectors",
    label: "MCP",
    description: "连接工具，让 AI 使用外部能力。",
  },
  {
    id: "partners",
    label: "协作伙伴",
    description: "按任务选择擅长该工作的 AI 角色。",
  },
] as const;

export default function SkillPageControls({
  view,
  tab,
  query,
  status,
  fileInput,
  onView,
  onTab,
  onQuery,
  onCreate,
  onImport,
  onOpenMcp,
  onOpenModels,
}: {
  view: ExtensionView;
  tab: "catalog" | "mine";
  query: string;
  status: string;
  fileInput: RefObject<HTMLInputElement>;
  onView: (view: ExtensionView) => void;
  onTab: (tab: "catalog" | "mine") => void;
  onQuery: (query: string) => void;
  onCreate: () => void;
  onImport: (file: File) => void;
  onOpenMcp?: () => void;
  onOpenModels?: () => void;
}) {
  const active = VIEWS.find((item) => item.id === view)!;
  return (
    <>
      <header className="catalog-page-header">
        <div>
          <h1>扩展</h1>
          <p>{active.description}</p>
        </div>
        <div className="catalog-page-actions">
          {view === "skills" && (
            <>
              <button
                type="button"
                className="primary-button"
                onClick={onCreate}
              >
                新建本地 Skill
              </button>
              <button
                type="button"
                className="ui-button"
                onClick={() => fileInput.current?.click()}
              >
                导入 Skill
              </button>
            </>
          )}
          {view === "connectors" && (
            <button
              type="button"
              className="primary-button"
              onClick={onOpenMcp}
              disabled={!onOpenMcp}
              title={!onOpenMcp ? "请从设置 › 扩展 › MCP 配置工具" : undefined}
            >
              配置 MCP
            </button>
          )}
          {view === "partners" && onOpenModels && (
            <button type="button" className="ui-button" onClick={onOpenModels}>
              模型接入
            </button>
          )}
          <input
            ref={fileInput}
            hidden
            type="file"
            accept=".json,.md,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </header>
      <div
        className="catalog-page-tabs catalog-page-top-tabs"
        role="tablist"
        aria-label="扩展分类"
      >
        {VIEWS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            tabIndex={view === item.id ? 0 : -1}
            aria-controls="extensions-catalog-panel"
            id={`extensions-catalog-tab-${item.id}`}
            onClick={() => onView(item.id)}
            onKeyDown={(event) => {
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? VIEWS.length - 1
                    : event.key === "ArrowRight"
                      ? (index + 1) % VIEWS.length
                      : event.key === "ArrowLeft"
                        ? (index + VIEWS.length - 1) % VIEWS.length
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              onView(VIEWS[next].id);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("[role='tab']")
                .item(next)
                .focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {status && (
        <p className="catalog-page-status" role="status">
          {status}
        </p>
      )}
      <div className="catalog-page-toolbar">
        {view === "skills" ? (
          <div
            className="catalog-page-tabs"
            role="tablist"
            aria-label="Skill分类"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "catalog"}
              onClick={() => onTab("catalog")}
            >
              全部 Skill
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "mine"}
              onClick={() => onTab("mine")}
            >
              我的 Skill
            </button>
          </div>
        ) : (
          <span className="extension-boundary">
            {view === "connectors" ? "工具与服务" : "任务角色"}
          </span>
        )}
        <label className="catalog-page-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label={`搜索 ${active.label}`}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={`搜索 ${active.label}`}
          />
        </label>
      </div>
      {view !== "partners" && (
        <details className="extension-help">
          <summary>使用说明</summary>
          <p>
            {view === "skills"
              ? "Skill 保存在当前设备，应用时把指令加入草稿。可导入 JSON / SKILL.md；启用不会自动执行脚本。"
              : "MCP 用于连接工具。请在设置中配置受信任的服务；目录中的桌面连接器安装尚未接入。"}
          </p>
        </details>
      )}
    </>
  );
}
