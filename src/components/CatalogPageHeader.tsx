import WorkflowImportButton from "./WorkflowImportButton";
import UiIcon from "./UiIcon";
import { Button } from "./ui";
import {
  createStarterWorkflow,
  type WorkflowRecord,
} from "../features/comfyui/index.ts";

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
        {view === "projects" ? (
          <>
            <Button
              heightTier="32px"
              variant="primary"
              isPill
              onClick={() => onOpen("new-project")}
            >
              {meta.primary}
            </Button>
            <Button
              heightTier="32px"
              isPill
              className="project-library-tutorial"
              onClick={onOpenTutorial}
            >
              {meta.secondary}
            </Button>
          </>
        ) : (
          <>
            <button
              className="primary-button"
              disabled={view === "skills"}
              title={
                view === "skills"
                  ? "Skill 本地管理由目录卡片提供"
                  : "在本地创建一个可编辑的 ComfyUI API 工作流"
              }
              onClick={() => {
                if (view === "comfyui")
                  onSaveWorkflow?.(createStarterWorkflow());
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
          </>
        )}
      </div>
    </header>
  );
}
