import type {
  CreationDraft,
  CreationTask,
} from "@kk-studio/creation-contracts";
import type { MobileComfyCapture } from "./comfyModel.ts";

export interface MobileMessage {
  id: string;
  projectId: string;
  conversationId: string;
  taskId?: string;
  model?: string;
  role: "user" | "assistant" | "system" | "error";
  text: string;
  createdAt: number;
  /** Logical deletion retains source text, task archives and edit lineage. */
  deletedAt?: number;
  editedFromId?: string;
}
export interface MobileCanvasNode {
  id: string;
  kind: "text" | "image" | "video" | "audio" | "file";
  x: number;
  y: number;
  text?: string;
  assetId?: string;
  taskId?: string;
}
export interface MobileCanvasEdge {
  id: string;
  source: string;
  target: string;
}
export interface MobileLibraryEntry {
  id: string;
  kind: "prompt" | "template" | "role" | "skill-instruction";
  name: string;
  content: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
  importedFromId?: string;
}
export type MobileLibraryInput = Pick<
  MobileLibraryEntry,
  "kind" | "name" | "content"
>;
/** Finite local edits only. No shell, JavaScript, MCP or Provider dispatch. */
export type MobileCanvasOperation =
  | { type: "add_node"; node: MobileCanvasNode }
  | { type: "move_node"; nodeId: string; x: number; y: number }
  | { type: "edit_text"; nodeId: string; text: string }
  | { type: "remove_node"; nodeId: string }
  | { type: "add_edge"; edge: MobileCanvasEdge }
  | { type: "remove_edge"; edgeId: string }
  | { type: "set_viewport"; viewport: MobileProject["canvas"]["viewport"] };
export type MobileProposalInput = { title: string } & (
  | { kind: "canvas"; operations: MobileCanvasOperation[] }
  | { kind: "generation"; draft: CreationDraft }
);
export type MobileCanvasProposal = MobileProposalInput & {
  id: string;
  revision: number;
  baseProjectRevision: number;
  createdAt: number;
  updatedAt: number;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  /** Imported pending approval must be explicitly updated in this project first. */
  requiresRefresh?: boolean;
};
export interface MobileExecutionReceipt {
  taskId: string;
  connectionId: string;
  protocol: "openai-compatible" | "kk-image-jobs" | "comfyui";
  comfy?: MobileComfyCapture;
  gatewayJobId?: string;
  providerRequestId?: string;
  /** Restored opaque IDs are historical evidence and must never query the old live job. */
  readOnly?: boolean;
  originalTaskId?: string;
}
export interface MobileProject {
  id: string;
  name: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
  group?: string;
  pinned?: boolean;
  canvasProposals?: MobileCanvasProposal[];
  composerDraft: CreationDraft;
  tasks: CreationTask[];
  executionReceipts?: MobileExecutionReceipt[];
  messages: MobileMessage[];
  assetIds: string[];
  canvas: {
    nodes: MobileCanvasNode[];
    edges: MobileCanvasEdge[];
    viewport: { x: number; y: number; zoom: number };
  };
  restoredFrom?: {
    projectId: string;
    /** Earliest Comfy capture origin; the direct recovery source remains projectId. */
    originalProjectId?: string;
    restoredAt: number;
    tasks: Record<string, { taskId: string; idempotencyKey: string }>;
  };
}
export interface MobileConnectionMetadata {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  credentialRef?: string;
  protocol?: "openai-compatible" | "kk-image-jobs" | "comfyui";
  capabilities?: {
    text: boolean;
    image: boolean;
    maxOutputs?: number;
    imageSizes?: string[];
  };
}
export interface MobileAsset {
  id: string;
  sha256: string;
  mime: string;
  name: string;
  size: number;
  createdAt: number;
  parentAssetId?: string;
  provenance: {
    source: "import" | "provider" | "derivative";
    projectId?: string;
    taskId?: string;
    model?: string;
  };
  /** Logical removal does not destroy original bytes or break historical references. */
  hidden?: boolean;
  favorite?: boolean;
  deleting?: boolean;
}
export interface MobileSnapshot {
  schemaVersion: 1;
  revision: number;
  projects: MobileProject[];
  activeProjectId?: string;
  connections: MobileConnectionMetadata[];
  preferences: { theme: "system" | "light" | "dark" };
  assets: MobileAsset[];
  library?: MobileLibraryEntry[];
}
export function newMobileDraft(now: number): CreationDraft {
  return {
    prompt: "",
    model: "",
    kind: "text",
    attachments: [],
    approvalMode: "ask",
    privacyMode: "byok_local",
    outputCount: 1,
    updatedAt: now,
  };
}
export function emptyMobileSnapshot(): MobileSnapshot {
  return {
    schemaVersion: 1,
    revision: 0,
    projects: [],
    connections: [],
    preferences: { theme: "system" },
    assets: [],
  };
}
