import type { RefObject } from "react";

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
}: {
  view: "skills" | "connectors";
  tab: "catalog" | "mine";
  query: string;
  status: string;
  fileInput: RefObject<HTMLInputElement>;
  onView: (view: "skills" | "connectors") => void;
  onTab: (tab: "catalog" | "mine") => void;
  onQuery: (query: string) => void;
  onCreate: () => void;
  onImport: (file: File) => void;
  onOpenMcp?: () => void;
}) {
  return (
    <>
      <div className="catalog-page-tabs catalog-page-top-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === "skills"}
          onClick={() => onView("skills")}
        >
          技能
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "connectors"}
          onClick={() => onView("connectors")}
        >
          连接器
        </button>
      </div>
      <header className="catalog-page-header">
        <div>
          <h1>{view === "skills" ? "Skill" : "探索连接器"}</h1>
          <p>
            {view === "skills"
              ? "管理本地指令模板；应用时会把明确文本加入草稿，不会运行脚本或调用云端服务。"
              : "选择服务，扩展 KK Studio 可访问的信息与可完成的工作。"}
          </p>
        </div>
        <div className="catalog-page-actions">
          {view === "skills" ? (
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
                导入 JSON / SKILL.md
              </button>
              <button
                type="button"
                className="ui-button"
                disabled
                title="云端 Skill 创建服务尚未接入"
              >
                通过 KK Studio 创建
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => onOpenMcp?.()}
            >
              自定义连接器
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
      <p className="catalog-page-status" role="status">
        {view === "skills"
          ? "本地 Skill 已保存到当前浏览器；没有联网安装、官方下载量或自动 Agent 运行。"
          : "连接器目录仅展示可接入的能力。桌面插件安装和远程服务授权仍需用户在 MCP 设置中明确配置。"}
      </p>
      {status && (
        <p className="catalog-page-status" role="status">
          {status}
        </p>
      )}
      <div className="catalog-page-rule" />
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
          <div
            className="catalog-page-tabs"
            role="tablist"
            aria-label="连接器筛选"
          >
            <button type="button" role="tab" aria-selected="true">
              全部连接器
            </button>
          </div>
        )}
        <label className="catalog-page-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label={view === "skills" ? "搜索 Skill" : "搜索连接器"}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={view === "skills" ? "搜索 Skill" : "搜索连接器"}
          />
        </label>
      </div>
    </>
  );
}
