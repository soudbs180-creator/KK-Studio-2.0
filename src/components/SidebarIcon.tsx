const ASSETS: Record<string, string> = {
  add: "/design/figma/sidebar-add.svg",
  archive: "/design/figma/sidebar-archive.svg",
  skill: "/design/figma/sidebar-skill.svg",
  workflow: "/design/figma/sidebar-workflow.svg",
  chat: "/design/figma/chat-open.svg",
  search: "/design/figma/sidebar-search-container.svg",
  // The expanded state uses the filled-left variant from the Figma
  // "左展开和关闭" component. Keep the public icon name stable for the
  // sidebar button while selecting the correct state artwork here.
  toggle: "/design/figma/sidebar-collapse.svg",
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
