import { useState } from "react";
import {
  readAgentModel,
  writeAgentModel,
  safeStorage,
} from "../features/agent/agentConnection";
import type { ModelSelection } from "../features/models/modelSelection";
export default function useConversationChannel(
  hasAgent: boolean,
  onModelChange?: (model: string, selection?: ModelSelection) => void,
) {
  const [channel, setChannel] = useState(() =>
    ["direct", "google", "models"].includes(
      safeStorage.getItem("kk-chat-channel") ?? "",
    )
      ? safeStorage.getItem("kk-chat-channel")!
      : "codex",
  );
  const [agentModel, setAgentModel] = useState(readAgentModel);
  function onSelectModel(option: string, selection?: ModelSelection) {
    const codex = selection
      ? selection.source !== "api"
      : hasAgent && channel === "codex";
    setChannel(codex ? "codex" : "direct");
    safeStorage.setItem("kk-chat-channel", codex ? "codex" : "direct");
    if (codex) {
      const model =
        selection?.source === "default" || option === "Codex 账号默认"
          ? undefined
          : option;
      setAgentModel(model);
      writeAgentModel(model);
    } else onModelChange?.(option, selection);
  }
  return { channel, setChannel, agentModel, onSelectModel };
}
