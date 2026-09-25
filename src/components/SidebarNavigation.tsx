import SidebarIcon from "./SidebarIcon";

type NavItem = {
  id: string;
  label: string;
  compact: string;
  icon: string;
  phoneOnly?: boolean;
};

const ITEMS: NavItem[] = [
  { id: "landing", label: "开始创作", compact: "创作", icon: "add" },
  {
    id: "chat",
    label: "对话",
    compact: "对话",
    icon: "chat",
    phoneOnly: true,
  },
  { id: "projects", label: "项目库", compact: "项目", icon: "archive" },
  { id: "skills", label: "Skill", compact: "Skill", icon: "skill" },
  {
    id: "comfyui",
    label: "ComfyUI 工作流",
    compact: "工作流",
    icon: "workflow",
  },
];

/** One navigation model for a desktop rail, tablet rail and phone tab bar. */
export default function SidebarNavigation({
  active,
  compactLabels,
  onNavigate,
  phone = false,
}: {
  active: string;
  compactLabels: boolean;
  onNavigate: (id: string) => void;
  phone?: boolean;
}) {
  const items = ITEMS.filter((item) => phone || !item.phoneOnly);
  return (
    <nav className="primary-nav" aria-label="主导航">
      {items.map(({ id, label, compact, icon }) => (
        <button
          key={id}
          aria-current={active === id ? "page" : undefined}
          aria-label={label}
          title={label}
          onClick={() => onNavigate(id)}
        >
          <SidebarIcon name={icon} />
          <span className="nav-label">{compactLabels ? compact : label}</span>
        </button>
      ))}
    </nav>
  );
}
