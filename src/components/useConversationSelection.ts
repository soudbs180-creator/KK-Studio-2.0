import { useLayoutEffect, useState } from "react";
import type { CreationDraft } from "../features/creation/index.ts";
import {
  codexSelectionLabel,
  type ModelSelection,
} from "../domain/modelSelection";
import {
  readAgentModel,
  writeAgentModel,
  safeStorage,
} from "../features/agent/index.ts";
import { codexReasoningModel } from "../features/agent/index.ts";
import { restoreConversationSelection } from "../features/agent/index.ts";

export default function useConversationSelection({
  projectId,
  draft,
  locked,
  patch,
  onApiModel,
  onStatus,
}: {
  projectId?: string;
  draft?: CreationDraft;
  locked: boolean;
  patch: (patch: Partial<CreationDraft>) => void;
  onApiModel?: (model: string, selection?: ModelSelection) => void;
  onStatus: (status: string) => void;
}) {
  const restore = () =>
    restoreConversationSelection(draft, {
      channel: safeStorage.getItem("kk-chat-channel"),
      model: readAgentModel(),
    });
  const [state, setState] = useState(restore);
  useLayoutEffect(
    () => setState(restore()),
    [projectId, draft?.modelSelection, draft?.conversationChannel],
  );
  function changeChannel(value: string) {
    if (
      locked ||
      (value !== "codex" && value !== "direct" && value !== "google")
    )
      return;
    setState((current) => ({ ...current, channel: value }));
    patch({
      conversationChannel: value,
      ...(value === "codex" ? { modelSelection: state.selection } : {}),
    });
    safeStorage.setItem("kk-chat-channel", value);
    onStatus("");
  }
  function selectModel(model: string, choice?: ModelSelection) {
    if (locked) return;
    const selection = choice ?? { source: "default", model: "" };
    const channel = selection.source === "api" ? "direct" : "codex";
    safeStorage.setItem("kk-chat-channel", channel);
    if (channel === "direct") {
      setState((current) => ({ ...current, channel }));
      onApiModel?.(model, selection);
    } else {
      setState({ channel, selection });
      if (selection.kind !== "image")
        writeAgentModel(codexReasoningModel(selection));
      patch({ modelSelection: selection, conversationChannel: channel });
    }
  }
  return {
    channel: state.channel,
    agentSelection: state.selection,
    agentModel: codexSelectionLabel(state.selection),
    changeChannel,
    selectModel,
  };
}
