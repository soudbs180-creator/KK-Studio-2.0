import type {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
} from "react";
import type { CanvasCollectionItem } from "../../domain/canvasItems";
import type { ProjectCanvas } from "../../domain/projectCanvas";
import type { CreationTask } from "../../features/creation/index.ts";
import type { AgentCanvasBinding } from "./useAgentCanvasView";

/** Canvas host inputs, including the project-scoped Agent controller. */
export interface CanvasProps {
  projectId?: string;
  comfyRuntime?: import("../../features/comfyui/index.ts").ComfyRuntimePort;
  onFlush?: () => Promise<void>;
  agentViewRef?: MutableRefObject<AgentCanvasBinding | null>;
  onAgentViewChange?: () => void;
  projectStatus?: ReactNode;
  covered?: boolean;
  initialCanvas?: ProjectCanvas;
  onCanvasChange?: (canvas: ProjectCanvas) => void;
  onOpen?: (view: string) => void;
  chatOpen?: boolean;
  onOpenChat: () => void;
  onOpenTasks?: () => void;
  tasks?: CreationTask[];
  onCancelTask?: (taskId: string) => void;
  onRetryTask?: (taskId: string) => void;
  items: CanvasCollectionItem[];
  onItemsChange: Dispatch<SetStateAction<CanvasCollectionItem[]>>;
  likedIds: Set<string>;
  onToggleLike: (id: string) => void;
}
