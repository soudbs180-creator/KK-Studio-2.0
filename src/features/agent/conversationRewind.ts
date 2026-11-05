import { z } from "zod";
import {
  TurnRewindRecoveryController,
  type ConversationTurn,
  type RewindRecord,
} from "../../domain/conversationRecovery.ts";
import {
  activeChat,
  updateActiveChat,
  type CreationProject,
  type ChatItemMessage,
} from "../creation/index.ts";
import type { agentConnection } from "./agentConnection.ts";
import { resetGatewayAffinity } from "../ai-gateway/index.ts";
import { sumTokenUsage } from "../../domain/tokenUsage.ts";

const usageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});
const zero = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
export function createConversationRewind(options: {
  getProject(): CreationProject | undefined;
  getBlockReason(): string | undefined;
  isBusy(): boolean;
  commit(project: CreationProject): void;
  flush(): Promise<void>;
  agent?: typeof agentConnection;
}) {
  const original = options.getProject();
  const projectId = original?.id,
    chatId = original?.activeChatId;
  const key = JSON.stringify([projectId, chatId ?? null]);
  const read = () => {
    const blocked = options.getBlockReason();
    if (blocked) throw new Error(blocked);
    const project = options.getProject();
    if (!project || project.id !== projectId || project.activeChatId !== chatId)
      throw new Error("项目或聊天已切换，未回滚其他聊天");
    if (!activeChat(project)) throw new Error("请先打开一个有效聊天后回滚");
    return project;
  };
  const messages = (): ChatItemMessage[] =>
    options.agent
      ? options.agent
          .getState()
          .messages.map(({ text, ...m }) => ({ ...m, content: text }))
      : activeChat(read())!.messages;
  const update = (
    fn: (
      chat: NonNullable<ReturnType<typeof activeChat>>,
    ) => NonNullable<ReturnType<typeof activeChat>>,
  ) => options.commit(updateActiveChat(read(), fn));
  let verifiedTurnIds: string[] | undefined;
  let expectedMessageIds: string[] = [];
  const controller = new TurnRewindRecoveryController({
    validateRewindHistory: (_before, latest) =>
      JSON.stringify(latest.map((m) => m.turnId)) ===
      JSON.stringify(expectedMessageIds),
    getThreadId: () => {
      try {
        read();
        return key;
      } catch {
        return "";
      }
    },
    getTurns: async (): Promise<ConversationTurn[]> =>
      messages().map((m) => ({
        turnId: m.id,
        role: m.role === "error" ? "system" : m.role,
        content: m.content,
        status: "completed",
        timestamp: typeof m.createdAt === "number" ? m.createdAt : 0,
        tokenUsage: usageSchema.safeParse(m.tokenUsage).data,
      })),
    isThreadBusy: () => options.isBusy(),
    persistBackupSnapshot: async (record: RewindRecord) => {
      if (options.agent) {
        const history = await options.agent.readRewindHistory();
        verifiedTurnIds = history.turnIds;
        if (!verifiedTurnIds?.length)
          throw new Error("远端轮次不可核验，未执行回滚");
      }
      const backup = {
        ...structuredClone(record),
        messages: structuredClone(messages()),
        tokenUsage:
          usageSchema.safeParse(activeChat(read())!.tokenUsage).data ?? zero,
      };
      update((chat) => ({
        ...chat,
        rewindBackups: [
          ...(Array.isArray(chat.rewindBackups)
            ? chat.rewindBackups
            : []
          ).slice(-19),
          backup,
        ],
      }));
      await options.flush();
      read();
    },
    executeCompensationPrompt: async (_thread, prompt) => {
      read();
      expectedMessageIds = messages().map((m) => m.id);
      const runId = prompt.match(/KK_REWIND_RESULT_(.+)=/)?.[1];
      if (!runId) throw new Error("恢复请求标识无效");
      if (!options.agent) {
        if (messages().some((m) => m.role === "tool" || m.turnId))
          throw new Error("该聊天含工具操作，请通过原 Agent 连接回滚");
        return `KK_REWIND_RESULT_${runId}=${JSON.stringify({ status: "complete", undone: [], unresolved: [], verification: ["API聊天没有文件工具操作；只回滚本地对话与用量投影，保留已有生成资产"] })}`;
      }
      const agent = options.agent;
      const beforeIds = new Set(agent.getState().messages.map((m) => m.id));
      const sent = await agent.sendMessage(prompt, {
        memoryMode: "none",
        isTemporary: true,
      });
      if (!sent.ok) throw new Error(sent.error ?? "补偿请求未受理");
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => {
            stop();
            reject(new Error("补偿执行超时；备份已保留，未截断历史"));
          },
          10 * 60 * 1000,
        );
        const check = () => {
          try {
            read();
          } catch (error) {
            clearTimeout(timer);
            stop();
            reject(error);
            return;
          }
          const state = agent.getState();
          if (!state.sending) {
            clearTimeout(timer);
            stop();
            if (state.error) reject(new Error(state.error));
            else resolve();
          }
        };
        const stop = agent.subscribe(check);
        check();
      });
      const history = await agent.readRewindHistory();
      if (
        !history.turnIds ||
        !verifiedTurnIds ||
        history.turnIds.length !== verifiedTurnIds.length + 1 ||
        JSON.stringify(history.turnIds.slice(0, -1)) !==
          JSON.stringify(verifiedTurnIds)
      )
        throw new Error("补偿期间出现其他轮次，未截断历史");
      verifiedTurnIds = history.turnIds;
      expectedMessageIds = messages().map((m) => m.id);
      const output = agent
        .getState()
        .messages.filter((m) => !beforeIds.has(m.id) && m.role === "assistant")
        .map((m) => m.text)
        .join("\n");
      return output;
    },
    truncateConversation: async (_thread, beforeId) => {
      read();
      if (options.agent) {
        const target = options.agent
          .getState()
          .messages.find((m) => m.id === beforeId);
        if (!target?.turnId || !verifiedTurnIds)
          throw new Error("目标消息没有可验证的远端轮次");
        await options.agent.revertConversation(target.turnId, verifiedTurnIds);
      } else {
        update((chat) => {
          const index = chat.messages.findIndex((m) => m.id === beforeId);
          if (index < 0) throw new Error("目标消息已变化");
          return {
            ...chat,
            messages: chat.messages.slice(0, index),
            updatedAt: Date.now(),
          };
        });
      }
      await options.flush();
    },
    rollbackTokenUsage: () => {
      update((chat) => ({ ...chat, tokenUsage: sumTokenUsage(chat.messages) }));
    },
    resetGatewayAffinity: () => {
      resetGatewayAffinity(key);
    },
  });
  return async (messageId: string) => {
    const list = messages(),
      index = list.findIndex((m) => m.id === messageId);
    if (index < 0) throw new Error("目标消息不存在");
    const target =
      list
        .slice(0, index + 1)
        .reverse()
        .find((m) => m.role === "user") ?? list[index];
    const record = await controller.executeRewind(key, target.id);
    await options.flush();
    return record;
  };
}
