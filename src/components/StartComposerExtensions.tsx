import type { SkillRecord } from "../features/skills/skillRegistry";
import StartResourcePopover from "./StartResourcePopover";

export default function StartComposerExtensions({
  skillMenuOpen,
  onToggleMenu,
  onCloseMenus,
  onOpenSkills,
  skills,
  onApplySkill,
  onStatus,
}: {
  skillMenuOpen: boolean;
  onToggleMenu: (menu: "skill") => void;
  onCloseMenus: () => void;
  onOpenSkills: () => void;
  skills: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
  onStatus: (message: string) => void;
}) {
  return (
    <div className="start-resource-picker composer-ext-skill">
      <button
        type="button"
        className="start-tool-button"
        aria-haspopup="menu"
        aria-expanded={skillMenuOpen}
        title="技能（Skill）"
        onClick={() => onToggleMenu("skill")}
      >
        <img src="/design/figma/composer-puzzle.svg" alt="" />
        <span>Skill</span>
      </button>
      {skillMenuOpen && (
        <StartResourcePopover
          kind="skill"
          skills={skills}
          onApplySkill={(record) => {
            const message = onApplySkill?.(record);
            onCloseMenus();
            onStatus(message ?? "当前草稿不可用，未应用技能。");
          }}
          onOpen={() => {
            onCloseMenus();
            onOpenSkills();
          }}
        />
      )}
    </div>
  );
}
