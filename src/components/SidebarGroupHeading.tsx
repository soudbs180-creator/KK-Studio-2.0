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
        <img
          className="sidebar-heading-chevron"
          src="/design/figma/project-chevron.svg"
          alt=""
        />
      </button>
      <div className="project-groups-actions">
        <button
          className="project-groups-action"
          aria-label="打开未分组项目库"
          onClick={onOpenLibrary}
        >
          <img
            src="/design/figma/project-open-container.svg"
            width="20"
            height="21"
            alt=""
          />
        </button>
        <button
          className="project-groups-action"
          aria-label="创建未分组项目"
          disabled={!canCreateProject}
          title={canCreateProject ? "创建本地项目" : "项目存储尚未就绪"}
          onClick={onCreateProject}
        >
          <img
            src="/design/figma/project-add-container.svg"
            width="20"
            height="21"
            alt=""
          />
        </button>
      </div>
    </div>
  );
}
