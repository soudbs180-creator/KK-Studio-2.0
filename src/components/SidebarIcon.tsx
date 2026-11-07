import UiIcon, { type UiIconName } from "./UiIcon";

const ICONS: Record<string, UiIconName> = {
  add: "plus",
  archive: "archive",
  skill: "puzzle",
  workflow: "workflow",
  chat: "message-square",
  assets: "image",
  tasks: "clipboard-list",
  search: "search",
  toggle: "panel-left-close",
  expand: "panel-left-open",
  settings: "settings",
};

/** Collapsed rail uses the 02 Lucide masters at the 16px slot inside a 32px control. */
export default function SidebarIcon({ name }: { name: string }) {
  const icon = ICONS[name] ?? "circle-help";
  return (
    <span
      className={`sidebar-icon sidebar-icon-${name}`}
      data-icon={icon}
      aria-hidden="true"
    >
      <UiIcon name={icon} size={16} />
    </span>
  );
}
