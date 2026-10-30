import ProjectLibraryContent from "./ProjectLibraryContent";
import type { ProjectLibraryActions } from "../features/projects/index.ts";
import type { CreationProject } from "../features/creation/index.ts";
import WorkflowCard from "./WorkflowCard";
import type { WorkflowRecord } from "../features/comfyui/index.ts";
import type { PageTemplateKey } from "../domain/pageTemplates";

type Skill = readonly [string, string, string];
type Workflow = readonly [string, string, string, string];

export default function CatalogPageBody({
  view,
  template,
  search,
  skills,
  workflows,
  category,
  onCategory,
  tab,
  onSelect,
  projects = [],
  projectActions,
  localWorkflows = [],
  onOpenWorkflow,
  onExportWorkflow,
  onDeleteWorkflow,
  onRunWorkflow,
}: {
  view: "projects" | "skills" | "comfyui";
  template: PageTemplateKey;
  search: string;
  skills: readonly Skill[];
  workflows: readonly Workflow[];
  category: string;
  onCategory: (category: string) => void;
  tab: string;
  onSelect: (label: string) => void;
  projects?: CreationProject[];
  projectActions?: ProjectLibraryActions;
  localWorkflows?: readonly WorkflowRecord[];
  onOpenWorkflow?: (workflow: WorkflowRecord) => void;
  onExportWorkflow?: (workflow: WorkflowRecord) => void;
  onDeleteWorkflow?: (workflow: WorkflowRecord) => void;
  onRunWorkflow?: (workflow: WorkflowRecord) => void;
}) {
  if (view === "projects") {
    if (tab === "共享项目") {
      return (
        <div
          className="catalog-empty"
          data-template-body={template}
          role="status"
        >
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌁
          </span>
          <p>共享项目服务尚未接入，请先使用本地项目。</p>
        </div>
      );
    }
    return (
      <div data-template-body={template}>
        <ProjectLibraryContent
          projects={projects}
          actions={projectActions}
          search={search}
          trash={tab === "垃圾箱"}
          onOpen={onSelect}
        />
      </div>
    );
  }
  if (view === "skills") {
    if (tab === "我的 Skill") {
      return (
        <div
          className="catalog-empty"
          data-template-body={template}
          role="status"
        >
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌁
          </span>
          <p>还没有本地 Skill。安装服务接入后，可在这里管理。</p>
        </div>
      );
    }
    return (
      <div className="page-template-body" data-template-body={template}>
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
          <div className="catalog-empty" data-template-body={template}>
            <span className="catalog-empty-mark" aria-hidden="true">
              ⌕
            </span>
            <p>没有找到匹配的 Skill</p>
          </div>
        )}
      </div>
    );
  }
  if (tab === "我的工作流") {
    if (!localWorkflows.length)
      return (
        <div
          className="catalog-empty"
          data-template-body={template}
          role="status"
        >
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌁
          </span>
          <p>还没有本地工作流。点击“导入/新建工作流”创建第一个模板。</p>
        </div>
      );
    return (
      <div
        className="catalog-card-grid workflow-grid"
        data-template-body={template}
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
    <div className="page-template-body" data-template-body={template}>
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
        <div className="catalog-empty" data-template-body={template}>
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌕
          </span>
          <p>没有找到匹配的工作流</p>
        </div>
      )}
    </div>
  );
}
