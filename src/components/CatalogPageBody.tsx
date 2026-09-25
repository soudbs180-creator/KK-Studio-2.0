import { useState } from "react";
import UiIcon from "./UiIcon";
import type { CreationProject } from "../features/creation/model";
import WorkflowCard from "./WorkflowCard";
import type { WorkflowRecord } from "../features/comfyui/workflowRegistry";

type Skill = readonly [string, string, string];
type Workflow = readonly [string, string, string, string];

export default function CatalogPageBody({
  view,
  search,
  skills,
  workflows,
  category,
  onCategory,
  tab,
  onSelect,
  projects = [],
  localWorkflows = [],
  onOpenWorkflow,
  onExportWorkflow,
  onDeleteWorkflow,
  onRunWorkflow,
}: {
  view: "projects" | "skills" | "comfyui";
  search: string;
  skills: readonly Skill[];
  workflows: readonly Workflow[];
  category: string;
  onCategory: (category: string) => void;
  tab: string;
  onSelect: (label: string) => void;
  projects?: CreationProject[];
  localWorkflows?: readonly WorkflowRecord[];
  onOpenWorkflow?: (workflow: WorkflowRecord) => void;
  onExportWorkflow?: (workflow: WorkflowRecord) => void;
  onDeleteWorkflow?: (workflow: WorkflowRecord) => void;
  onRunWorkflow?: (workflow: WorkflowRecord) => void;
}) {
  const [folderCreated, setFolderCreated] = useState(false);
  if (view === "projects") {
    if (tab === "共享项目") {
      return (
        <div className="catalog-empty" role="status">
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌁
          </span>
          <p>共享项目服务尚未接入，请先使用本地项目。</p>
        </div>
      );
    }
    const visibleProjects = projects.filter((project) =>
      `${project.name}${project.prompt}`.toLowerCase().includes(search),
    );
    return (
      <div className="project-library-content">
        <div className="project-library-actions" aria-label="项目资源操作">
          <button
            type="button"
            className="project-library-action"
            aria-label="新建文件夹"
            onClick={() => setFolderCreated(true)}
          >
            <UiIcon name="folderAdd" size={20} />
            <span>
              <strong>新建文件夹</strong>
              <small>在当前目录新建</small>
            </span>
          </button>
          <button
            type="button"
            className="project-library-action"
            aria-label="上传文件"
            disabled
            title="文件上传将在本地资源服务接入后可用"
          >
            <UiIcon name="upload" size={20} />
            <span>
              <strong>上传文件</strong>
              <small>支持批量上传</small>
            </span>
          </button>
        </div>
        {folderCreated && (
          <p className="project-library-status" role="status">
            已创建新文件夹，可在项目组中整理项目。
          </p>
        )}
        <div className="project-grid">
          {visibleProjects.map((project) => (
            <button
              className="project-library-card"
              key={project.id}
              onClick={() => onSelect(project.id)}
            >
              <div className="project-library-preview">
                <span className="catalog-folder-mark">▱</span>
              </div>
              <strong>{project.name}</strong>
              <span>
                {new Date(project.updatedAt).toLocaleDateString("zh-CN")} ·
                本地项目 · {project.items.length} 个画布节点
              </span>
              <span className="catalog-card-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          ))}
        </div>
        {!visibleProjects.length && (
          <div className="catalog-empty" role="status">
            <span className="catalog-empty-mark" aria-hidden="true">
              ⌕
            </span>
            <p>
              {search
                ? "没有找到匹配的项目"
                : "还没有本地项目，点击“新建项目”开始创作。"}
            </p>
          </div>
        )}
      </div>
    );
  }
  if (view === "skills") {
    if (tab === "我的 Skill") {
      return (
        <div className="catalog-empty" role="status">
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌁
          </span>
          <p>还没有本地 Skill。安装服务接入后，可在这里管理。</p>
        </div>
      );
    }
    return (
      <>
        <div className="catalog-categories" role="group" aria-label="Skill分类">
          {[
            "全部",
            "精选",
            "短剧漫剧",
            "专业影视",
            "动画",
            "商业广告",
            "电商",
            "教育",
            "创意实验",
            "音频音乐",
            "平台工具",
          ].map((item) => (
            <button
              key={item}
              className="ui-capsule"
              aria-pressed={category === item}
              onClick={() => onCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <h2 className="catalog-section-title">官方精选</h2>
        <div className="catalog-card-grid">
          {skills.map(([title, description, downloads]) => (
            <button
              className="catalog-card"
              key={title}
              onClick={() => onSelect(`Skill：${title}`)}
            >
              <div className="catalog-card-image">
                <img
                  src="/fixtures/demo/blue-hour.png"
                  alt=""
                  draggable={false}
                />
                <span>H3</span>
              </div>
              <div className="catalog-card-body">
                <strong>{title}</strong>
                <p>{description}</p>
                <small>
                  KK Studio{"\u3000"}✓{"\u3000"} ↧ {downloads}
                </small>
              </div>
            </button>
          ))}
        </div>
        {!skills.length && (
          <div className="catalog-empty">
            <span className="catalog-empty-mark" aria-hidden="true">
              ⌕
            </span>
            <p>没有找到匹配的 Skill</p>
          </div>
        )}
      </>
    );
  }
  if (tab === "我的工作流") {
    if (!localWorkflows.length)
      return (
        <div className="catalog-empty" role="status">
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌁
          </span>
          <p>还没有本地工作流。点击“导入/新建工作流”创建第一个模板。</p>
        </div>
      );
    return (
      <div
        className="catalog-card-grid workflow-grid"
        aria-label="我的本地工作流"
      >
        {localWorkflows
          .filter((workflow) =>
            `${workflow.name}${workflow.description}${workflow.tags.join(" ")}`
              .toLowerCase()
              .includes(search),
          )
          .map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onOpen={onOpenWorkflow ?? (() => undefined)}
              onExport={onExportWorkflow ?? (() => undefined)}
              onDelete={onDeleteWorkflow ?? (() => undefined)}
              onRun={onRunWorkflow ?? (() => undefined)}
            />
          ))}
      </div>
    );
  }
  return (
    <>
      <h2 className="catalog-section-title">精选工作流</h2>
      <div className="catalog-card-grid workflow-grid">
        {workflows.map(([title, description, tag, source], index) => (
          <button
            className="catalog-card workflow-card"
            key={title}
            onClick={() => onSelect(`工作流：${title}`)}
          >
            <div
              className={`catalog-card-image workflow-image workflow-image-${index % 4}`}
            >
              <strong>MiniMax H3</strong>
              <span>{tag}</span>
            </div>
            <div className="catalog-card-body">
              <strong>{title}</strong>
              <p>{description}</p>
              <small>
                {source}
                {"\u3000"}·{"\u3000"}本地精选预览
              </small>
            </div>
          </button>
        ))}
      </div>
      {!workflows.length && (
        <div className="catalog-empty">
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌕
          </span>
          <p>没有找到匹配的工作流</p>
        </div>
      )}
    </>
  );
}
