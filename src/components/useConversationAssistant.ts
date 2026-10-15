import type { SkillRegistry } from "../features/skills/skillRegistry";
import { composeAssistantPrompt } from "../features/assistants/assistantProfiles";
import type { AgentConversationProps } from "./AgentConversationMessages";

export default function useConversationAssistant(
  registry: SkillRegistry | undefined,
  id: string | undefined,
  agent: AgentConversationProps | undefined,
) {
  const compose = (message: string) => {
    if (!id) return message;
    const record = registry?.getRecord(id);
    if (!record) throw new Error("所选助手已不可用，请重新选择。");
    return composeAssistantPrompt(message, record);
  };
  const assistantAgent = agent
    ? {
        ...agent,
        onSend: async (
          message: string,
          attachments?: Parameters<typeof agent.onSend>[1],
        ) => {
          try {
            return await agent.onSend(compose(message), attachments);
          } catch (error) {
            return {
              ok: false,
              error: error instanceof Error ? error.message : "助手不可用",
            };
          }
        },
      }
    : undefined;
  return { compose, assistantAgent };
}
