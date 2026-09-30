import type { RefObject } from "react";

/**
 * 侧栏"项目"区标题行：标题（点击整体折叠/展开）+ 右侧筛选排序与
 * 新建文件夹两个操作按钮 + 显示范围/排序方式菜单。
 */
export default function SidebarProjectHeader({
  expanded,
  projectFilter,
  sortMode,
  projectMenuOpen,
  menuRef,
  filterTriggerRef,
  onToggleTitle,
  onToggleMenu,
  onCloseMenu,
  onCreateFolder,
  onFilterChange,
  onSortChange,
}: {
  expanded: boolean;
  projectFilter: "all" | "ungrouped";
  sortMode: "manual" | "recent" | "priority";
  projectMenuOpen: boolean;
  menuRef: RefObject<HTMLDivElement>;
  filterTriggerRef: RefObject<HTMLButtonElement>;
  onToggleTitle: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onCreateFolder: () => void;
  onFilterChange: (value: "all" | "ungrouped") => void;
  onSortChange: (value: "manual" | "recent" | "priority") => void;
}) {
  return (
    <div className="project-groups-header">
      <button
        type="button"
        className="project-groups-title"
        aria-expanded={expanded}
        onClick={onToggleTitle}
      >
        项目{" "}
        <img
          className="sidebar-heading-chevron"
          src="/design/figma/project-chevron.svg"
          alt=""
        />
      </button>
      <div className="project-groups-actions">
        <button
          type="button"
          ref={filterTriggerRef}
          className="project-groups-action"
          aria-label="项目显示与排序"
          aria-expanded={projectMenuOpen}
          title="项目显示与排序"
          onClick={onToggleMenu}
        >
          <img
            className="sidebar-action-glyph sidebar-action-ellipsis"
            src="/design/figma/project-ellipsis-glyph.svg"
            alt=""
          />
        </button>
        <button
          type="button"
          className="project-groups-action"
          aria-label="创建项目文件夹"
          title="创建项目文件夹（会话内 Prototype）"
          onClick={onCreateFolder}
        >
          <img
            className="sidebar-action-glyph sidebar-action-plus"
            src="/design/figma/project-plus-glyph.svg"
            alt=""
          />
        </button>
      </div>
      {projectMenuOpen && (
        <div
          ref={menuRef}
          className="project-groups-menu"
          role="menu"
          aria-label="项目显示与排序"
        >
          <div className="project-menu-section-label">显示范围</div>
          {(["all", "ungrouped"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={projectFilter === value}
              onClick={() => {
                onFilterChange(value);
                onCloseMenu();
              }}
            >
              {value === "all" ? "显示全部项目" : "仅显示未分组"}
            </button>
          ))}
          <div className="project-menu-section-label">排序方式</div>
          {(["manual", "recent", "priority"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={sortMode === value}
              title={
                value === "priority"
                  ? "状态不明、失败和进行中的任务优先"
                  : undefined
              }
              onClick={() => {
                onSortChange(value);
                onCloseMenu();
              }}
            >
              {value === "manual"
                ? "项目原有顺序"
                : value === "recent"
                  ? "最近更新"
                  : "任务状态优先"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
