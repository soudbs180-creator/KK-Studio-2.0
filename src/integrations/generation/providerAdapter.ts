import type {
  CapabilityManifest,
  ProviderConnection,
} from "../../domain/providerConnections.ts";
import type { CreationAttachment } from "../../features/creation/model.ts";

export interface GenerationRequest {
  prompt: string;
  model: string;
  attachments: CreationAttachment[];
  requestedOutputs: number;
  idempotencyKey: string;
  signal: AbortSignal;
  /** ComfyUI workflow JSON is supplied by the workflow editor, never inferred from a prompt. */
  workflow?: Record<string, unknown>;
}

/** Adapter errors preserve status and retry metadata without retaining response bodies. */
export class ProviderAdapterError extends Error {
  readonly status: number;
  readonly failureClass:
    | "rate_limited"
    | "unauthorized"
    | "forbidden"
    | "invalid_scope"
    | "project_disabled"
    | "provider_unavailable"
    | "network"
    | "cancelled"
    | "invalid_request";
  readonly retryAfterSeconds?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      failureClass: ProviderAdapterError["failureClass"];
      retryAfterSeconds?: number;
      retryable: boolean;
    },
  ) {
    super(message);
    this.name = "ProviderAdapterError";
    this.status = options.status ?? 0;
    this.failureClass = options.failureClass;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.retryable = options.retryable;
  }
}

export interface CostEstimate {
  currency: string;
  minimumUnits: number;
  maximumUnits: number;
  billingMode: "free" | "metered" | "unknown";
}

export interface SubmittedGenerationJob {
  providerJobId: string;
  requestId?: string;
  async: boolean;
  status: "queued" | "running" | "succeeded" | "failed";
}

export interface ProviderResult {
  providerJobId: string;
  url?: string;
  b64Json?: string;
  mime?: string;
  index: number;
}

export interface GenerationProviderAdapter {
  readonly connection: ProviderConnection;
  discoverCapabilities(signal?: AbortSignal): Promise<CapabilityManifest>;
  estimate(request: GenerationRequest): Promise<CostEstimate>;
  submit(request: GenerationRequest): Promise<SubmittedGenerationJob>;
  getStatus(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<SubmittedGenerationJob>;
  cancel(providerJobId: string, signal?: AbortSignal): Promise<void>;
  listResults(
    providerJobId: string,
    signal?: AbortSignal,
  ): Promise<ProviderResult[]>;
}
