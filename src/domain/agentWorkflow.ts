import { z } from "zod";

export const agentRoleSchema = z.enum([
  "planner",
  "prompt_compiler",
  "reference_analyst",
  "generation_worker",
  "asset_tagger",
  "reviewer",
  "compositor_exporter",
]);
export type AgentRole = z.infer<typeof agentRoleSchema>;

export const agentEventTypeSchema = z.enum([
  "TaskPlanned",
  "PromptCompiled",
  "ReferenceAnalyzed",
  "ApprovalRequired",
  "ProviderSelected",
  "GenerationSubmitted",
  "GenerationProgressed",
  "AssetCreated",
  "ReviewRequested",
  "HumanApproved",
  "ExportCompleted",
  "TaskFailed",
]);
export type AgentEventType = z.infer<typeof agentEventTypeSchema>;

export interface AgentEvent {
  id: string;
  taskId: string;
  role: AgentRole;
  type: AgentEventType;
  createdAt: string;
  /** Redacted, bounded details. Secrets and full provider responses are forbidden. */
  details: Record<string, string | number | boolean | null>;
}

export const approvalGateSchema = z.enum([
  "high_cost_batch",
  "remote_transfer",
  "overwrite_original",
  "external_share",
  "account_or_billing_change",
]);
export type ApprovalGate = z.infer<typeof approvalGateSchema>;

export function requiredApprovalGates(input: {
  privacyMode: "local_only" | "byok_local" | "platform_backed";
  requestedOutputs: number;
  providerBaseUrl?: string;
  overwriteOriginal?: boolean;
  externalShare?: boolean;
}): ApprovalGate[] {
  const gates: ApprovalGate[] = [];
  let localEndpoint = false;
  try {
    const host = new URL(input.providerBaseUrl ?? "").hostname;
    localEndpoint =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    /* An unknown remote boundary requires approval. */
  }
  if (
    input.privacyMode === "platform_backed" ||
    (input.privacyMode === "byok_local" && !localEndpoint)
  )
    gates.push("remote_transfer");
  if (input.requestedOutputs >= 16) gates.push("high_cost_batch");
  if (input.overwriteOriginal) gates.push("overwrite_original");
  if (input.externalShare) gates.push("external_share");
  return gates;
}
