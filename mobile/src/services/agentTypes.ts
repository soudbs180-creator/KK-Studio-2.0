import type { CreationSubmissionState } from "@kk-studio/creation-contracts";
import type { HttpOptions } from "./httpClient.ts";
import type { CredentialReader } from "./providerTypes.ts";
export interface MobileAgentConnection {
  id: string;
  baseUrl: string;
  credentialRef: string;
  protocol: "kk-desktop-agent-v6";
}
export interface AgentContext {
  requestId: string;
  accountId: string;
  deviceId: string;
  projectId: string;
  clientId: string;
  threadId: string;
  conversationId: string;
  expectedRevision: number;
  turnId?: string;
}
export interface LocalAgentTestApproval {
  kind: "explicit-user-approved-local-test";
  accountId: string;
  deviceId: string;
  projectId: string;
  clientId: string;
  expiresAt: number;
}
export interface MobileAgentOptions extends HttpOptions {
  credentials: CredentialReader;
  development?: boolean;
  desktopDiagnostics?: boolean;
  localTestApproval?: LocalAgentTestApproval;
}
export interface AgentConversation {
  conversationId: string;
  threadId: string;
  revision: number;
  status: "idle" | "preparing" | "ready" | "warning" | "running" | "failed";
}
export interface AgentHealth {
  protocolVersion: 6;
  codexBusy: boolean;
  conversation: AgentConversation;
  mobileExecutionAvailable: false;
  reason: string;
}
export interface MobileAgentModel {
  id: string;
  model: string;
  displayName: string;
}
export interface MobileAgentThread {
  id: string;
  preview: string;
  status: string;
}
export interface AgentTurnInput {
  connection: MobileAgentConnection;
  context: AgentContext;
  prompt: string;
  model?: string;
}
export interface AgentTurnReceipt {
  context: AgentContext;
  connectionId: string;
  baseUrl: string;
  submissionState: CreationSubmissionState;
  turnId?: string;
  status?: "succeeded" | "failed" | "cancelled";
}
export interface ToolApprovalPreview {
  context: AgentContext;
  requestId: string;
  method:
    | "item/commandExecution/requestApproval"
    | "item/fileChange/requestApproval"
    | "item/permissions/requestApproval";
  command?: string;
  reason?: string;
  cwd?: string;
  details: Record<string, unknown>;
}
export type MobileAgentEvent =
  | { kind: "hello"; context: AgentContext; conversation: AgentConversation }
  | {
      kind: "conversation";
      context: AgentContext;
      conversation: AgentConversation;
    }
  | {
      kind: "message";
      context: AgentContext;
      text: string;
      role: "assistant" | "user" | "tool" | "error";
      messageId: string;
    }
  | { kind: "turn"; context: AgentContext; turnId: string }
  | { kind: "approval"; preview: ToolApprovalPreview }
  | {
      kind: "terminal";
      context: AgentContext;
      status: "succeeded" | "failed" | "cancelled";
    };
export interface AgentApprovalInput {
  connection: MobileAgentConnection;
  preview: ToolApprovalPreview;
  decision: "accept" | "decline";
  userConfirmed: true;
}
export interface LocalRoleDefinition {
  kind: "role";
  id: string;
  name: string;
  instruction: string;
}
export interface LocalSkillInstruction {
  kind: "skill-instruction";
  id: string;
  name: string;
  instruction: string;
  enabled: boolean;
}
export interface MobileToolDescriptor {
  kind: "mcp-tool" | "local-tool";
  id: string;
  name: string;
  description: string;
  executionAvailable: boolean;
  unavailableReason?: string;
}
