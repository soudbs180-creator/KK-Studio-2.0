import type { SkillRecord } from "../features/skills/skillRegistry";

export default function StartResourcePopover({
  kind,
  onOpen,
  skills = [],
  onApplySkill,
}: {
  kind: "skill" | "plugin";
  onOpen: () => void;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => void;
}) {
  const skill = kind === "skill";
  const availableSkills = skills.filter(
    (record) => record.installed && record.enabled,
  );
  return (
    <div
      className={`start-skill-popover ${skill ? "" : "start-plugin-popover"}`}
      role="menu"
      aria-label={skill ? "选择 Skill" : "选择插件"}
    >
      {skill && availableSkills.length ? (
        <div
          className="start-skill-options"
          role="group"
          aria-label="可用本地 Skill"
        >
          <p>选择一个本地 Skill，把明确指令加入当前草稿：</p>
          {availableSkills.map((record) => (
            <button
              key={record.manifest.id}
              type="button"
              role="menuitem"
              onClick={() => onApplySkill?.(record)}
            >
              {record.manifest.name}
            </button>
          ))}
        </div>
      ) : (
        <p>
          {skill
            ? "当前项目还没有可用的本地 Skill。"
            : "当前没有已连接的插件。"}
        </p>
      )}
      <button type="button" role="menuitem" onClick={onOpen}>
        {skill ? "浏览 Skill 目录" : "管理插件连接"}
      </button>
    </div>
  );
}
