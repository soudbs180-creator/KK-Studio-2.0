import {
  activeChat,
  projectChatView,
  updateActiveChat,
} from "./creationModel.ts";
import type { CreationProject } from "./creationTypes.ts";

/** Adapt legacy component updates; unchanged derived fields never become persisted authority. */
export function updateProjectChatView(
  project: CreationProject,
  update: (view: CreationProject) => CreationProject,
): CreationProject {
  const view = projectChatView(project);
  const next = update(view);
  if (
    !activeChat(project) ||
    next.activeChatId !== view.activeChatId ||
    next.chats !== view.chats
  )
    return projectChatView(next);
  if (
    next.messages === view.messages &&
    next.composerDraft === view.composerDraft &&
    next.agentThreadId === view.agentThreadId
  )
    return next;
  return updateActiveChat(next, (chat) => ({
    ...chat,
    ...(next.messages !== view.messages ? { messages: next.messages } : {}),
    ...(next.composerDraft !== view.composerDraft
      ? {
          draft: {
            ...chat.draft,
            ...next.composerDraft,
            text: next.composerDraft.prompt,
          },
        }
      : {}),
    ...(next.composerDraft !== view.composerDraft &&
    next.composerDraft.conversationChannel
      ? { mainAgent: next.composerDraft.conversationChannel }
      : {}),
    ...(next.agentThreadId !== view.agentThreadId
      ? { agentThreadId: next.agentThreadId }
      : {}),
    updatedAt: Date.now(),
  }));
}

export function appendChatTaskReply(
  project: CreationProject,
  taskId: string,
  chatId: string | undefined,
  text: string,
): CreationProject {
  if (!chatId || !text.trim() || !project.chats?.[chatId]) return project;
  const chat = project.chats[chatId];
  if (
    !chat.messages.some(
      (message) =>
        message.taskId === taskId ||
        message.id === `${project.id}-message-${taskId}`,
    )
  )
    return project;
  const id = `${taskId}-assistant`;
  const messages = chat.messages.some((message) => message.id === id)
    ? chat.messages.map((message) =>
        message.id === id ? { ...message, content: text } : message,
      )
    : [
        ...chat.messages,
        {
          id,
          role: "assistant" as const,
          content: text,
          taskId,
          createdAt: Date.now(),
        },
      ];
  return projectChatView({
    ...project,
    chats: {
      ...project.chats,
      [chatId]: { ...chat, messages, updatedAt: Date.now() },
    },
  });
}
