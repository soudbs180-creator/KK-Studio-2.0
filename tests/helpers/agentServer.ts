import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AgentConversationState } from "../../src/features/agent/agentTypes.ts";
import { prepareIdleConversation } from "../../scripts/agent/prepareIdleConversation.ts";

async function readJsonBody(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  return text ? JSON.parse(text) : {};
}

/** Loopback protocol fixture; no CLI, account or paid Provider is invoked. */
export async function startAgentServer(
  initialStatus: AgentConversationState["status"] = "ready",
  safePreparation = true,
) {
  const streams = new Set<ServerResponse>();
  const streamScopes = new Map<ServerResponse, unknown>();
  const clients = new Set<string>();
  const requests: string[] = [];
  const turns: Record<string, unknown>[] = [];
  const decisions: Record<string, unknown>[] = [];
  const pendingApprovals = new Map<string, unknown>();
  const authentication: { urlToken: boolean; headerPresent: boolean }[] = [];
  let failAction = false;
  let newThreads = 0;
  let busyOverride: boolean | undefined;
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
    if (type === "codex_state") busyOverride = (data as { busy: boolean }).busy;
    if (type === "codex_approval")
      pendingApprovals.set((data as { requestId: string }).requestId, data);
    if (type === "codex_approval_resolved")
      pendingApprovals.delete((data as { requestId: string }).requestId);
    if (type === "conversation_changed")
      conversation = data as AgentConversationState;
    for (const stream of streams)
      stream.write(
        `event: ${type}\ndata: ${JSON.stringify(data && typeof data === "object" ? { scope: streamScopes.get(stream), ...(type === "tool_call" ? { threadId: conversation.threadId, turnId: "fixture-turn" } : {}), ...data } : data)}\n\n`,
      );
  };
  const handleEventsRequest = (url: URL, response: ServerResponse) => {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });
    streams.add(response);
    streamScopes.set(
      response,
      JSON.parse(url.searchParams.get("scope") ?? "null"),
    );
    const clientId = url.searchParams.get("clientId") ?? "";
    clients.add(clientId);
    response.on("close", () => {
      streams.delete(response);
      streamScopes.delete(response);
      clients.delete(clientId);
    });
    response.write(
      `event: hello\ndata: ${JSON.stringify({ ok: true, protocolVersion: 7, clientId, conversation, workspace: { activeThreadId: conversation.threadId }, codex: { busy: busyOverride ?? conversation.status === "running" }, pendingApprovals: [...pendingApprovals.values()] })}\n\n`,
    );
  };
  const handlePrepareRequest = async (
    body: Record<string, unknown>,
    response: ServerResponse,
  ) => {
    if (!safePreparation) {
      response.writeHead(404).end(JSON.stringify({ error: "not found" }));
      return;
    }
    // The same guarded handler is installed in vendor under codexMutation.
    const result = await prepareIdleConversation(body, {
      hasClient: (id) => clients.has(id),
      conversation: () => conversation,
      begin: (clientId) => {
        conversation = {
          ...conversation,
          revision: conversation.revision + 1,
          status: "preparing",
          sourceClientId: clientId,
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
  };
  const handleTurnRequest = (
    body: Record<string, unknown>,
    response: ServerResponse,
  ) => {
    if (
      !["ready", "warning"].includes(conversation.status) ||
      !clients.has(String(body.clientId ?? ""))
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
  };
  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "content-type, authorization, x-canvas-agent-token,x-canvas-agent-client,x-canvas-agent-scope",
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
      handleEventsRequest(url, response);
      return;
    }
    const body = await readJsonBody(request);
    response.setHeader("Content-Type", "application/json");
    if (url.pathname === "/config") {
      response.end(JSON.stringify({ ok: true, protocolVersion: 7 }));
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
      await handlePrepareRequest(body, response);
      return;
    }
    if (url.pathname === "/agent/codex/threads/new") {
      // Match upstream mutation; bound chats and busy/approval states must reject it.
      newThreads++;
      conversation = {
        ...conversation,
        revision: conversation.revision + 1,
        threadId:
          newThreads === 1
            ? "replacement-thread"
            : `replacement-thread-${newThreads}`,
        status: "ready",
      };
      emit("conversation_changed", conversation);
      response.end(JSON.stringify({ ok: true, conversation }));
      return;
    }
    const resumedThread = url.pathname.match(
      /^\/agent\/codex\/threads\/([^/]+)\/resume$/,
    );
    if (resumedThread) {
      conversation = {
        ...conversation,
        threadId: decodeURIComponent(resumedThread[1]),
        status: "ready",
        revision: conversation.revision + 1,
      };
      emit("conversation_changed", conversation);
      response.end(JSON.stringify({ ok: true, conversation, messages: [] }));
      return;
    }
    if (url.pathname === "/agent/codex/turn") {
      handleTurnRequest(body, response);
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
