import type {
  ModelKind,
  ModelSelection,
} from "../../packages/creation-contracts/index.ts";
export type {
  ModelKind,
  ModelSelection,
} from "../../packages/creation-contracts/index.ts";

/** Persist only routing and display metadata; unknown fields never enter projects. */
export function normalizeModelSelection(
  value: unknown,
): ModelSelection | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  if (
    !["default", "codex", "api"].includes(String(item.source)) ||
    typeof item.model !== "string"
  )
    return undefined;
  const source = item.source as ModelSelection["source"];
  const text = (key: string, limit: number) =>
    typeof item[key] === "string" ? item[key].slice(0, limit) : undefined;
  const kind = ["text", "image", "video", "audio", "unknown"].includes(
    String(item.kind),
  )
    ? (item.kind as ModelKind)
    : undefined;
  return {
    source,
    model: item.model.slice(0, 120),
    ...(kind ? { kind } : {}),
    ...(source === "api" && text("connectionId", 120)
      ? { connectionId: text("connectionId", 120) }
      : {}),
    ...(text("displayName", 160)
      ? { displayName: text("displayName", 160) }
      : {}),
    ...(text("effectiveModel", 120)
      ? { effectiveModel: text("effectiveModel", 120) }
      : {}),
  };
}

/** Old home drafts retain their API fields, but do not select an API implicitly. */
export function homeModelSelection(draft: {
  modelSelection?: ModelSelection;
}): ModelSelection {
  return (
    normalizeModelSelection(draft.modelSelection) ?? {
      source: "codex",
      model: "",
      kind: "image",
    }
  );
}

export function codexSelectionLabel(selection: ModelSelection): string {
  if (selection.kind === "image") return "Codex 内置生图";
  return selection.model || "Codex 账号默认";
}
