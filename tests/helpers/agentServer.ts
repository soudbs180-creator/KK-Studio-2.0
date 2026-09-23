import { createServer, type ServerResponse } from "node:http";
import type { AgentConversationState } from "../../src/features/agent/agentTypes.ts";
import { prepareIdleConversation } from "../../scripts/agent/prepareIdleConversation.ts";

/** Loopback protocol fixture; no CLI, account or paid Provider is invoked. */
export async function startAgentServer(
  initialStatus: AgentConversationState["status"] = "ready",
  safePreparation = true,
) {
  const streams = new Set<ServerResponse>();
  const clients = new Set<string>();
  const requests: string[] = [];
  const turns: Record<string, unknown>[] = [];
  const decisions: Record<string, unknown>[] = [];
  const pendingApprovals = new Map<string, unknown>();
  const authentication: { urlToken: boolean; headerPresent: boolean }[] = [];
  let failAction = false;
  let conversation: AgentConversationState = {
    revision: 1,
    conversationId: "fixture-conversation",
    threadId: initialStatus === "idle" ? "" : "fixture-thread",
    status: initialStatus,
    mcpStatuses:
      initialStatus === "warning"
        ? {
            "infinite-canvas": { status: "ready" },
            optional: { status: "failed", error: "可选工具不可用" },
          }
        : {},
  };
  const emit = (type: string, data: unknown) => {
    if (type === "codex_approval")
      pendingApprovals.set((data as { requestId: string }).requestId, data);
    if (type === "codex_approval_resolved")
      pendingApprovals.delete((data as { requestId: string }).requestId);
    if (type === "conversation_changed")
      conversation = data as AgentConversationState;
    for (const stream of streams)
      stream.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "content-type, authorization, x-canvas-agent-token",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    const url = new URL(request.url!, "http://localhost");
    requests.push(url.pathname);
    if (url.pathname !== "/config")
      authentication.push({
        urlToken: url.searchParams.has("token"),
        headerPresent: Boolean(request.headers["x-canvas-agent-token"]),
      });
    if (url.pathname === "/events") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      streams.add(response);
      const clientId = url.searchParams.get("clientId") ?? "";
      clients.add(clientId);
      response.on("close", () => {
        streams.delete(response);
        clients.delete(clientId);
      });
      response.write(
        `event: hello\ndata: ${JSON.stringify({ ok: true, protocolVersion: 6, clientId, conversation, workspace: { activeThreadId: conversation.threadId }, codex: { busy: conversation.status === "running" }, pendingApprovals: [...pendingApprovals.values()] })}\n\n`,
      );
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString();
    const body = text ? JSON.parse(text) : {};
    response.setHeader("Content-Type", "application/json");
    if (url.pathname === "/config") {
      response.end(JSON.stringify({ ok: true, protocolVersion: 6 }));
      return;
    }
    if (
      /^\/agent\/codex\/threads\/[^/]+$/.test(url.pathname) &&
      request.method === "GET"
    ) {
      response.end(JSON.stringify({ ok: true, conversation, messages: [] }));
      return;
    }
    if (
      ["/canvas/activate", "/canvas/state"].includes(url.pathname) &&
      !clients.has(url.searchParams.get("clientId") ?? "")
    ) {
      response.writeHead(409).end(JSON.stringify({ error: "当前网页未连接" }));
      return;
    }
    if (url.pathname === "/agent/codex/conversation/prepare") {
      if (!safePreparation) {
        response.writeHead(404).end(JSON.stringify({ error: "not found" }));
        return;
      }
      // The same guarded handler is installed in vendor under codexMutation.
      const result = await prepareIdleConversation(body, {
        hasClient: (id) => clients.has(id),
        conversation: () => conversation,
        begin: () => {
          conversation = {
            ...conversation,
            revision: conversation.revision + 1,
            status: "preparing",
          };
          emit("conversation_changed", conversation);
        },
        prepare: async () => {
          conversation = {
            ...conversation,
            revision: conversation.revision + 1,
            status: "ready",
            threadId: "fixture-thread",
          };
          emit("conversation_changed", conversation);
        },
      });
      response.writeHead(result.status).end(JSON.stringify(result.body));
      return;
    }
    if (url.pathname === "/agent/codex/threads/new") {
      // Match upstream's unconditional replacement; the UI must never use this.
      conversation = {
        ...conversation,
        revision: conversation.revision + 1,
        threadId: "replacement-thread",
        status: "ready",
      };
      emit("conversation_changed", conversation);
      response.end(JSON.stringify({ ok: true, conversation }));
      return;
    }
    if (url.pathname === "/agent/codex/turn") {
      if (
        !["ready", "warning"].includes(conversation.status) ||
        !clients.has(body.clientId)
      ) {
        response.writeHead(409).end(JSON.stringify({ error: "会话尚未就绪" }));
        return;
      }
      turns.push(body);
      conversation = { ...conversation, status: "running" };
      response.end(
        JSON.stringify({
          ok: true,
          threadId: conversation.threadId,
          state: { ...conversation, status: "running" },
        }),
      );
      emit("chat_message", {
        message: {
          id: "user-echo",
          role: "user",
          text: body.messageText,
          clientMessageId: body.messageId,
        },
      });
      return;
    }
    if (
      url.pathname === "/agent/codex/approval" ||
      url.pathname === "/agent/codex/interrupt"
    ) {
      if (failAction) {
        response
          .writeHead(503)
          .end(JSON.stringify({ error: "受控服务暂时不可用" }));
        return;
      }
      decisions.push(body);
      response.end(JSON.stringify({ ok: true }));
      if (url.pathname === "/agent/codex/interrupt") {
        conversation = { ...conversation, status: "ready" };
        emit("codex_state", { busy: false });
        emit("conversation_changed", conversation);
      }
      return;
    }
    response.end(JSON.stringify({ ok: true }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No fixture port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    turns,
    requests,
    conversation: () => conversation,
    decisions,
    authentication,
    emit,
    failActions: (value: boolean) => {
      failAction = value;
    },
    disconnect: () => {
      for (const stream of streams) stream.end();
    },
    close: async () => {
      for (const stream of streams) stream.end();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
