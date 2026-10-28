import type { CreationTask, CreationAttachment } from "./creation.ts";
import type {
  AssetProvenance,
  StoredAssetMetadata,
  ProviderConnectionIdentity,
} from "./wire.ts";

/** Existing task intent/queue only; approval and idempotency remain owned by the host. */
export interface TaskPort {
  submit(projectId: string, task: CreationTask): Promise<CreationTask>;
  subscribe(taskId: string, listener: (task: CreationTask) => void): () => void;
  /** Requests cancellation; it does not confirm that a provider cancelled accepted work. */
  cancel(taskId: string): void | Promise<void>;
  retry(
    projectId: string,
    taskId: string,
    outputIndex?: number,
  ): void | Promise<void>;
  recover(projectId: string): Promise<readonly CreationTask[]>;
}

/** The existing archive's original data URL, not a provider URL or thumbnail. */
export type CapabilityAsset = StoredAssetMetadata & { preview: string };
export type AssetWriteRequest = {
  source: string;
  sourceKind?: StoredAssetMetadata["source"];
  tags?: string[];
} & Partial<
  Pick<
    StoredAssetMetadata,
    "sourceJobId" | "promptHash" | "parentId" | "isAiGenerated"
  >
> &
  Partial<Omit<AssetProvenance, "generatedAt">>;

export interface AssetPort {
  read(assetId: string): Promise<CapabilityAsset | null>;
  write(request: AssetWriteRequest): Promise<CapabilityAsset>;
}

/** Protocol family declaration does not imply an implemented or verified adapter. */
export type CapabilityProtocolFamily =
  | "chat-completions"
  | "responses"
  | "anthropic-messages"
  | "gemini-interactions";
export interface CapabilityProviderRequirements {
  capabilityId: string;
  modelTraits: readonly string[];
  resources: readonly string[];
  connectionId?: string;
  model?: string;
  protocolFamily?: CapabilityProtocolFamily;
}
export interface ResolvedCapabilityProvider {
  connection: ProviderConnectionIdentity;
  model: string;
  resources: readonly string[];
  protocolFamily?: CapabilityProtocolFamily;
}
export interface CapabilityProviderRequest {
  prompt: string;
  model: string;
  attachments: CreationAttachment[];
  requestedOutputs: number;
  idempotencyKey: string;
  workflow?: Record<string, unknown>;
}
export interface CapabilityProviderJob {
  providerJobId: string;
  requestId?: string;
  async: boolean;
  status: "queued" | "running" | "succeeded" | "failed";
}
export interface CapabilityProviderResult {
  providerJobId: string;
  index: number;
  url?: string;
  b64Json?: string;
  mime?: string;
  kind?: "image" | "video";
}

/** Implementations retain existing routing, credential, health and acceptance guards. */
export interface ProviderPort {
  resolve(
    requirements: CapabilityProviderRequirements,
  ): Promise<ResolvedCapabilityProvider | undefined>;
  submit(
    provider: ResolvedCapabilityProvider,
    request: CapabilityProviderRequest,
  ): Promise<CapabilityProviderJob>;
  getStatus(
    provider: ResolvedCapabilityProvider,
    providerJobId: string,
  ): Promise<CapabilityProviderJob>;
  cancel(
    provider: ResolvedCapabilityProvider,
    providerJobId: string,
  ): Promise<void>;
  listResults(
    provider: ResolvedCapabilityProvider,
    providerJobId: string,
  ): Promise<CapabilityProviderResult[]>;
}
