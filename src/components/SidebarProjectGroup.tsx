import SidebarProjectEntry from "./SidebarProjectEntry";

export default function SidebarProjectGroup({
  grouped,
  selected,
  childSelected,
  onNavigate,
}: {
  grouped: boolean;
  selected: boolean;
  childSelected: boolean;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      <SidebarProjectEntry
        grouped={grouped}
        selected={selected}
        onNavigate={onNavigate}
      />
      {grouped && (
        <div className="project-nested-entry">
          <SidebarProjectEntry
            grouped={false}
            selected={childSelected}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </>
  );
}
