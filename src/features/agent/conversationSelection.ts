import {
  normalizeModelSelection,
  type ModelSelection,
} from "../../domain/modelSelection.ts";
import type { CreationDraft } from "../creation/index.ts";

/** A legacy project restores text preferences, never another project's image intent. */
export function restoreConversationSelection(
  draft:
    Pick<CreationDraft, "modelSelection" | "conversationChannel"> | undefined,
  legacy: { channel?: string | null; model?: string },
): { channel: "codex" | "direct" | "google"; selection: ModelSelection } {
  const own = normalizeModelSelection(draft?.modelSelection);
  const legacyChannel =
    legacy.channel === "direct" || legacy.channel === "google"
      ? legacy.channel
      : "codex";
  return {
    channel:
      draft?.conversationChannel ??
      (own ? (own.source === "api" ? "direct" : "codex") : legacyChannel),
    selection:
      own && own.source !== "api"
        ? own
        : legacy.model
          ? { source: "codex", model: legacy.model, kind: "text" }
          : { source: "default", model: "" },
  };
}
