export type ModelKind = "text" | "image" | "video" | "audio" | "unknown";
export interface ModelSelection {
  source: "default" | "codex" | "api";
  model: string;
  connectionId?: string;
  kind?: ModelKind;
}
