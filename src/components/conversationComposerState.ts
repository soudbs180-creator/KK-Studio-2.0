import {
  canSubmitGeneration,
  type getGenerationUiState,
} from "../domain/uiGovernance.ts";
import type ConversationComposerRegion from "./ConversationComposerRegion";
import type { ConversationPanelProps } from "./ConversationPanel.types";

/** Derive the existing composer presentation without owning draft or Agent state. */
export function conversationComposerState({
  submitting,
  agentActive,
  agentConnecting,
  agent,
  readingFiles,
  directState,
  agentModel,
  currentModel,
  project,
  approvalMode,
}: {
  submitting: boolean;
  agentActive: boolean;
  agentConnecting: boolean;
  agent: ConversationPanelProps["agent"];
  readingFiles: number;
  directState: ReturnType<typeof getGenerationUiState>;
  agentModel: string | undefined;
  currentModel: string | undefined;
  project: ConversationPanelProps["project"];
  approvalMode: "auto" | "ask";
}): Pick<
  Parameters<typeof ConversationComposerRegion>[0],
  | "disabled"
  | "submitDisabled"
  | "placeholder"
  | "modelSelection"
  | "approvalMode"
> {
  return {
    disabled:
      submitting ||
      (agentActive && (agentConnecting || Boolean(agent?.sending))),
    submitDisabled:
      submitting ||
      (!agentActive && (!canSubmitGeneration(directState) || readingFiles > 0)),
    placeholder: agentActive
      ? "描述任务，Agent 会读取画布并执行操作"
      : "描述你想要生成的内容",
    modelSelection: agentActive
      ? {
          source: agentModel ? "codex" : "default",
          model: agentModel ?? "",
        }
      : {
          source: "api",
          model: currentModel ?? "",
          connectionId: project?.composerDraft.providerConnectionId,
        },
    approvalMode: agentActive
      ? agent?.permissionMode === "request"
        ? "ask"
        : "auto"
      : approvalMode,
  };
}
