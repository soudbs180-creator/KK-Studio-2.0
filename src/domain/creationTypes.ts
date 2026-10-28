import type {
  CanvasItemKind,
  CreationAttachment,
  CreationDraft,
  CreationTask,
  ModelSelection,
  ProviderAuthMode,
  ProviderProtocol,
} from "../../packages/creation-contracts/index.ts";
import type { CanvasCollectionItem } from "./canvasItems.ts";
import type { GoogleConversation } from "./googleConversation.ts";
import type { ProjectCanvas } from "./projectCanvas.ts";
import type { ReviewComment } from "./reviewWorkflow.ts";
import type { StagePlan } from "./stagePlan.ts";
export type {
  CreateProjectInput,
  CreationAttachment,
  CreationDraft,
  CreationOutputStatus,
  CreationSubmissionState,
  CreationTask,
  CreationTaskOutput,
  CreationTaskStatus,
  ReasoningEffort,
} from "../../packages/creation-contracts/index.ts";

export interface ChatItemDraft {
  text?: string;
  prompt?: string;
  attachments?: CreationAttachment[];
  pendingAgent?: string | boolean;
  modelSelection?: ModelSelection;
  conversationChannel?: "codex" | "direct" | "google";
  model?: string;
  kind?: CanvasItemKind;
  approvalMode?: "auto" | "ask";
  privacyMode?: "local_only" | "byok_local" | "platform_backed";
  outputCount?: number;
  updatedAt?: number;
  [k: string]: unknown;
}

export interface ChatItemMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "error";
  content: string;
  createdAt?: number;
  taskId?: string;
  [k: string]: unknown;
}

export interface ChatItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  draft: ChatItemDraft;
  messages: ChatItemMessage[];
  mainAgent: string;
  modelAllowlist: string[];
  agentThreadId?: string;
  googleConversation?: GoogleConversation | unknown;
  originChatId?: string;
  isTemporary?: boolean;
  [k: string]: unknown;
}

export interface CreationMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "error";
  content: string;
  createdAt: number;
  [key: string]: unknown;
}

export interface CreationProject {
  /** Non-secret Codex ownership; survives native snapshot/WebView recovery. */
  agentThreadId?: string;
  googleConversation?: GoogleConversation;
  agentGeneratedImageIds?: string[];
  canvas: ProjectCanvas;
  id: string;
  name: string;
  kind: CanvasItemKind;
  /** Missing on legacy projects; preserve those names as manually chosen. */
  nameSource?: "auto" | "manual";
  groupId?: string;
  /** Soft deletion retains this complete project and every original reference. */
  trashedAt?: number;
  prompt: string;
  model: string;
  attachments: CreationAttachment[];
  providerBaseUrl?: string;
  providerProtocol?: ProviderProtocol;
  providerAuthMode?: ProviderAuthMode;
  providerName?: string;
  providerCredentialRef?: string;
  items: CanvasCollectionItem[];
  messages: CreationMessage[];
  tasks: CreationTask[];
  /** Agent 编排计划（Stage 状态机），本地持久化；无编排时为空。 */
  stagePlans?: StagePlan[];
  reviewComments?: ReviewComment[];
  favoriteIds: string[];
  likedIds: string[];
  customTags?: string[];
  // v3 Multi-Chat additions
  activeChatId?: string;
  chats?: Record<string, ChatItem>;
  /** Unsubmitted workbench text and attachments survive project switching. */
  composerDraft: CreationDraft;
  createdAt: number;
  updatedAt: number;
}

/** Strict v3 Project representation where activeChatId and chats are guaranteed */
export type CreationProjectV3 = CreationProject & {
  activeChatId: string;
  chats: Record<string, ChatItem>;
};

export type SidebarSortMode = "manual" | "recent" | "priority";

export interface SidebarPreferences {
  sortMode: SidebarSortMode;
  pinnedProjectIds: string[];
  pinnedGroupIds: string[];
}

export interface CreationSnapshotV2 {
  version: 2;
  revision: number;
  activeProjectId: string | null;
  projects: CreationProject[];
  projectGroups?: CreationProjectGroup[];
  sidebarPreferences?: SidebarPreferences;
  homeDraft: CreationDraft;
}

export interface CreationProjectGroup {
  id: string;
  name: string;
  deletedAt?: number;
}

export interface CreationSnapshotV3 {
  version: 3;
  revision: number;
  activeProjectId: string | null;
  projects: CreationProject[];
  projectGroups?: CreationProjectGroup[];
  sidebarPreferences?: SidebarPreferences;
  homeDraft: CreationDraft;
}

export type CreationSnapshot = CreationSnapshotV2 | CreationSnapshotV3;
