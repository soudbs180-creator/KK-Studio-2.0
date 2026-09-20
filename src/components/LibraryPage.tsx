import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import CatalogPageBody from "./CatalogPageBody";
import type { CreationProject } from "../features/creation/model";
import CatalogTutorial from "./CatalogTutorial";

type CatalogView = "projects" | "skills" | "comfyui";
const SKILLS = [
  ["3D 动画短片", "根据故事创意完成角色、场景、镜头规划与视频整合。", "11.1k"],
  [
    "品牌宣传短片生成器",
    "基于品牌素材与推广目标，完成脚本、分镜和音画合成。",
    "8.0k",
  ],
  [
    "极简产品广告生成器",
    "从产品图片和广告需求出发，输出可编辑的卖点表达。",
    "7.8k",
  ],
  ["H3 提示词专家", "把参考素材整理成可控的多模态视频生成指令。", "7.0k"],
  ["人物微表情视频生成", "根据角色图、剧本或情绪短语设计分镜。", "6.4k"],
  ["纸拼贴讲解动画", "将文案、故事节点或抽象概念转成可确认的画面。", "5.9k"],
  [
    "音乐 MV 动态字幕生成器",
    "基于音乐和歌词完成节奏拆解、镜头设计与字幕。",
    "5.2k",
  ],
  ["第一视角短片生成", "将创意、剧本或参考素材规划为严格主观镜头。", "4.8k"],
] as const;
const WORKFLOWS = [
  [
    "H3 轻量版 · 文生视频",
    "轻量快速文字生成，接入文生视频与 2K 链路。",
    "文生视频",
    "文本",
  ],
  [
    "H3 轻量版 · 首尾帧",
    "轻量快速首尾帧生成，兼顾镜头控制和高清细节。",
    "首尾帧",
    "图片",
  ],
  [
    "H3 轻量版 · 多参考",
    "轻量多参考生成，全方位控制人物、风格、动作与声音。",
    "多参考",
    "参考图",
  ],
  [
    "H3 轻量版 · 文生视频（已下载）",
    "输入文字即可生成音画同步视频，适合快速预览。",
    "已下载",
    "本地",
  ],
  [
    "H3 轻量版 · 首尾帧（本地）",
    "以首帧和尾帧约束镜头变化，保留创作控制。",
    "首尾帧",
    "本地",
  ],
  [
    "H3 轻量版 · 多参考（本地）",
    "从多个参考素材中提取主体、动作和风格。",
    "多参考",
    "本地",
  ],
  [
    "H3 满血版 · 2K + IR",
    "高质量文生视频，适合面向高画面正式成片。",
    "2K",
    "高质量",
  ],
  [
    "H3 满血版 · 2K + T2V",
    "高质量图生视频，适合镜头延展与风格保持。",
    "2K",
    "图生视频",
  ],
] as const;

function pageMeta(view: CatalogView) {
  if (view === "projects")
    return {
      title: "项目库",
      subtitle: "整理创作页面、管理项目资产，集中呈现项目内容",
      primary: "新建项目",
      secondary: "查看教程",
    };
  if (view === "skills")
    return {
      title: "Skill",
      subtitle: "发现、安装并管理 Skill，扩展 KK Studio 的创作能力",
      primary: "通过 KK Studio 创建",
      secondary: "安装 Skill",
    };
  return {
    title: "ComfyUI 工作流",
    subtitle: "支持本地部署，可手动运行，也可由 Agent 调用",
    primary: "导入/新建工作流",
    secondary: "探索开源",
  };
}

export default function LibraryPage({
  view,
  onOpen,
  projects = [],
  onOpenProject,
}: {
  view: CatalogView;
  onOpen: (id: string) => void;
  projects?: CreationProject[];
  onOpenProject?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(
    view === "projects"
      ? "本地项目"
      : view === "skills"
        ? "Skill"
        : "精选工作流",
  );
  const [category, setCategory] = useState("全部");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [status, setStatus] = useState("");
  const meta = pageMeta(view);
  const search = query.trim().toLowerCase();
  const skills = useMemo(
    () =>
      SKILLS.filter(([title, description]) =>
        `${title}${description}`.toLowerCase().includes(search),
      ),
    [search],
  );
  const workflows = useMemo(
    () =>
      WORKFLOWS.filter(([title, description, tag, source]) =>
        `${title}${description}${tag}${source}`.toLowerCase().includes(search),
      ),
    [search],
  );
  const tabs =
    view === "projects"
      ? ["本地项目", "共享项目"]
      : view === "skills"
        ? ["Skill", "我的 Skill"]
        : ["精选工作流", "我的工作流"];
  return (
    <section
      className={`catalog-page catalog-page-${view}`}
      aria-label={meta.title}
    >
      <header className="catalog-page-header">
        <div>
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
        </div>
        <div className="catalog-page-actions">
          <button
            className="primary-button"
            disabled={view !== "projects"}
            title={
              view === "projects"
                ? undefined
                : view === "skills"
                  ? "Skill 创建服务尚未接入"
                  : "工作流导入服务尚未接入"
            }
            onClick={() => view === "projects" && onOpen("new-project")}
          >
            <Plus size={17} /> {meta.primary}
          </button>
          <button
            className="ui-button"
            disabled={view !== "projects"}
            title={
              view === "projects"
                ? undefined
                : view === "skills"
                  ? "Skill 安装服务尚未接入"
                  : "工作流探索与导入服务尚未接入"
            }
            onClick={() => view === "projects" && setTutorialOpen(true)}
          >
            {meta.secondary}
          </button>
        </div>
      </header>
      {view !== "projects" && (
        <p className="catalog-page-status" role="status">
          {view === "skills"
            ? "当前仅可浏览和选择 Skill；安装、创建与账号同步服务尚未接入。"
            : "当前仅可浏览和选择工作流；导入、运行与本地服务连接尚未接入。"}
        </p>
      )}
      {status && (
        <p className="catalog-page-status" role="status">
          {status}
        </p>
      )}
      <div className="catalog-page-rule" />
      <div className="catalog-page-toolbar">
        <div
          className="catalog-page-tabs"
          role="tablist"
          aria-label={`${meta.title}分类`}
        >
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="catalog-page-search">
          <Search size={17} />
          <input
            aria-label={`搜索${meta.title}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`搜索${meta.title}`}
          />
        </label>
      </div>
      <CatalogPageBody
        view={view}
        search={search}
        skills={skills}
        workflows={workflows}
        category={category}
        projects={projects}
        onCategory={setCategory}
        tab={tab}
        onSelect={(label) => {
          if (view === "projects") {
            if (
              onOpenProject &&
              projects.some((project) => project.id === label)
            ) {
              onOpenProject(label);
              return;
            }
            onOpen("workspace");
            return;
          }
          setStatus(`已选择${label}。当前为本地预览，尚未连接安装或运行服务。`);
        }}
      />
      {tutorialOpen && (
        <CatalogTutorial
          onClose={() => setTutorialOpen(false)}
          onOpen={onOpen}
        />
      )}
    </section>
  );
}
