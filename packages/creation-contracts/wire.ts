import type { CanvasItemKind } from "./identity.ts";

/** Exact non-secret capability facts declared by a KK provider connection. */
export interface CapabilityManifest {
  modalities: CanvasItemKind[];
  operations: Array<
    | "generate"
    | "chat"
    | "edit"
    | "inpaint"
    | "outpaint"
    | "image_to_video"
    | "first_last_frame"
    | "subject_reference"
    | "batch"
  >;
  maxReferences?: number;
  maxOutputs?: number;
  maxResolution?: string;
  async: boolean;
  estimatedLatencyClass?: "realtime" | "interactive" | "batch";
}

export type CapabilitySupport = "unknown" | "supported" | "unsupported";
export type ImageModelOperation = "generate" | "edit" | "inpaint" | "outpaint";
export type ImageModelCapabilities = Partial<
  Record<ImageModelOperation, boolean>
> & {
  maxReferences?: number;
  maxGenerationCount?: number;
};

/** Routing and vault identity only. Neither health nor login implies generation verification. */
export interface ProviderConnectionIdentity {
  id: string;
  provider: string;
  kind: "managed_api" | "user_byok" | "user_oauth_local" | "local_comfyui";
  displayName: string;
  baseUrl?: string;
  credentialRef?: string;
  model?: string;
}

/** Provider-reported provenance; absence never implies an authenticity signal. */
export interface AssetProvenance {
  provider?: string;
  model?: string;
  providerRequestId?: string;
  connectionId?: string;
  c2paPresent?: boolean;
  synthIdSignal?: boolean;
  generatedAt: string;
}

/** Immutable archive metadata. Original bytes and display previews belong to platform adapters. */
export interface StoredAssetMetadata {
  assetId: string;
  sha256: string;
  mime: string;
  tags: string[];
  sourceJobId?: string;
  promptHash?: string;
  parentId?: string;
  isAiGenerated?: boolean;
  source?: "provider" | "upload";
  origins?: Array<{
    sourceJobId?: string;
    promptHash?: string;
    parentId?: string;
    provenance: AssetProvenance;
  }>;
  provenance: AssetProvenance;
}
