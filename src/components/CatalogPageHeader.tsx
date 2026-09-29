import WorkflowImportButton from "./WorkflowImportButton";
import UiIcon from "./UiIcon";
import {
  createStarterWorkflow,
  type WorkflowRecord,
} from "../features/comfyui/workflowRegistry";

export type CatalogHeaderMeta = {
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
};

export default function CatalogPageHeader({
  view,
  meta,
  onOpen,
  onSaveWorkflow,
  onImport,
  onError,
  onOpenTutorial,
}: {
  view: "projects" | "skills" | "comfyui";
  meta: CatalogHeaderMeta;
  onOpen: (id: string) => void;
  onSaveWorkflow?: (workflow: WorkflowRecord) => void;
  onImport: (workflow: WorkflowRecord, nodeCount: number) => void;
  onError: (message: string) => void;
  onOpenTutorial: () => void;
}) {
  return (
    <header className="catalog-page-header">
      <div>
        <h1>{meta.title}</h1>
        <p>{meta.subtitle}</p>
      </div>
      <div className="catalog-page-actions">
        <button
          className="primary-button"
          disabled={view === "skills"}
          title={
            view === "projects"
              ? undefined
              : view === "skills"
                ? "Skill 本地管理由目录卡片提供"
                : "在本地创建一个可编辑的 ComfyUI API 工作流"
          }
          onClick={() => {
            if (view === "projects") onOpen("new-project");
            if (view === "comfyui") onSaveWorkflow?.(createStarterWorkflow());
          }}
        >
          <UiIcon name="add" size={16} /> {meta.primary}
        </button>
        {view === "comfyui" ? (
          <WorkflowImportButton onImported={onImport} onError={onError} />
        ) : (
          <button className="ui-button" onClick={onOpenTutorial}>
            {meta.secondary}
          </button>
        )}
      </div>
    </header>
  );
}
