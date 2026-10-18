/** API workflow data only; semantic node/catalog checks belong to the executing client. */
export type ComfyValue = string | number | boolean | null | [string, number];
export interface ComfyNode {
  class_type: string;
  inputs: Record<string, ComfyValue>;
  _meta?: { title: string };
}
export type ComfyWorkflow = Record<string, ComfyNode>;
export interface MobileComfyIdentity {
  submissionId: string;
  projectId: string;
  connectionId: string;
  baseUrl: string;
  workflowRevision: number;
  workflow: ComfyWorkflow;
  capturedAt: number;
}
/** Captured before HTTP submission; an unconfirmed promptId is only the requested UUID hint. */
export interface MobileComfyCapture {
  identity: MobileComfyIdentity;
  requestedOutputs: number;
  promptId: string;
  promptIdConfirmed: boolean;
  queueNumber?: number;
  outputs?: MobileComfyOutputIdentity[];
}
/** Append-only slot identities persisted before fetching bytes; hashes bind archived slots. */
export interface MobileComfyOutputIdentity {
  slot: number;
  key: string;
  nodeId: string;
  filename: string;
  subfolder: string;
  type: "output" | "temp";
  sha256?: string;
}
