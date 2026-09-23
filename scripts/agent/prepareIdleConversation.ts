/** KK Studio conditional initialization. Called inside the service mutation lock. */
interface Conversation {
  revision: number;
  conversationId: string;
  threadId: string;
  status: string;
}

export async function prepareIdleConversation<C extends Conversation>(
  input: unknown,
  context: {
    hasClient: (clientId: string) => boolean;
    conversation: () => C;
    begin: (clientId: string) => void;
    prepare: (
      clientId: string,
      permissionMode: "request" | "automatic" | "full",
    ) => Promise<unknown>;
  },
) {
  const body = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const state = context.conversation();
  if (!clientId || !context.hasClient(clientId)) {
    return {
      status: 409,
      body: { ok: false, error: "发起准备的页面已断开，请重新连接。", state },
    };
  }
  if (
    state.status !== "idle" ||
    state.threadId ||
    body.expectedConversationId !== state.conversationId ||
    body.expectedRevision !== state.revision
  ) {
    return {
      status: 409,
      body: {
        ok: false,
        code: "CONVERSATION_STALE",
        error: "会话已变化，已保留现有会话。请核对后继续。",
        state,
      },
    };
  }
  // No await between the authoritative check and begin. The caller holds the
  // same mutation lock used by new/resume/turn, including through preparation.
  context.begin(clientId);
  const permission =
    body.permissionMode === "automatic" || body.permissionMode === "full"
      ? body.permissionMode
      : "request";
  await context.prepare(clientId, permission);
  return {
    status: 200,
    body: { ok: true, conversation: context.conversation() },
  };
}
