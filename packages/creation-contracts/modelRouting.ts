export type ModelKind = "text" | "image" | "video" | "audio" | "unknown";

export interface ModelSelection {
  source: "default" | "codex" | "api";
  model: string;
  connectionId?: string;
  kind?: ModelKind;
  /** Non-secret display metadata from the verified model catalog. */
  displayName?: string;
  /** Effective upstream model for generated media; executor is not a model. */
  effectiveModel?: string;
}
