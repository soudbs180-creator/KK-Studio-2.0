import type { CreationDraft, CreationProject } from "../creation/model";
import type { ModelSelection } from "../../domain/modelSelection";
import type { AgentConnection } from "./agentConnection";
import type { AgentDraftAttachment } from "./agentAttachments";

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
    modelAllowlist:
      activeChat?.modelAllowlist && activeChat.modelAllowlist.length > 0
        ? activeChat.modelAllowlist
        : undefined,
  });
}

/** Only the pending durable draft owned by this send may be retired. */
export function clearSentPendingDraft(
  project: CreationProject,
  sent: CreationDraft | undefined,
): CreationProject {
  if (!project.composerDraft.pendingAgent || project.composerDraft !== sent)
    return project;
  return {
    ...project,
    composerDraft: {
      ...project.composerDraft,
      prompt: "",
      attachments: [],
      pendingAgent: undefined,
    },
  };
}
