const ASSETS: Record<string, string> = {
  add: "/design/figma/sidebar-add.svg",
  archive: "/design/figma/sidebar-archive.svg",
  skill: "/design/figma/sidebar-skill.svg",
  workflow: "/design/figma/sidebar-workflow.svg",
  chat: "/design/figma/chat-open.svg",
  search: "/design/figma/sidebar-search-container.svg",
  toggle: "/design/figma/sidebar-toggle.svg",
  expand: "/design/figma/sidebar-expand.svg",
  settings: "/design/figma/sidebar-settings-container.svg",
};

export default function SidebarIcon({ name }: { name: string }) {
  return (
    <span className={`sidebar-icon sidebar-icon-${name}`} aria-hidden="true">
      <img src={ASSETS[name]} alt="" draggable={false} />
    </span>
  );
}
