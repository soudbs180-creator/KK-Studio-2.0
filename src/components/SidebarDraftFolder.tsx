import { useState } from "react";

export default function SidebarDraftFolder({ visible }: { visible: boolean }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section className="project-folder-group" hidden={!visible}>
      <button
        className="group-heading"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        新建文件夹
        <img
          className="sidebar-heading-chevron"
          src="/design/figma/project-chevron.svg"
          alt=""
        />
      </button>
      {expanded && (
        <small className="project-folder-empty">
          临时文件夹；项目归档与持久化尚未接入。
        </small>
      )}
    </section>
  );
}
