import type {
  ApprovalGate,
  CanvasItemKind,
  CanvasReferenceSlot,
} from "./identity.ts";
import type { ImageEditContext, ImageEditSnapshot } from "./imageEdit.ts";
import type { ModelSelection } from "./modelRouting.ts";
import type { ProviderAuthMode, ProviderProtocol } from "./providerRouting.ts";
import type { TaskCostReceipt } from "./taskState.ts";

export type CreationTaskStatus =
  | "queued"
  | "running"
  | "unknown"
  | "partial"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "offline"
  | "interrupted";

/** Durable boundary for a provider submission. Unknown must be reviewed before retry. */
export type CreationSubmissionState =
  "intent" | "submitted" | "unknown" | "terminal";

export type CreationOutputStatus =
  "waiting" | "running" | "unknown" | "succeeded" | "failed" | "cancelled";

export interface CreationTaskOutput {
  index: number;
  status: CreationOutputStatus;
  assetId?: string;
  /** Bounded plain text; a running output is a draft until terminal success. */
  text?: string;
  model: string;
  provider?: string;
  promptHash?: string;
  error?: string;
  createdAt: number;
}

export interface CreationAttachment {
  id: string;
  assetId?: string;
  originalAssetId?: string;
  name: string;
  mime: string;
  size: number;
  /** Semantic canvas role preserved through task preparation and persistence. */
  role?: CanvasReferenceSlot;
  /** Data URLs are used only for user selected, non-sensitive local assets. */
  dataUrl?: string;
}

export interface CreationTask {
  imageCapability?: import("./imageCapability.ts").ImageCapabilitySpec;
  imageEdit?: ImageEditSnapshot;
  imageEditContext?: ImageEditContext;
  id: string;
  /** Optional canvas node that originated this task submission. */
  sourceItemId?: string;
  /** Identifies the chat within the project that originated this task submission */
  originChatId?: string;
  prompt: string;
  model: string;
  kind: CanvasItemKind;
  status: CreationTaskStatus;
  /** Whether the provider request is known to be safe to retry. */
  submissionState?: CreationSubmissionState;
  /** Set once a durable task intent is marked as submitted. */
  submittedAt?: number;
  error?: string;
  resultItemId?: string;
  createdAt: number;
  updatedAt: number;
  /** The exact attachments used by this submission, never read from a later project state. */
  attachments: CreationAttachment[];
  attempt: number;
  /** Number of independent provider outputs requested by this task. */
  requestedOutputs: number;
  /** Number of results that were successfully archived. */
  completedOutputs: number;
  /** Exact completed slots retained for legacy tasks that have no output vector. */
  completedOutputIndices?: number[];
  /** Stable key used to prevent duplicate provider submissions after restart. */
  idempotencyKey: string;
  /** Optional batch grouping for UI progress and partial success. */
  batchId?: string;
  /** Privacy boundary selected when the task was submitted. */
  privacyMode: "local_only" | "byok_local" | "platform_backed";
  /** Provider routing is captured at submission time; it is not a secret. */
  providerConnectionId?: string;
  /** Opaque system-vault reference for this connection. */
  providerCredentialRef?: string;
  /** Provider routing is captured at submission time; it is not a secret. */
  providerBaseUrl?: string;
  providerProtocol?: ProviderProtocol;
  providerAuthMode?: ProviderAuthMode;
  providerName?: string;
  /** Resolved provider size label (e.g. "1024x1024") captured at submission. */
  imageSize?: string;
  /** Per-output state used by the Batch Matrix. */
  outputs?: CreationTaskOutput[];
  /** Estimate only; an actual amount is shown only when a provider reports it. */
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  /** Traceable quote evidence; fixture/non-USD receipts do not become USD claims. */
  estimatedCostQuote?: TaskCostReceipt;
  actualCostReceipt?: TaskCostReceipt;
  approvedGates?: ApprovalGate[];
  retryOfTaskId?: string;
  retryOutputIndices?: number[];
}

export type ReasoningEffort = "low" | "medium" | "high";

export interface CreationDraft {
  modelSelection?: ModelSelection;
  conversationChannel?: "codex" | "direct" | "google";
  /** Only a new home request may seed the Agent editor from this pending draft. */
  pendingAgent?: boolean;
  providerConnectionId?: string;
  prompt: string;
  model: string;
  kind: CanvasItemKind;
  attachments: CreationAttachment[];
  approvalMode: "auto" | "ask";
  privacyMode: "local_only" | "byok_local" | "platform_backed";
  outputCount: number;
  reasoningEffort?: ReasoningEffort;
  updatedAt: number;
}

export interface CreateProjectInput {
  imageCapability?: import("./imageCapability.ts").ImageCapabilitySpec;
  modelSelection?: ModelSelection;
  /** Preliminary binding check before request crops and masks are archived. */
  imageOperation?: "inpaint";
  imageEdit?: ImageEditSnapshot;
  imageEditContext?: ImageEditContext;
  providerConnectionId?: string;
  prompt: string;
  model: string;
  kind: CanvasItemKind;
  attachments: CreationAttachment[];
  providerBaseUrl?: string;
  providerProtocol?: ProviderProtocol;
  providerAuthMode?: ProviderAuthMode;
  providerName?: string;
  providerCredentialRef?: string;
  privacyMode?: "local_only" | "byok_local" | "platform_backed";
  outputCount?: number;
  /** Resolved provider size label (e.g. "1024x1024"); undefined sends no size. */
  imageSize?: string;
}
