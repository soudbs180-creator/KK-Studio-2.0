import {
  snapshotWriteBlockReason,
  type ChatItem,
  type CreationDraft,
  type CreationProject,
} from "../features/creation/index.ts";

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
