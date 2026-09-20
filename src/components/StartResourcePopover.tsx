export default function StartResourcePopover({
  kind,
  onOpen,
}: {
  kind: "skill" | "plugin";
  onOpen: () => void;
}) {
  const skill = kind === "skill";
  return (
    <div
      className={`start-skill-popover ${skill ? "" : "start-plugin-popover"}`}
      role="menu"
      aria-label={skill ? "选择 Skill" : "选择插件"}
    >
      <p>
        {skill ? "当前项目还没有可用的本地 Skill。" : "当前没有已连接的插件。"}
      </p>
      <button type="button" role="menuitem" onClick={onOpen}>
        {skill ? "浏览 Skill 目录" : "管理插件连接"}
      </button>
    </div>
  );
}
