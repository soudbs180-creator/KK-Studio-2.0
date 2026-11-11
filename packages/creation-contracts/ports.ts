import type { CreationAttachment, CreationTask } from "./creation.ts";
import type { CapabilityPermission } from "./capability.ts";
import type {
  AssetProvenance,
  ProviderConnectionIdentity,
  StoredAssetMetadata,
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

/** The snapshot owner supplies the exact codec; the storage transport owns no model. */
export interface SnapshotCodec<Snapshot> {
  decode(value: unknown): Snapshot;
  parse(raw: string): Snapshot;
  serialize(snapshot: Snapshot): Snapshot;
}

export interface StorageSnapshotRead {
  status: "missing" | "loaded" | "recovered";
  snapshot: unknown | null;
  revision: number | null;
}

/** Snapshot transport; decoding and revision conflict policy remain with their owners.
 * Warehouse family handshake and cross-format import policy are specified in
 * storageFormat.ts. WIRING STATUS (2026-11-09): CONTRACT-ONLY — see
 * TASK-CLOSURE-20261109 (PARTIAL). Only the companion service applies an
 * admission check today; each other platform implementation still has to wire
 * its own admission before read/write. This comment is a requirement, not a
 * statement that the guard is active.
 */
export interface StoragePort<Snapshot> {
  read(): Promise<StorageSnapshotRead>;
  write(
    snapshot: Snapshot,
    expectedRevision: number | null,
  ): Promise<{ revision: number }>;
}

export interface PermissionPort {
  check(request: {
    subjectId: string;
    permission: CapabilityPermission;
  }): { allowed: true } | { allowed: false; reason: string };
}
