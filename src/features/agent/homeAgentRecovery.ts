import {
  activeChat,
  projectChatView,
  updateActiveChat,
  type CreationDraft,
  type CreationProject,
} from "../creation/index.ts";
import type { ModelSelection } from "../../domain/modelSelection";
import type { AgentConnection } from "./agentConnection";
import type { AgentDraftAttachment } from "./agentAttachments";
import { sameJson } from "../creation/index.ts";

/** Apply the same proxy identity before either automatic or HOME connection. */
export function configureAgentProxy(
  connection: Pick<AgentConnection, "setCredentials">,
  enabled: boolean,
): boolean {
  if (!enabled) return false;
  connection.setCredentials("/kk-agent", "");
  return true;
}

function pendingAgentCanvasSource(
  project: CreationProject | undefined,
  selection: ModelSelection | undefined,
): { nodeId: string; kind: "image" } | undefined {
  if (
    !project?.composerDraft.pendingAgent ||
    selection?.source !== "codex" ||
    selection.kind !== "image"
  )
    return;
  const root = project.items.find(
    (item) => item.id === `${project.id}-prompt` && item.kind === "image",
  );
  return root ? { nodeId: root.id, kind: "image" } : undefined;
}

export function sendProjectAgentMessage(
  connection: Pick<AgentConnection, "sendMessage">,
  project: CreationProject | undefined,
  message: string,
  attachments: AgentDraftAttachment[] | undefined,
  selection: ModelSelection | undefined,
) {
  const activeChat =
    project?.chats && project?.activeChatId
      ? project.chats[project.activeChatId]
      : undefined;
  // Codex uses its account reasoning model; never send the project's API model.
  return connection.sendMessage(message, {
    attachments,
    selection,
    outputCount:
      selection?.kind === "image"
        ? project?.composerDraft.outputCount
        : undefined,
    canvasSource: pendingAgentCanvasSource(project, selection),
    isTemporary: activeChat?.isTemporary,
    modelAllowlist: activeChat
      ? [...(activeChat.modelAllowlist ?? [])]
      : undefined,
  });
}

/** Retire the accepted HOME source while preserving any next request already edited. */
export function clearSentPendingDraft(
  project: CreationProject,
  sent: CreationDraft | undefined,
  originChatId = project.activeChatId,
): CreationProject {
  if (sent?.pendingAgent !== true) return project;
  const canonical =
    project.chats !== undefined || project.activeChatId !== undefined;
  if (canonical) {
    if (
      !originChatId ||
      !project.chats ||
      Array.isArray(project.chats) ||
      !activeChat(project) ||
      !Object.hasOwn(project.chats, originChatId) ||
      project.chats[originChatId]?.id !== originChatId
    )
      return project;
  } else if (originChatId !== undefined) return project;
  const scoped = canonical
    ? projectChatView({ ...project, activeChatId: originChatId })
    : project;
  if (scoped.composerDraft.pendingAgent !== true) return project;
  const draft = {
    ...scoped.composerDraft,
    ...(sameJson(scoped.composerDraft, sent)
      ? { prompt: "", attachments: [] }
      : {}),
    pendingAgent: undefined,
  };
  if (!canonical) return { ...project, composerDraft: draft };
  const updated = updateActiveChat(scoped, (chat) => ({
    ...chat,
    draft: { ...chat.draft, ...draft, text: draft.prompt },
    updatedAt: Date.now(),
  }));
  return projectChatView({ ...updated, activeChatId: project.activeChatId });
}
