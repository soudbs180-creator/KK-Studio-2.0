import {
  snapshotWriteBlockReason,
  type ChatItem,
  type CreationDraft,
  type CreationProject,
} from "../features/creation/index.ts";
import { useRef, useState } from "react";
import {
  createConversationRewind,
  agentConnection,
} from "../features/agent/index.ts";

function resolveConversationDisabledReason(
  creation: Parameters<typeof snapshotWriteBlockReason>[0],
  saveState: string,
): string | undefined {
  return (
    snapshotWriteBlockReason(creation) ??
    (saveState === "saved" || saveState === "saving"
      ? undefined
      : "请先处理项目读取或保存提示，当前暂不可编辑或执行。")
  );
}

function resolveConversationDraft(
  _saveState: string,
  activeProject: CreationProject | undefined,
  selectedChat: ChatItem | undefined,
): CreationDraft | undefined {
  if (activeProject && selectedChat) {
    return {
      ...activeProject.composerDraft,
      prompt: selectedChat.draft.prompt ?? selectedChat.draft.text ?? "",
      attachments: selectedChat.draft.attachments ?? [],
      model: selectedChat.draft.model ?? "",
      modelSelection: selectedChat.draft.modelSelection,
      conversationChannel:
        selectedChat.mainAgent === "codex"
          ? "codex"
          : selectedChat.mainAgent === "google"
            ? "google"
            : "direct",
    };
  }
  return activeProject?.composerDraft;
}

export function useActiveProjectConversation(
  creation: Parameters<typeof snapshotWriteBlockReason>[0],
  saveState: string,
  activeProject: CreationProject | undefined,
  recovery?: {
    getProject: () => CreationProject | undefined;
    updateProject: (
      id: string,
      update: (project: CreationProject) => CreationProject,
    ) => void;
    flush: () => Promise<void>;
    isBusy: () => boolean;
  },
) {
  const live = useRef({ recovery, saveState, creation });
  live.current = { recovery, saveState, creation };
  const rewinding = useRef(false);
  const [rewindBusy, setRewindBusy] = useState(false);
  async function rewind(messageId: string, agent = false) {
    if (rewinding.current || !live.current.recovery)
      throw new Error("回滚正在处理或项目未就绪");
    rewinding.current = true;
    setRewindBusy(true);
    try {
      const recovery = live.current.recovery;
      await createConversationRewind({
        getProject: recovery.getProject,
        getBlockReason: () =>
          resolveConversationDisabledReason(
            live.current.creation,
            live.current.saveState,
          ),
        isBusy: recovery.isBusy,
        commit: (project) => recovery.updateProject(project.id, () => project),
        flush: recovery.flush,
        agent: agent ? agentConnection : undefined,
      })(messageId);
    } finally {
      rewinding.current = false;
      setRewindBusy(false);
    }
  }
  const projection = resolveActiveProjectConversation(
    creation,
    saveState,
    activeProject,
  );
  return {
    ...projection,
    rewindBusy,
    rewindMessage: recovery ? (id: string) => rewind(id) : undefined,
    rewindAgentMessage: recovery ? (id: string) => rewind(id, true) : undefined,
  };
}

export function resolveActiveProjectConversation(
  creation: Parameters<typeof snapshotWriteBlockReason>[0],
  saveState: string,
  activeProject: CreationProject | undefined,
) {
  const conversationDisabledReason = resolveConversationDisabledReason(
    creation,
    saveState,
  );
  const selectedChat = activeProject?.activeChatId
    ? activeProject.chats?.[activeProject.activeChatId]
    : undefined;
  const conversationDraft = resolveConversationDraft(
    saveState,
    activeProject,
    selectedChat,
  );
  return { conversationDisabledReason, selectedChat, conversationDraft };
}
