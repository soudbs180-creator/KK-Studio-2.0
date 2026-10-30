import { useId, useRef, useState } from "react";
import type { SkillRecord } from "../features/skills/index.ts";
import ComposerPluginSummary from "./ComposerPluginSummary";

export default function ComposerExtensionsMenu({
  skills = [],
  onApplySkill,
  onOpen,
}: {
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => void;
  onOpen: (id: string) => void;
}) {
  const [section, setSection] = useState<"skill" | "plugin" | "agent">("skill");
  const instanceId = useId().replace(/:/g, "");
  const sectionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sections = [
    ["skill", "Skill"],
    ["plugin", "MCP"],
    ["agent", "协作伙伴"],
  ] as const;
  const available = skills.filter(
    (record) => record.installed && record.enabled,
  );
  return (
    <div className="composer-extensions-menu" role="menu" aria-label="扩展">
      <strong>扩展</strong>
      <div
        className="composer-extension-sections"
        role="tablist"
        aria-label="扩展分类"
      >
        {sections.map(([id, label], index) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            aria-controls={`composer-extension-panel-${instanceId}`}
            id={`composer-extension-tab-${instanceId}-${id}`}
            tabIndex={section === id ? 0 : -1}
            ref={(node) => {
              sectionRefs.current[index] = node;
            }}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? sections.length - 1
                    : (index +
                        (event.key === "ArrowLeft" ? -1 : 1) +
                        sections.length) %
                      sections.length;
              const [nextId] = sections[next];
              setSection(nextId);
              sectionRefs.current[next]?.focus();
            }}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`composer-extension-panel-${instanceId}`}
        className="composer-extension-content"
        role="tabpanel"
        aria-labelledby={`composer-extension-tab-${instanceId}-${section}`}
        tabIndex={0}
      >
        {section === "skill" && (
          <>
            <p>
              {available.length
                ? "选择 Skill，将指令加入当前草稿。"
                : "当前没有可用的本地 Skill。"}
            </p>
            {available.map((record) => (
              <button
                key={record.manifest.id}
                type="button"
                role="menuitem"
                onClick={() => onApplySkill?.(record)}
              >
                {record.manifest.name}
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={() => onOpen("skills")}
            >
              浏览 Skill 目录
            </button>
          </>
        )}
        {section === "plugin" && (
          <>
            <ComposerPluginSummary />
            <button
              type="button"
              role="menuitem"
              onClick={() => onOpen("settings/plugins")}
            >
              管理画布插件
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => onOpen("settings/mcp")}
            >
              管理 MCP 工具
            </button>
          </>
        )}
        {section === "agent" && (
          <>
            <p>选择策划、生成或审查等任务角色，在模型菜单选择执行模型。</p>
            <button
              type="button"
              role="menuitem"
              onClick={() => onOpen("skills/partners")}
            >
              选择协作角色
            </button>
          </>
        )}
      </div>
    </div>
  );
}
