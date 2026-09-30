import type { CreationProject } from "../creation/model";

/** 项目条目来自 CreationSnapshot；文件夹收纳仍是会话内状态。 */

/**
 * 项目行左侧缩略图（按内容类型区分，用户 2026-09-24 第四轮口径）：
 * - image：主要生成内容为图片 → 显示内容图片缩略图；
 * - chat：纯文案对话项目 → 纯色块 + 聊天图标；
 * - color：创建但尚未生成任何内容 → 纯色块（颜色随机）。
 */
export type SidebarProjectVisual =
  | { kind: "image"; src: string }
  | { kind: "chat"; color: string }
  | { kind: "color"; color: string };

export interface SidebarProjectItem {
  /** 真实项目 ID，用于拖拽、打开和列表 key。 */
  id: string;
  title: string;
  /** 由项目内容派生的缩略图视觉。 */
  visual?: SidebarProjectVisual;
}

export interface SidebarFolderItem {
  id: string;
  /** 会话内删除可撤销；删除期间成员回到未分组。 */
  deleted?: boolean;
  /** 新建时按顺序命名："新建文件夹"、"新建文件夹 2"… */
  title: string;
  /** 是否展开二级条目 */
  expanded: boolean;
  /** 从"未分组"拖入收纳的项目 */
  children: SidebarProjectItem[];
}

export type SidebarSortMode = "manual" | "recent" | "priority";

/** 会话置顶先于所选排序；原有顺序沿用快照中的稳定项目顺序。 */
export function sortSidebarProjects(
  items: SidebarProjectItem[],
  projects: CreationProject[],
  pinnedIds: Set<string>,
  mode: SidebarSortMode,
): SidebarProjectItem[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  function priority(id: string): number {
    const tasks = byId.get(id)?.tasks ?? [];
    if (tasks.some((task) => task.status === "unknown")) return 3;
    if (tasks.some((task) => task.status === "failed")) return 2;
    if (tasks.some((task) => ["queued", "running"].includes(task.status)))
      return 1;
    return 0;
  }
  return [...items].sort((a, b) => {
    const pinned = Number(pinnedIds.has(b.id)) - Number(pinnedIds.has(a.id));
    if (pinned) return pinned;
    if (mode === "priority") {
      const taskOrder = priority(b.id) - priority(a.id);
      if (taskOrder) return taskOrder;
    }
    return mode === "recent" || mode === "priority"
      ? (byId.get(b.id)?.updatedAt ?? 0) - (byId.get(a.id)?.updatedAt ?? 0)
      : 0;
  });
}

/** 删除文件夹恢复时，不抢回已被移动到其他有效文件夹的项目。 */
export function restoreSidebarFolder(
  folders: SidebarFolderItem[],
  id: string,
): SidebarFolderItem[] {
  const assigned = new Set(
    folders
      .filter((folder) => folder.id !== id && !folder.deleted)
      .flatMap((folder) => folder.children.map((child) => child.id)),
  );
  return folders.map((folder) =>
    folder.id === id
      ? {
          ...folder,
          deleted: false,
          children: folder.children.filter((child) => !assigned.has(child.id)),
        }
      : folder,
  );
}

/** 未分组项目拖拽事件使用的 MIME 类型（仅侧栏内部读取） */
export const SIDEBAR_PROJECT_DRAG_TYPE = "application/x-kk-project-id";

/** 拖拽时随附当前显示名称，确保改名后的行拖入文件夹仍保留最新标题 */
export const SIDEBAR_PROJECT_TITLE_TYPE = "application/x-kk-project-title";

/** 新建"未生成"项目缩略图的随机色板（中深色调，白色聊天图标在其上可辨） */
export const PROJECT_THUMB_COLORS = [
  "#3D6FE0",
  "#6E4FD8",
  "#0F9D8E",
  "#D97B2C",
  "#C2528A",
  "#4E8A3C",
  "#8A5A2B",
  "#3A7CA5",
] as const;

/** 随机取一个缩略图颜色（每次调用独立随机，会话内随创建固定） */
export function randomProjectColor(): string {
  return PROJECT_THUMB_COLORS[
    Math.floor(Math.random() * PROJECT_THUMB_COLORS.length)
  ];
}

/** 按真实项目 ID 固定一个颜色，避免刷新后未生成项目变色。 */
export function projectColor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PROJECT_THUMB_COLORS[hash % PROJECT_THUMB_COLORS.length];
}

export function sidebarProjectItem(
  project: CreationProject,
): SidebarProjectItem {
  const image = project.items.find((item) => {
    const src = item.preview || item.result?.src;
    return (
      item.kind === "image" &&
      item.result?.source === "provider" &&
      typeof src === "string" &&
      /^(data:image\/|blob:|https?:\/\/|\/(?!\/))/.test(src)
    );
  });
  const src = image?.preview || image?.result?.src;
  const color = projectColor(project.id);
  return {
    id: project.id,
    title: project.name,
    visual: src
      ? { kind: "image", src }
      : project.kind === "text" ||
          (project.items.length > 0 &&
            project.items.every((item) => item.kind === "text"))
        ? { kind: "chat", color }
        : { kind: "color", color },
  };
}

/** 会话内自增 id 生成器（同一渲染内多次调用保持递增） */
export function createSidebarId(): string {
  return `sidebar-project-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
