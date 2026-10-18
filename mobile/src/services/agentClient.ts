import type {
  MobileAgentOptions,
  MobileAgentConnection,
  AgentHealth,
  MobileAgentModel,
  MobileAgentThread,
  AgentTurnInput,
  AgentTurnReceipt,
  AgentContext,
  MobileAgentEvent,
  AgentApprovalInput,
} from "./agentTypes.ts";
import {
  ServiceError,
  checkedUrl,
  nonempty,
  readJson,
  record,
  requireOk,
  requireSubmissionOk,
  withHttp,
} from "./httpClient.ts";
import {
  captureAgentContext,
  parseAgentConversation,
  readAgentStream,
} from "./agentProtocol.ts";
export const MOBILE_AGENT_UNAVAILABLE_REASON =
  "现有 KK Agent 协议仅面向桌面 loopback 和共享工作区；尚无绑定手机账号、设备和项目权限的远程执行协议。";
export class AgentServiceError extends ServiceError {
  agentReceipt?: AgentTurnReceipt;
}
export function createMobileAgentClient(options: MobileAgentOptions) {
  options = {
    ...options,
    localTestApproval: options.localTestApproval
      ? Object.freeze({ ...options.localTestApproval })
      : undefined,
  };
  const started = new Set<string>();
  const eventSlots = new Set<string>();
  const streams = new Map<string, AgentContext>();
  const approvals = new Map<string, AgentApprovalInput["preview"]>();
  function base(connection: MobileAgentConnection) {
    if (
      options.development !== true ||
      options.desktopDiagnostics !== true ||
      options.allowLoopbackHttp !== true ||
      connection.protocol !== "kk-desktop-agent-v6"
    )
      throw new AgentServiceError("MOBILE_AGENT_EXECUTION_UNAVAILABLE");
    const url = checkedUrl(connection.baseUrl, true);
    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.pathname !== "/" ||
      !nonempty(connection.id) ||
      !nonempty(connection.credentialRef)
    )
      throw new AgentServiceError("REMOTE_AGENT_PROTOCOL_UNAVAILABLE");
    return url;
  }
  function approved(connection: MobileAgentConnection, input: AgentContext) {
    base(connection);
    const context = captureAgentContext(input);
    const approval = options.localTestApproval;
    if (
      !approval ||
      approval.kind !== "explicit-user-approved-local-test" ||
      !Number.isFinite(approval.expiresAt) ||
      approval.expiresAt <= Date.now() ||
      approval.expiresAt > Date.now() + 15 * 60_000 ||
      ["accountId", "deviceId", "projectId", "clientId"].some(
        (field) =>
          approval[
            field as "accountId" | "deviceId" | "projectId" | "clientId"
          ] !==
          context[field as "accountId" | "deviceId" | "projectId" | "clientId"],
      )
    )
      throw new AgentServiceError("LOCAL_AGENT_TEST_APPROVAL_REQUIRED");
    return context;
  }
  async function token(connection: MobileAgentConnection, signal: AbortSignal) {
    const value = await options.credentials.read(connection.credentialRef);
    if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
    if (!value || /[\r\n]/.test(value))
      throw new ServiceError("AGENT_CREDENTIAL_REQUIRED");
    return { "x-canvas-agent-token": value };
  }
  async function request(
    connection: MobileAgentConnection,
    route: string,
    signal?: AbortSignal,
    body?: unknown,
    beforeSend?: () => void,
  ) {
    connection = Object.freeze({ ...connection });
    const url = new URL(route, base(connection));
    const encodedBody = body === undefined ? undefined : JSON.stringify(body);
    return withHttp(options, signal, async (fetcher, requestSignal) => {
      const headers =
        route === "/health" ? {} : await token(connection, requestSignal);
      if (requestSignal.aborted) throw new ServiceError("REQUEST_ABORTED");
      beforeSend?.();
      const response = await fetcher(url, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...headers,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(encodedBody === undefined ? {} : { body: encodedBody }),
        signal: requestSignal,
        redirect: "error",
        credentials: "omit",
      });
      requireOk(response);
      const value = await readJson(response);
      if (!record(value) || value.ok === false)
        throw new ServiceError("INVALID_AGENT_RESPONSE");
      return value;
    });
  }
  function streamKey(connection: MobileAgentConnection, context: AgentContext) {
    return JSON.stringify([
      connection.id,
      base(connection).origin,
      connection.credentialRef,
      context.clientId,
      context.requestId,
    ]);
  }
  async function health(
    connection: MobileAgentConnection,
    signal?: AbortSignal,
  ): Promise<AgentHealth> {
    connection = Object.freeze({ ...connection });
    const value = await request(connection, "/health", signal);
    if (
      value.ok !== true ||
      value.protocolVersion !== 6 ||
      typeof value.codexBusy !== "boolean"
    )
      throw new ServiceError("AGENT_PROTOCOL_UNAVAILABLE");
    return {
      protocolVersion: 6,
      codexBusy: value.codexBusy,
      conversation: parseAgentConversation(value.conversation),
      mobileExecutionAvailable: false,
      reason: MOBILE_AGENT_UNAVAILABLE_REASON,
    };
  }
  return {
    health,
    async listModels(
      connection: MobileAgentConnection,
      signal?: AbortSignal,
    ): Promise<MobileAgentModel[]> {
      const value = await request(connection, "/agent/codex/models", signal);
      if (!Array.isArray(value.data) || value.data.length > 5000)
        throw new ServiceError("INVALID_AGENT_MODELS");
      return value.data.map((model: unknown) => {
        if (
          !record(model) ||
          !nonempty(model.id) ||
          !nonempty(model.model) ||
          !nonempty(model.displayName)
        )
          throw new ServiceError("INVALID_AGENT_MODEL");
        return {
          id: model.id,
          model: model.model,
          displayName: model.displayName,
        };
      });
    },
    async listThreads(
      connection: MobileAgentConnection,
      signal?: AbortSignal,
    ): Promise<MobileAgentThread[]> {
      const value = await request(connection, "/agent/codex/threads", signal);
      if (!Array.isArray(value.data) || value.data.length > 100)
        throw new ServiceError("INVALID_AGENT_THREADS");
      return value.data.map((thread: unknown) => {
        if (
          !record(thread) ||
          !nonempty(thread.id) ||
          typeof thread.preview !== "string" ||
          thread.preview.length > 16_000 ||
          !nonempty(thread.status)
        )
          throw new ServiceError("INVALID_AGENT_THREAD");
        return {
          id: thread.id,
          preview: thread.preview,
          status: thread.status,
        };
      });
    },
    async submitTurn(
      input: AgentTurnInput,
      signal?: AbortSignal,
    ): Promise<AgentTurnReceipt> {
      const connection = { ...input.connection };
      const context = approved(connection, input.context);
      if (started.has(context.requestId))
        throw new AgentServiceError("SUBMISSION_ALREADY_STARTED", "unknown");
      if (
        !input.prompt.trim() ||
        input.prompt.length > 32_000 ||
        (input.model !== undefined && !nonempty(input.model))
      )
        throw new ServiceError("INVALID_AGENT_TURN");
      const prompt = input.prompt;
      const model = input.model;
      const receipt: AgentTurnReceipt = Object.freeze({
        context,
        connectionId: connection.id,
        baseUrl: base(connection).origin,
        submissionState: "submitted",
      });
      let sent = false;
      try {
        return await withHttp(
          options,
          signal,
          async (fetcher, requestSignal) => {
            const active = streams.get(streamKey(connection, context));
            if (
              !active ||
              active.threadId !== context.threadId ||
              active.conversationId !== context.conversationId ||
              active.expectedRevision !== context.expectedRevision
            )
              throw new ServiceError("AGENT_EVENT_CONNECTION_REQUIRED");
            const state = await health(connection, requestSignal);
            if (
              state.codexBusy ||
              !["ready", "warning"].includes(state.conversation.status) ||
              state.conversation.threadId !== context.threadId ||
              state.conversation.conversationId !== context.conversationId ||
              state.conversation.revision !== context.expectedRevision
            )
              throw new ServiceError("AGENT_CONTEXT_STALE");
            const auth = await token(connection, requestSignal);
            approved(connection, context);
            if (started.has(context.requestId))
              throw new AgentServiceError(
                "SUBMISSION_ALREADY_STARTED",
                "unknown",
              );
            if (started.size >= 1000)
              throw new ServiceError("SUBMISSION_HISTORY_LIMIT");
            started.add(context.requestId);
            sent = true;
            const response = await fetcher(
              new URL("/agent/codex/turn", base(connection)),
              {
                method: "POST",
                headers: {
                  ...auth,
                  "content-type": "application/json",
                  "idempotency-key": context.requestId,
                },
                body: JSON.stringify({
                  prompt,
                  messageText: prompt,
                  messageId: context.requestId,
                  clientId: context.clientId,
                  threadId: context.threadId,
                  conversationId: context.conversationId,
                  expectedRevision: context.expectedRevision,
                  permissionMode: "request",
                  ...(model ? { model } : {}),
                }),
                signal: requestSignal,
                redirect: "error",
                credentials: "omit",
              },
            );
            requireSubmissionOk(response);
            const value = await readJson(response, 32 * 1024);
            if (
              !record(value) ||
              value.ok !== true ||
              value.threadId !== context.threadId
            )
              throw new ServiceError("INVALID_AGENT_ACCEPTANCE");
            return receipt;
          },
        );
      } catch (error) {
        const failure = new AgentServiceError(
          error instanceof ServiceError
            ? error.code
            : "AGENT_SUBMISSION_UNKNOWN",
          sent &&
            !(error instanceof ServiceError && error.rejectedBeforeAcceptance)
            ? "unknown"
            : error instanceof ServiceError
              ? error.submissionState
              : "intent",
          error instanceof ServiceError ? error.status : undefined,
        );
        if (sent)
          failure.agentReceipt = { ...receipt, submissionState: "unknown" };
        throw failure;
      }
    },
    async events(
      connection: MobileAgentConnection,
      input: AgentContext,
      onEvent: (event: MobileAgentEvent) => void,
      signal?: AbortSignal,
    ): Promise<AgentTurnReceipt> {
      connection = { ...connection };
      const context = approved(connection, input);
      const url = new URL("/events", base(connection));
      url.searchParams.set("clientId", context.clientId);
      const key = streamKey(connection, context);
      let known = context;
      const slot = `${connection.id}:${url.origin}:${context.clientId}`;
      if (eventSlots.has(slot))
        throw new ServiceError("AGENT_EVENT_CONNECTION_ALREADY_OPEN");
      eventSlots.add(slot);
      try {
        return await withHttp(
          options,
          signal,
          async (fetcher, requestSignal) => {
            const auth = await token(connection, requestSignal);
            const response = await fetcher(url, {
              headers: { ...auth, accept: "text/event-stream" },
              signal: requestSignal,
              redirect: "error",
              credentials: "omit",
            });
            requireOk(response);
            const terminal = await readAgentStream(
              response,
              context,
              onEvent,
              requestSignal,
              (captured, preview) => {
                known = captured;
                streams.set(key, captured);
                if (preview) approvals.set(preview.requestId, preview);
              },
              () => started.has(context.requestId),
            );
            return {
              context: terminal.context,
              connectionId: connection.id,
              baseUrl: base(connection).origin,
              submissionState: "terminal",
              turnId: terminal.context.turnId,
              status: terminal.status,
            };
          },
        );
      } catch (error) {
        const failure = new AgentServiceError(
          error instanceof ServiceError ? error.code : "AGENT_STREAM_UNKNOWN",
          "unknown",
          error instanceof ServiceError ? error.status : undefined,
        );
        failure.agentReceipt = {
          context: known,
          connectionId: connection.id,
          baseUrl: url.origin,
          submissionState: "unknown",
          turnId: known.turnId,
        };
        throw failure;
      } finally {
        eventSlots.delete(slot);
        streams.delete(key);
        for (const [id, preview] of approvals)
          if (preview.context.requestId === context.requestId)
            approvals.delete(id);
      }
    },
    async resolveApproval(
      input: AgentApprovalInput,
      signal?: AbortSignal,
    ): Promise<{ resolved: true }> {
      const connection = Object.freeze({ ...input.connection });
      const context = approved(connection, input.preview.context);
      const known = approvals.get(input.preview.requestId);
      const decision = input.decision;
      if (
        input.userConfirmed !== true ||
        !["accept", "decline"].includes(decision) ||
        !known ||
        JSON.stringify(known) !== JSON.stringify(input.preview) ||
        !streams.has(streamKey(connection, context))
      )
        throw new ServiceError("AGENT_APPROVAL_UNKNOWN_OR_CHANGED");
      const revalidate = () => {
        approved(connection, context);
        const active = streams.get(streamKey(connection, context));
        if (
          approvals.get(known.requestId) !== known ||
          !active ||
          active.threadId !== context.threadId ||
          active.conversationId !== context.conversationId ||
          active.turnId !== context.turnId ||
          active.expectedRevision !== context.expectedRevision
        )
          throw new ServiceError("AGENT_APPROVAL_UNKNOWN_OR_CHANGED");
      };
      const current = await health(connection, signal);
      if (
        current.conversation.threadId !== context.threadId ||
        current.conversation.conversationId !== context.conversationId ||
        current.conversation.revision < context.expectedRevision
      )
        throw new ServiceError("AGENT_APPROVAL_CONTEXT_STALE");
      const value = await request(
        connection,
        "/agent/codex/approval",
        signal,
        { requestId: known.requestId, decision },
        () => {
          revalidate();
          // Reserve once at the actual dispatch boundary; an ambiguous POST cannot be replayed.
          approvals.delete(known.requestId);
        },
      );
      if (value.ok !== true)
        throw new ServiceError("AGENT_APPROVAL_NOT_RESOLVED");
      approvals.delete(known.requestId);
      return { resolved: true };
    },
    async requestCancel(
      connection: MobileAgentConnection,
      receipt: AgentTurnReceipt,
      _signal?: AbortSignal,
    ): Promise<{
      cancelRequested: true;
      providerCancellationConfirmed: false;
    }> {
      approved(connection, receipt.context);
      // Existing bridge interrupt is thread-scoped and can target skillDraft/global work.
      throw new AgentServiceError(
        "AGENT_SAFE_TURN_CANCEL_UNAVAILABLE",
        receipt.submissionState === "terminal" ? "terminal" : "unknown",
      );
    },
  };
}
