import { useState } from "react";
import BrandLogo from "./BrandLogo";
import StartComposer from "./StartComposer";
import {
  emptyDraft,
  type CreateProjectInput,
  type CreationDraft,
} from "../features/creation/model";
import type { SkillRecord } from "../features/skills/skillRegistry";

const INSPIRATIONS = [
  {
    id: "blue-hour",
    title: "蓝调时刻 · 城市短片",
    description: "用一张参考图规划镜头、节奏和配乐，适合快速验证画面方向。",
    image: "/fixtures/demo/blue-hour.png",
    tag: "H3 精选",
  },
  {
    id: "product-story",
    title: "产品故事板",
    description: "把产品卖点拆成可编辑的画面节点，再交给模型继续完善。",
    image: "/fixtures/demo/blue-hour.png",
    tag: "品牌广告",
  },
  {
    id: "mv-board",
    title: "音乐 MV 分镜",
    description: "从一句歌词开始，生成镜头草稿与视觉参考，保持创作方向可控。",
    image: "/fixtures/demo/blue-hour.png",
    tag: "音乐 MV",
  },
];

export default function StartPage({
  onCreateProject,
  onOpenModel,
  onOpenSkills,
  onOpenPlugins,
  defaultModel = "",
  draft: externalDraft,
  onDraftChange,
  saveState = "saved",
  onRetrySave,
  skills = [],
  onApplySkill,
}: {
  onCreateProject: (
    input: CreateProjectInput,
  ) => string | undefined | Promise<string | undefined>;
  onOpenModel: () => void;
  onOpenSkills: () => void;
  onOpenPlugins: () => void;
  defaultModel?: string;
  draft?: CreationDraft;
  onDraftChange?: (draft: CreationDraft) => void;
  saveState?: "saved" | "saving" | "error";
  onRetrySave?: () => void;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
}) {
  const [localDraft, setLocalDraft] = useState(emptyDraft);
  const draft = externalDraft ?? localDraft;
  const [activeTab, setActiveTab] = useState<"inspiration" | "skill">(
    "inspiration",
  );
  const [status, setStatus] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("H3 精选");
  function updateDraft(next: CreationDraft): void {
    if (onDraftChange) onDraftChange(next);
    else setLocalDraft(next);
  }
  async function create(input: CreationDraft): Promise<void> {
    try {
      const error = await onCreateProject({ ...input, kind: "image" });
      if (error) setStatus(error);
    } catch {
      setStatus("无法检查模型连接，请打开供应商设置后重试。");
    }
  }
  return (
    <section className="start-page" aria-label="开始创作">
      <div className="start-hero">
        <div className="start-brand">
          <BrandLogo variant="hero" />
          <h1>KK Studio</h1>
          <p>属于你的多模态 Agent 团队</p>
        </div>
        <StartComposer
          draft={draft}
          onDraftChange={updateDraft}
          setStatus={setStatus}
          onSubmit={create}
          onOpenModel={onOpenModel}
          onOpenSkills={onOpenSkills}
          onOpenPlugins={onOpenPlugins}
          defaultModel={defaultModel}
          skills={skills}
          onApplySkill={onApplySkill}
        />
        {status && (
          <p className="start-status" role="status">
            {status}
          </p>
        )}
        {saveState === "error" && (
          <p className="start-status" role="alert">
            草稿暂未保存，请重试。
            {onRetrySave && (
              <button type="button" onClick={onRetrySave}>
                重试保存
              </button>
            )}
          </p>
        )}
      </div>
      <div className="start-discovery">
        <div className="start-tabs" role="tablist" aria-label="开始创作内容">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "inspiration"}
            onClick={() => setActiveTab("inspiration")}
          >
            创作灵感
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "skill"}
            onClick={() => setActiveTab("skill")}
          >
            Skill
          </button>
        </div>
        {activeTab === "inspiration" && (
          <div className="start-chip-row" aria-label="灵感分类">
            {[
              "H3 精选",
              "特效包装",
              "品牌广告",
              "影视片头",
              "MV",
              "二次元 PV",
            ].map((chip) => (
              <button
                type="button"
                className={selectedCategory === chip ? "is-selected" : ""}
                aria-pressed={selectedCategory === chip}
                key={chip}
                onClick={() => {
                  setSelectedCategory(chip);
                  setStatus(`已选择「${chip}」创作方向。`);
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        {activeTab === "skill" ? (
          <div className="start-skill-callout">
            <div>
              <strong>从精选 Skill 开始</strong>
              <p>把成熟的分镜、广告和提示词流程加入你的项目。</p>
            </div>
            <button type="button" className="ui-button" onClick={onOpenSkills}>
              浏览 Skill ›
            </button>
          </div>
        ) : (
          <div className="start-inspiration-grid">
            {INSPIRATIONS.filter(
              (item) =>
                selectedCategory === "H3 精选" ||
                item.tag === selectedCategory ||
                (selectedCategory === "MV" && item.id === "mv-board"),
            ).map((item) => (
              <button
                type="button"
                className="start-inspiration-card"
                key={item.id}
                onClick={() => {
                  updateDraft({
                    ...draft,
                    prompt: `${item.title}\n${item.description}`,
                  });
                  setStatus("模板内容已放入提示词，可以继续编辑后创建项目。");
                }}
              >
                <img src={item.image} alt="" draggable={false} />
                <div>
                  <span>{item.tag}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
