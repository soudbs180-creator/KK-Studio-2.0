import SidebarProjectEntry from "./SidebarProjectEntry";

export default function SidebarProjectGroup({
  grouped,
  visible,
  selected,
  childSelected,
  onNavigate,
}: {
  grouped: boolean;
  visible: boolean;
  selected: boolean;
  childSelected: boolean;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="project-group-content" hidden={!visible}>
      <SidebarProjectEntry
        visible={visible}
        grouped={grouped}
        selected={selected}
        onNavigate={onNavigate}
      />
      {grouped && (
        <div className="project-nested-entry">
          <SidebarProjectEntry
            visible={visible}
            grouped={false}
            selected={childSelected}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}
