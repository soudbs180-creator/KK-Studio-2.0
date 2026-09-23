/**
 * 本地 Agent（canvas-agent）协议类型。
 *
 * 协议来源：vendor/canvas-agent（MIT，basketikun/infinite-canvas）。
 * 客户端侧对照上游 web/src/services/api/canvas-agent.ts、
 * web/src/lib/canvas/canvas-agent-ops.ts 与 web/src/stores/use-agent-store.ts 移植。
 */

/** 画布节点数据（Agent 视角的快照节点）。 */
export interface CanvasNodeData {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  metadata: Record<string, unknown>;
}

export interface CanvasConnectionData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface CanvasViewportData {
  x: number;
  y: number;
  scale: number;
}

export type CanvasAgentOp =
  | {
      type: "add_node";
      id?: string;
      nodeType?: string;
      title?: string;
      position?: { x: number; y: number };
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "update_node";
      id: string;
      patch?: Partial<CanvasNodeData>;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "delete_node";
      id?: string;
      ids?: string[];
      nodeType?: string;
    }
  | {
      type: "delete_connections";
      id?: string;
      ids?: string[];
      all?: boolean;
    }
  | { type: "connect_nodes"; id?: string; fromNodeId: string; toNodeId: string }
  | {
      type: "set_viewport";
      viewport: CanvasViewportData | { x: number; y: number; k: number };
    }
  | { type: "select_nodes"; ids: string[] }
  | {
      type: "run_generation";
      nodeId: string;
      mode?: "text" | "image" | "video" | "audio";
      prompt?: string;
    };

export interface CanvasAgentSnapshot {
  projectId: string;
  title: string;
  nodes: CanvasNodeData[];
  connections: CanvasConnectionData[];
  selectedNodeIds: string[];
  viewport: CanvasViewportData;
}

export type AgentPermissionMode = "request" | "automatic" | "full";

export type AgentReasoningEffort =
  "minimal" | "low" | "medium" | "high" | "xhigh" | "max" | "ultra";

export type AgentApprovalDecision = "accept" | "acceptForSession" | "decline";

export interface AgentApprovalRequest {
  requestId: string;
  method: string;
  threadId?: string;
  turnId?: string;
  itemId?: string;
  reason?: string;
  command?: unknown;
  cwd?: string;
  permissions?: unknown;
}

export type AgentChatRole = "user" | "assistant" | "system" | "tool" | "error";

export interface AgentCanvasReference {
  nodeId: string;
  label: string;
  title: string;
  kind: "image" | "video" | "audio" | "text";
  text?: string;
}

export interface AgentChatItem {
  id: string;
  itemId?: string;
  clientMessageId?: string;
  threadId?: string;
  turnId?: string;
  role: AgentChatRole;
  title?: string;
  text: string;
  detail?: unknown;
  canvasReferences?: AgentCanvasReference[];
  /** 工具/推理活动：key 为活动 id，value 为展示文本。 */
  activityItems?: Record<string, string>;
}

export interface AgentConversationState {
  revision: number;
  conversationId: string;
  threadId: string;
  status: "idle" | "preparing" | "ready" | "warning" | "running" | "failed";
  mcpStatuses: Record<
    string,
    {
      status: "starting" | "ready" | "failed" | "cancelled";
      error?: string | null;
      failureReason?: string | null;
    }
  >;
  sourceClientId?: string;
  error?: string;
}

export interface AgentTurnResponse {
  ok?: boolean;
  threadId?: string;
  conversationId?: string;
  revision?: number;
  error?: string;
  msg?: string;
  code?: string;
  state?: AgentConversationState;
}

export interface AgentConfigResponse {
  ok?: boolean;
  protocolVersion?: number;
  url?: string;
  token?: string;
  hasToken?: boolean;
}

export interface AgentModel {
  id: string;
  model: string;
  displayName: string;
  isDefault?: boolean;
  supportedReasoningEfforts?: Array<{ reasoningEffort: AgentReasoningEffort }>;
}

export interface AgentThreadResponse {
  ok: boolean;
  conversation?: AgentConversationState;
  workspace?: { activeThreadId?: string };
  messages?: AgentChatItem[];
  settledTurnIds?: string[];
}

export interface AgentToolCallInput {
  ops?: CanvasAgentOp[];
  path?: string;
  [key: string]: unknown;
}

export interface AgentTurnInput {
  prompt: string;
  messageText: string;
  messageId: string;
  clientId: string;
  threadId?: string;
  conversationId?: string;
  expectedRevision?: number;
  permissionMode: AgentPermissionMode;
  model?: string;
  effort?: AgentReasoningEffort | "";
  skill?: { name: string; path: string };
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    width: number;
    height: number;
    dataUrl: string;
  }>;
  messageMetadata?: Record<string, unknown>;
}

/** Agent 事件（SSE /events 的规范化形态，用于驱动 UI）。 */
export type AgentEvent =
  | {
      kind: "hello";
      conversation?: AgentConversationState;
      activeThreadId?: string;
      busy: boolean;
      pendingApprovals: AgentApprovalRequest[];
    }
  | { kind: "terminal"; status: string; error?: string }
  | {
      kind: "conversation";
      conversation: AgentConversationState;
    }
  | { kind: "message"; item: AgentChatItem }
  | {
      kind: "activity";
      turnId?: string;
      itemType: string;
      phase: "started" | "updated" | "completed";
      item: { id: string; text?: string; delta?: string; command?: string };
    }
  | { kind: "approval"; approval: AgentApprovalRequest }
  | { kind: "approval_resolved"; requestId: string; decision: string }
  | {
      kind: "tool_call";
      requestId: string;
      name: string;
      input: Record<string, unknown>;
    }
  | { kind: "bootstrap"; type: string; threadId?: string; error?: string }
  | { kind: "workspace"; activeThreadId?: string }
  | { kind: "codex"; busy: boolean };

export const AGENT_PROTOCOL_VERSION = 6;
export const AGENT_DEFAULT_URL = "http://127.0.0.1:17371";
export const AGENT_CONNECT_TIMEOUT_MS = 60000;
