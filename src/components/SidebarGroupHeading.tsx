import UiIcon from "./UiIcon";

export default function SidebarGroupHeading({
  expanded,
  onToggle,
  onOpenLibrary,
  onCreateProject,
  canCreateProject = true,
}: {
  expanded: boolean;
  onToggle: () => void;
  onOpenLibrary: () => void;
  onCreateProject: () => void;
  canCreateProject?: boolean;
}) {
  return (
    <div className="group-heading-row">
      <button
        className="group-heading"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        未分组
        <span className="sidebar-heading-chevron">
          <UiIcon name="chevron-down" size={12} />
        </span>
      </button>
      <div className="project-groups-actions">
        <button
          className="project-groups-action"
          aria-label="打开未分组项目库"
          onClick={onOpenLibrary}
        >
          <UiIcon name="folder-open" size={16} />
        </button>
        <button
          className="project-groups-action"
          aria-label="创建未分组项目"
          disabled={!canCreateProject}
          title={canCreateProject ? "创建本地项目" : "项目存储尚未就绪"}
          onClick={onCreateProject}
        >
          <UiIcon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}
