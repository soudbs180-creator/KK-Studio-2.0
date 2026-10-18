import { nonempty, record, ServiceError } from "./httpClient.ts";
import { MAX_MOBILE_TEXT_RESULT_CHARS } from "../core/resultLimits.ts";
import type {
  AgentContext,
  AgentConversation,
  MobileAgentEvent,
  ToolApprovalPreview,
  LocalRoleDefinition,
  LocalSkillInstruction,
} from "./agentTypes.ts";
export function parseAgentConversation(value: unknown): AgentConversation {
  if (
    !record(value) ||
    !nonempty(value.threadId) ||
    !nonempty(value.conversationId) ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !["idle", "preparing", "ready", "warning", "running", "failed"].includes(
      String(value.status),
    )
  )
    throw new ServiceError("INVALID_AGENT_CONVERSATION");
  return {
    threadId: value.threadId,
    conversationId: value.conversationId,
    revision: Number(value.revision),
    status: value.status as AgentConversation["status"],
  };
}
export function captureAgentContext(value: AgentContext): AgentContext {
  for (const field of [
    "requestId",
    "accountId",
    "deviceId",
    "projectId",
    "clientId",
    "threadId",
    "conversationId",
  ] as const)
    if (!/^[A-Za-z0-9_.:-]{1,180}$/.test(value[field]))
      throw new ServiceError("INVALID_AGENT_CONTEXT");
  if (
    !Number.isSafeInteger(value.expectedRevision) ||
    value.expectedRevision < 1 ||
    (value.turnId !== undefined &&
      !/^[A-Za-z0-9_.:-]{1,180}$/.test(value.turnId))
  )
    throw new ServiceError("INVALID_AGENT_CONTEXT");
  return Object.freeze({
    requestId: value.requestId,
    accountId: value.accountId,
    deviceId: value.deviceId,
    projectId: value.projectId,
    clientId: value.clientId,
    threadId: value.threadId,
    conversationId: value.conversationId,
    expectedRevision: value.expectedRevision,
    ...(value.turnId ? { turnId: value.turnId } : {}),
  });
}
export function buildLocalInstruction(
  role?: LocalRoleDefinition,
  skills: LocalSkillInstruction[] = [],
): string {
  const instructions: string[] = [];
  if (role) {
    if (
      role.kind !== "role" ||
      !nonempty(role.id) ||
      !nonempty(role.name) ||
      !role.instruction.trim() ||
      role.instruction.length > 16_000
    )
      throw new ServiceError("INVALID_LOCAL_ROLE");
    instructions.push(role.instruction);
  }
  if (skills.length > 20)
    throw new ServiceError("TOO_MANY_LOCAL_SKILL_INSTRUCTIONS");
  for (const skill of skills) {
    if (
      skill.kind !== "skill-instruction" ||
      !nonempty(skill.id) ||
      !nonempty(skill.name) ||
      typeof skill.enabled !== "boolean" ||
      !skill.instruction.trim() ||
      skill.instruction.length > 16_000
    )
      throw new ServiceError("INVALID_LOCAL_SKILL_INSTRUCTION");
    if (skill.enabled) instructions.push(skill.instruction);
  }
  const text = instructions.join("\n\n");
  if (text.length > 32_000)
    throw new ServiceError("LOCAL_INSTRUCTIONS_TOO_LARGE");
  return text;
}
function safeDetails(value: unknown, depth = 0): unknown {
  if (depth > 8) throw new ServiceError("AGENT_APPROVAL_TOO_DEEP");
  if (typeof value === "string") {
    if (
      value.length > 16_000 ||
      /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password)\s*[:=]|Bearer\s+[A-Za-z0-9]/i.test(
        value,
      )
    )
      throw new ServiceError("AGENT_APPROVAL_SECRET_OR_OVERSIZED");
    return value;
  }
  if (
    typeof value === "boolean" ||
    value === null ||
    (typeof value === "number" && Number.isFinite(value))
  )
    return value;
  if (Array.isArray(value) && value.length <= 100)
    return Object.freeze(value.map((item) => safeDetails(item, depth + 1)));
  if (record(value) && Object.keys(value).length <= 100) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (
        ["__proto__", "constructor", "prototype"].includes(key) ||
        /^(?:api[_-]?key|token|authorization|password|secret|credential)$/i.test(
          key,
        )
      )
        throw new ServiceError("AGENT_APPROVAL_SECRET_FORBIDDEN");
      output[key] = safeDetails(item, depth + 1);
    }
    return Object.freeze(output);
  }
  throw new ServiceError("INVALID_AGENT_APPROVAL_DETAILS");
}
export function buildToolApprovalPreview(
  context: AgentContext,
  value: unknown,
): ToolApprovalPreview {
  if (
    !record(value) ||
    !nonempty(value.requestId) ||
    value.threadId !== context.threadId ||
    !context.turnId ||
    value.turnId !== context.turnId ||
    ![
      "item/commandExecution/requestApproval",
      "item/fileChange/requestApproval",
      "item/permissions/requestApproval",
    ].includes(String(value.method))
  )
    throw new ServiceError("INVALID_AGENT_APPROVAL_SCOPE");
  const details: Record<string, unknown> = {};
  for (const key of [
    "command",
    "reason",
    "cwd",
    "permissions",
    "changes",
    "itemId",
  ])
    if (value[key] !== undefined) details[key] = safeDetails(value[key]);
  if (JSON.stringify(details).length > 64 * 1024)
    throw new ServiceError("AGENT_APPROVAL_TOO_LARGE");
  return Object.freeze({
    context,
    requestId: value.requestId,
    method: value.method as ToolApprovalPreview["method"],
    ...(typeof details.command === "string"
      ? { command: details.command }
      : {}),
    ...(typeof details.reason === "string" ? { reason: details.reason } : {}),
    ...(typeof details.cwd === "string" ? { cwd: details.cwd } : {}),
    details: Object.freeze(details),
  });
}
export async function readAgentStream(
  response: Response,
  context: AgentContext,
  onEvent: (event: MobileAgentEvent) => void,
  signal: AbortSignal,
  observe: (context: AgentContext, preview?: ToolApprovalPreview) => void,
  isSubmitted: () => boolean,
): Promise<{
  context: AgentContext;
  status: "succeeded" | "failed" | "cancelled";
}> {
  if (
    response.headers.get("content-type")?.split(";")[0].trim() !==
      "text/event-stream" ||
    !response.body?.getReader
  )
    throw new ServiceError("AGENT_STREAM_UNAVAILABLE");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let size = 0;
  const initial = captureAgentContext(context);
  let captured = initial;
  let hello = false;
  const assistantItems = new Map<
    string,
    { text: string; completed: boolean }
  >();
  let textSize = 0;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    for (;;) {
      if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
      const chunk = await reader.read();
      if (chunk.done) throw new ServiceError("AGENT_EVENT_STREAM_INTERRUPTED");
      size += chunk.value.length;
      if (size > 2 * 1024 * 1024)
        throw new ServiceError("AGENT_STREAM_TOO_LARGE");
      buffer += decoder.decode(chunk.value, { stream: true });
      let match: RegExpExecArray | null;
      while ((match = /\r\n\r\n|\n\n|\r\r/.exec(buffer))) {
        if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
        const event = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        if (event.length > 128 * 1024)
          throw new ServiceError("AGENT_EVENT_TOO_LARGE");
        const lines = event.split(/\r\n|\n|\r/);
        const type = lines
          .find((line) => line.startsWith("event:"))
          ?.slice(6)
          .trim();
        const data = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (!data || type === "ping") continue;
        let value: unknown;
        try {
          value = JSON.parse(data) as unknown;
        } catch {
          throw new ServiceError("INVALID_AGENT_EVENT_JSON");
        }
        if (!record(value)) throw new ServiceError("INVALID_AGENT_EVENT");
        if (type === "hello") {
          const conversation = parseAgentConversation(value.conversation);
          if (
            hello ||
            value.protocolVersion !== 6 ||
            value.clientId !== captured.clientId ||
            conversation.threadId !== captured.threadId ||
            conversation.conversationId !== captured.conversationId ||
            conversation.revision < captured.expectedRevision
          )
            throw new ServiceError("AGENT_CONTEXT_CHANGED");
          hello = true;
          observe(captured);
          onEvent({ kind: "hello", context: captured, conversation });
          continue;
        }
        if (!hello) throw new ServiceError("AGENT_HELLO_REQUIRED");
        if (type === "conversation_changed") {
          const conversation = parseAgentConversation(value);
          if (
            conversation.threadId !== captured.threadId ||
            conversation.conversationId !== captured.conversationId ||
            conversation.revision < captured.expectedRevision
          )
            throw new ServiceError("AGENT_CONTEXT_CHANGED");
          onEvent({ kind: "conversation", context: captured, conversation });
          continue;
        }
        if (
          (value.sourceClientId !== undefined &&
            value.sourceClientId !== captured.clientId) ||
          (value.threadId !== undefined &&
            value.threadId !== captured.threadId) ||
          (value.thread_id !== undefined &&
            value.thread_id !== captured.threadId)
        )
          continue;
        if (!initial.turnId && !isSubmitted()) continue;
        // Retained hello/replay frames can arrive after a separate new POST. Submission
        // timing cannot bind their old turn to this request; only a live frame may do so.
        if (!captured.turnId && value.replayed === true) continue;
        const turnId = value.turnId ?? value.turn_id;
        if (
          nonempty(value.turnId) &&
          nonempty(value.turn_id) &&
          value.turnId !== value.turn_id
        )
          throw new ServiceError("AGENT_CONTEXT_CHANGED");
        if (nonempty(turnId)) {
          if (captured.turnId && captured.turnId !== turnId) continue;
          captured = captureAgentContext({ ...captured, turnId });
          observe(captured);
        }
        if (type === "codex_approval") {
          const preview = buildToolApprovalPreview(captured, value);
          observe(captured, preview);
          onEvent({ kind: "approval", preview });
        } else if (type === "chat_message") {
          const message = value.message;
          if (
            !record(message) ||
            !nonempty(message.id) ||
            typeof message.text !== "string" ||
            message.text.length > MAX_MOBILE_TEXT_RESULT_CHARS ||
            !["user", "assistant", "tool", "error"].includes(
              String(message.role),
            ) ||
            (message.threadId !== undefined &&
              message.threadId !== captured.threadId) ||
            (message.turnId && message.turnId !== captured.turnId)
          )
            throw new ServiceError("INVALID_AGENT_MESSAGE");
          onEvent({
            kind: "message",
            context: captured,
            text: message.text,
            role: message.role as "user" | "assistant" | "tool" | "error",
            messageId: message.id,
          });
        } else if (
          type === "agent_event" &&
          ["item.started", "item.updated", "item.completed"].includes(
            String(value.type),
          ) &&
          record(value.item) &&
          value.item.type === "agent_message"
        ) {
          const item = value.item;
          if (
            !nonempty(item.id) ||
            item.id.length > 180 ||
            !nonempty(turnId) ||
            !captured.turnId ||
            (value.threadId ?? value.thread_id) !== captured.threadId ||
            (item.text !== undefined && typeof item.text !== "string") ||
            (item.delta !== undefined && typeof item.delta !== "string")
          )
            throw new ServiceError("INVALID_AGENT_ASSISTANT_ITEM");
          const previous = assistantItems.get(item.id);
          if (
            value.replayed === true &&
            typeof item.delta === "string" &&
            item.text === undefined
          )
            throw new ServiceError("INVALID_AGENT_REPLAY_SNAPSHOT");
          if (!previous && assistantItems.size >= 128)
            throw new ServiceError("AGENT_ASSISTANT_TOO_MANY_ITEMS");
          // Replay carries full text snapshots; real-time updates can carry delta-only text.
          const text =
            typeof item.text === "string"
              ? item.text
              : (previous?.text ?? "") +
                (typeof item.delta === "string" ? item.delta : "");
          if (previous?.completed) {
            if (value.replayed === true || text === previous.text) continue;
            throw new ServiceError(
              "AGENT_ASSISTANT_ITEM_CHANGED_AFTER_COMPLETION",
            );
          }
          if (
            value.replayed === true &&
            previous &&
            previous.text.startsWith(text) &&
            text !== previous.text
          )
            continue;
          textSize += text.length - (previous?.text.length ?? 0);
          if (
            text.length > MAX_MOBILE_TEXT_RESULT_CHARS ||
            textSize > MAX_MOBILE_TEXT_RESULT_CHARS
          )
            throw new ServiceError("AGENT_ASSISTANT_OUTPUT_TOO_LARGE");
          assistantItems.set(item.id, {
            text,
            completed: value.type === "item.completed",
          });
          if (text && text !== previous?.text)
            onEvent({
              kind: "message",
              context: captured,
              text,
              role: "assistant",
              messageId: item.id,
            });
        } else if (
          type === "agent_event" &&
          value.type === "turn.started" &&
          captured.turnId
        )
          onEvent({ kind: "turn", context: captured, turnId: captured.turnId });
        else if (type === "agent_event" && value.type === "turn.completed") {
          if (
            !captured.turnId ||
            !nonempty(turnId) ||
            !["completed", "failed", "interrupted"].includes(
              String(value.status),
            )
          )
            throw new ServiceError("AGENT_TERMINAL_STATUS_MISSING");
          const status =
            value.status === "completed"
              ? "succeeded"
              : value.status === "interrupted"
                ? "cancelled"
                : "failed";
          if (
            status === "succeeded" &&
            (!assistantItems.size ||
              [...assistantItems.values()].some((item) => !item.completed) ||
              ![...assistantItems.values()].some((item) => item.text.trim()))
          )
            throw new ServiceError("AGENT_ASSISTANT_OUTPUT_INCOMPLETE");
          onEvent({ kind: "terminal", context: captured, status });
          if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
          return { context: captured, status };
        }
      }
      if (buffer.length > 128 * 1024)
        throw new ServiceError("AGENT_EVENT_TOO_LARGE");
    }
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
