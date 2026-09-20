import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDismissible } from "./useDismissible";
import SidebarProjectGroup from "./SidebarProjectGroup";
import SidebarGroupHeading from "./SidebarGroupHeading";
import AccountPopup from "./AccountPopup";
import SidebarIcon from "./SidebarIcon";
import BrandLogo from "./BrandLogo";

const ITEMS = [
  { id: "landing", label: "开始创作", icon: "add" },
  { id: "projects", label: "项目库", icon: "archive" },
  { id: "skills", label: "Skill", icon: "skill" },
  { id: "comfyui", label: "ComfyUI 工作流", icon: "workflow" },
];

export default function Sidebar({
  active,
  onNavigate,
  collapsed,
  narrow,
  onCollapse,
}: {
  active: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  narrow: boolean;
  onCollapse: () => void;
}) {
  const [menu, setMenu] = useState<"account" | "projects" | null>(null);
  const account = menu === "account";
  const projectMenuOpen = menu === "projects";
  const [groups, setGroups] = useState([true, true]);
  const [projectFilter, setProjectFilter] = useState<"all" | "ungrouped">(
    "all",
  );
  const [sortMode, setSortMode] = useState<"manual" | "recent" | "priority">(
    "manual",
  );
  const [folderCreated, setFolderCreated] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const accountPopup = useRef<HTMLDivElement>(null);
  const projectMenu = useRef<HTMLDivElement>(null);
  const projectFilterTrigger = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const focused = document.activeElement;
    if (
      collapsed &&
      focused instanceof HTMLElement &&
      root.current?.contains(focused) &&
      focused.getClientRects().length === 0
    ) {
      toggle.current?.focus({ preventScroll: true });
    }
  }, [collapsed]);
  function navigate(id: string): void {
    setMenu(null);
    onNavigate(id);
  }
  useDismissible(
    menu !== null,
    account ? accountPopup : projectMenu,
    () => setMenu(null),
    account ? accountTrigger : projectFilterTrigger,
  );
  useDismissible(
    narrow && !collapsed && menu === null,
    root,
    () => {
      if (!document.querySelector("dialog[open]")) onCollapse();
    },
    toggle,
  );
  return (
    <aside
      ref={root}
      aria-label="工作台侧栏"
      className={`sidebar ${collapsed ? "is-collapsed" : ""} ${narrow ? "is-narrow" : ""}`}
    >
      <div className="brand">
        <span className="logo">
          <BrandLogo />
        </span>
        <strong>KK Studio</strong>
        <button
          className="sidebar-search sidebar-control"
          aria-label="搜索"
          aria-keyshortcuts="Control+K Meta+K"
          title="搜索与收藏（Ctrl / ⌘ + K）"
          onClick={() => navigate("search")}
        >
          <SidebarIcon name="search" />
        </button>
        <button
          ref={toggle}
          className="sidebar-toggle sidebar-control"
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          aria-expanded={!collapsed}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          onClick={onCollapse}
        >
          <SidebarIcon name={collapsed ? "expand" : "toggle"} />
        </button>
      </div>
      <nav className="primary-nav" aria-label="主导航">
        {ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            aria-current={active === id ? "page" : undefined}
            aria-label={label}
            title={label}
            onClick={() => navigate(id)}
          >
            <SidebarIcon name={icon} />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="project-groups">
        <div className="project-groups-header">
          <button
            type="button"
            className="project-groups-title"
            aria-expanded={groups[0]}
            onClick={() =>
              setGroups(
                groups.map((value, index) => (index === 0 ? !value : value)),
              )
            }
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
              ref={projectFilterTrigger}
              className="project-groups-action"
              aria-label="项目显示与排序"
              aria-expanded={projectMenuOpen}
              title="项目显示与排序"
              onClick={() => setMenu(projectMenuOpen ? null : "projects")}
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
              title="创建项目文件夹"
              onClick={() => {
                setFolderCreated(true);
                setProjectFilter("all");
              }}
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
              ref={projectMenu}
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
                    setProjectFilter(value);
                    setMenu(null);
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
                    value === "priority" ? "需输入和未读任务优先" : undefined
                  }
                  onClick={() => {
                    setSortMode(value);
                    setMenu(null);
                  }}
                >
                  {value === "manual"
                    ? "手动排序"
                    : value === "recent"
                      ? "最近打开"
                      : "优先级"}
                </button>
              ))}
            </div>
          )}
        </div>
        {(["项目", "未分组"] as const).map((name, i) => {
          if (!((projectFilter === "all" && i === 0) || i === 1)) return null;
          return (
            <section key={name}>
              {i === 1 && (
                <SidebarGroupHeading
                  expanded={groups[i]}
                  onToggle={() =>
                    setGroups(groups.map((v, index) => (i === index ? !v : v)))
                  }
                  onOpenLibrary={() => navigate("projects")}
                />
              )}
              {groups[i] && (
                <SidebarProjectGroup
                  grouped={i === 0}
                  selected={active === "workspace" && selectedProject === name}
                  childSelected={
                    active === "workspace" &&
                    (selectedProject === null || selectedProject === name)
                  }
                  onNavigate={(id) => {
                    setSelectedProject(name);
                    navigate(id);
                  }}
                />
              )}
            </section>
          );
        })}
        {folderCreated && projectFilter === "all" && (
          <section className="project-folder-group">
            <button className="group-heading" aria-expanded="true">
              新建文件夹 <ChevronDown size={16} />
            </button>
            <small className="project-folder-empty">
              文件夹已创建，可从项目库中添加项目
            </small>
          </section>
        )}
      </div>
      {account && (
        <AccountPopup
          popupRef={accountPopup}
          onOpenSettings={(section = "general") => {
            accountTrigger.current?.focus({ preventScroll: true });
            navigate(`settings/${section}`);
          }}
        />
      )}
      <div className="account-row">
        <button
          ref={accountTrigger}
          className="sidebar-account sidebar-control"
          aria-label="个人信息"
          aria-expanded={account}
          onClick={() => setMenu(account ? null : "account")}
        >
          <span className="logo">
            <BrandLogo />
          </span>
          <span className="account-name" title="本地前端预览，尚未连接真实账号">
            Prototype
          </span>
        </button>
        <button
          className="sidebar-settings"
          aria-label="打开设置"
          onClick={() => navigate("settings")}
        >
          <SidebarIcon name="settings" />
        </button>
      </div>
    </aside>
  );
}
