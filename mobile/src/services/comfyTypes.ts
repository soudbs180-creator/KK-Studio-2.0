import type { CreationTaskStatus } from "@kk-studio/creation-contracts";
import type { ImageOriginal, CredentialReader } from "./providerTypes.ts";
import type { HttpOptions } from "./httpClient.ts";
import type { ComfyWorkflow, MobileComfyIdentity } from "../core/comfyModel.ts";
export type {
  ComfyValue,
  ComfyNode,
  ComfyWorkflow,
} from "../core/comfyModel.ts";

export interface ComfyConnection {
  id: string;
  baseUrl: string;
  protocol: "comfyui";
  credentialRef?: string;
}
export interface ComfyWorkflowInput {
  submissionId: string;
  projectId: string;
  workflowRevision: number;
  connection: ComfyConnection;
  workflow: ComfyWorkflow;
  capturedAt?: number;
}
export type ComfyIdentity = MobileComfyIdentity;
export interface ComfySubmissionReceipt {
  identity: ComfyIdentity;
  promptId: string;
  promptIdConfirmed?: boolean;
  queueNumber?: number;
  submissionState: "submitted";
  readOnly?: boolean;
}
export interface ComfyImageOutput {
  index: number;
  nodeId: string;
  promptId: string;
  connectionId: string;
  filename: string;
  subfolder: string;
  type: "output" | "temp";
}
export interface ComfyPollReceipt {
  receipt: ComfySubmissionReceipt;
  status: CreationTaskStatus;
  outputs: ComfyImageOutput[];
  errorCode?: string;
}
export interface ComfyOriginal extends ImageOriginal {
  promptId: string;
  nodeId: string;
  filename: string;
}
export interface ComfyInputDefinition {
  required: boolean;
  type: string | (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
}
export interface ComfyNodeDefinition {
  classType: string;
  inputs: Record<string, ComfyInputDefinition>;
  outputTypes: string[];
  outputNode: boolean;
}
export type ComfyNodeCatalog = Record<string, ComfyNodeDefinition>;
export interface ComfyHealth {
  connectionId: string;
  reachable: true;
  generationVerified: false;
  cancellation: "unknown";
  version?: string;
}
export interface ComfyCancelReceipt {
  receipt: ComfySubmissionReceipt;
  available: boolean;
  cancelRequested: boolean;
  providerCancellationConfirmed: false;
  reason?: string;
}
export interface ComfyClientOptions extends HttpOptions {
  credentials?: CredentialReader;
}
