import { useLayoutEffect, useRef, useState } from "react";
import { useDismissible } from "./useDismissible";
import SidebarProjectGroups from "./SidebarProjectGroups";
import AccountPopup from "./AccountPopup";
import SidebarIcon from "./SidebarIcon";
import SidebarNavigation from "./SidebarNavigation";
import { SidebarResizeHandle } from "./ResizeHandle";
import BrandLogo from "./BrandLogo";
import { useHiddenControlFocus } from "./useHiddenControlFocus";
import type { CreationProject } from "../features/creation/model";

export default function Sidebar({
  active,
  onNavigate,
  collapsed,
  narrow,
  phone = false,
  onCollapse,
  projects,
  activeProjectId,
  canEditProjects,
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onDeleteProject,
}: {
  active: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  narrow: boolean;
  phone?: boolean;
  onCollapse: () => void;
  projects: CreationProject[];
  activeProjectId: string | null;
  canEditProjects: boolean;
  onCreateProject: () => string;
  onOpenProject: (id: string) => void;
  onRenameProject: (id: string, title: string) => void;
  onDeleteProject: (id: string) => void;
}) {
  const [menu, setMenu] = useState<"account" | "projects" | null>(null);
  const account = menu === "account";
  const projectMenuOpen = menu === "projects";
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const accountPopup = useRef<HTMLDivElement>(null);
  const projectMenu = useRef<HTMLDivElement>(null);
  const projectFilterTrigger = useRef<HTMLButtonElement>(null);
  const restoreHiddenFocus = useHiddenControlFocus(root, (previous) =>
    previous.matches(".sidebar-search") && phone
      ? document.querySelector<HTMLButtonElement>(".mobile-search")
      : toggle.current,
  );
  useLayoutEffect(() => {
    if (collapsed)
      setMenu((current) => (phone || current === "projects" ? null : current));
    if (collapsed) restoreHiddenFocus();
  }, [collapsed, phone, restoreHiddenFocus]);
  function navigate(id: string): void {
    setMenu(null);
    onNavigate(id);
    if (
      narrow &&
      !collapsed &&
      [
        "landing",
        "projects",
        "skills",
        "comfyui",
        "workspace",
        "chat",
      ].includes(id)
    )
      onCollapse();
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
      <SidebarNavigation
        active={active}
        compactLabels={phone && collapsed}
        onNavigate={navigate}
        phone={phone}
      />
      <SidebarProjectGroups
        collapsed={collapsed}
        projects={projects}
        activeProjectId={activeProjectId}
        canEditProjects={canEditProjects}
        projectMenuOpen={projectMenuOpen}
        menuRef={projectMenu}
        filterTriggerRef={projectFilterTrigger}
        onToggleProjectMenu={() => setMenu(projectMenuOpen ? null : "projects")}
        onCloseMenu={() => setMenu(null)}
        onNavigate={navigate}
        onCreateProject={onCreateProject}
        onOpenProject={(id) => {
          setMenu(null);
          onOpenProject(id);
          if (narrow && !collapsed) onCollapse();
        }}
        onRenameProject={onRenameProject}
        onDeleteProject={onDeleteProject}
      />
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
      {!collapsed && !narrow && <SidebarResizeHandle />}
    </aside>
  );
}
