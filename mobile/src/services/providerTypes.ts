import type {
  CreationAttachment,
  CreationSubmissionState,
} from "@kk-studio/creation-contracts";
export interface ProviderConnection {
  id: string;
  baseUrl: string;
  credentialRef: string;
  protocol: "openai-compatible" | "kk-image-jobs";
  /** Explicit configured endpoint capabilities, not inferred from model identifiers. */
  capabilities: {
    text: boolean;
    image: boolean;
    maxOutputs?: number;
    imageSizes?: string[];
  };
}
export interface CredentialReader {
  read(reference: string): Promise<string | null>;
}
export interface GenerationInput {
  submissionId: string;
  projectId: string;
  connection: ProviderConnection;
  model: string;
  prompt: string;
  attachments?: CreationAttachment[];
}
export interface ImageInput extends GenerationInput {
  count?: number;
  size?: string;
  /** Verified local originals are request memory only, never persisted in drafts or tasks. */
  referenceImages?: {
    assetId: string;
    bytes: Uint8Array;
    mime: ImageOriginal["mime"];
  }[];
}
export interface SubmissionIdentity {
  submissionId: string;
  projectId: string;
  connectionId: string;
  model: string;
  prompt: string;
  capturedAt: number;
}
export interface TextReceipt {
  identity: SubmissionIdentity;
  submissionState: CreationSubmissionState;
  text: string;
  providerRequestId?: string;
  finishReason: string;
}
export interface ImageOriginal {
  index: number;
  bytes: Uint8Array;
  mime: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  signatureVerified: true;
  providerAssetId?: string;
}
export interface ImageReceipt {
  identity: SubmissionIdentity;
  submissionState: CreationSubmissionState;
  providerRequestId?: string;
  originals: ImageOriginal[];
  /** Retrieval does not claim the independent device archive succeeded. */
  archivalState: "pending";
}
export interface ModelProbe {
  connectionId: string;
  models: { id: string; text: "unknown"; image: "unknown" }[];
  health: "reachable";
  generationVerified: false;
}
export interface GatewayJob {
  id: string;
  status: string;
  requestedOutputs: number;
  completedOutputs: number;
  outputs: {
    index: number;
    status: string;
    assetId?: string;
    assetRoute?: string;
    errorClass?: string;
  }[];
}
