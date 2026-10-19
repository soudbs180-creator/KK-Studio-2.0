import UiIcon, { type UiIconName } from "./UiIcon";

const ICONS = {
  add: "add",
  archive: "archive",
  skill: "extensions",
  workflow: "workflow",
  chat: "chat",
  assets: "folder",
  tasks: "tasks",
  search: "search",
  toggle: "previous",
  expand: "next",
  settings: "settings",
} as const satisfies Record<string, UiIconName>;

export type SidebarIconName = keyof typeof ICONS;

export default function SidebarIcon({ name }: { name: SidebarIconName }) {
  return (
    <span className={`sidebar-icon sidebar-icon-${name}`} aria-hidden="true">
      <UiIcon name={ICONS[name]} />
    </span>
  );
}
