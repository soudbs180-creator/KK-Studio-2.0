import { z } from "zod";
import type { ProviderConnection } from "../../domain/providerConnections.ts";

export const inputSchema = z
  .object({
    connectionId: z.string().min(1).max(120),
    idempotencyKey: z.string().min(1).max(180),
    model: z.string().min(1).max(120),
    prompt: z.string().trim().min(1).max(4000),
    requestedOutputs: z.number().int().min(1).max(100),
    privacyMode: z.enum(["local_only", "byok_local", "platform_backed"]),
    attachments: z
      .array(
        z
          .object({
            id: z.string().max(160),
            name: z.string().max(240),
            mime: z.string().max(100),
            size: z.number().int().min(0).max(10485760),
            dataUrl: z.string().max(14000000).optional(),
          })
          .strict(),
      )
      .max(10)
      .default([]),
    workflow: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type JobInput = z.infer<typeof inputSchema>;
export type OutputStatus =
  | "queued"
  | "submitting"
  | "waiting_provider"
  | "downloading"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dead_letter"
  | "quarantined"
  | "manual_review";
export interface GenerationJob {
  id: string;
  owner_id: string;
  connection_id: string;
  input_json: string;
  status: string;
  cancel_requested: number;
  created_at: number;
  updated_at: number;
}
export type JobRow = GenerationJob;
export interface JobAttempt {
  id: string;
  job_id: string;
  output_index: number;
  generation: number;
  number: number;
  idempotency_key: string;
  status: string;
  provider_job_id: string | null;
  error_class: string | null;
  started_at: number;
  finished_at: number | null;
}
export interface CreditReservation {
  id: string;
  job_id: string;
  owner_id: string;
  connection_id: string;
  units: number;
  status: "held" | "settled" | "released" | "manual_review";
  created_at: number;
}
export interface CreditSettlement {
  reservation_id: string;
  actual_units: number | null;
  refunded_units: number | null;
  status: "settled" | "refunded" | "manual_review";
  created_at: number;
}
export interface ProviderRequestLog {
  id: string;
  job_id: string;
  output_index: number;
  attempt_id: string | null;
  connection_id: string;
  operation: string;
  status: string;
  http_status: number | null;
  failure_class: string | null;
  latency_ms: number;
  created_at: number;
}
export interface OutputRow {
  job_id: string;
  output_index: number;
  generation: number;
  attempt: number;
  poll_failures: number;
  status: OutputStatus;
  provider_job_id: string | null;
  reservation_id: string;
  lease_token: number;
  lease_owner: string | null;
  lease_until: number | null;
  next_run: number;
  asset_id: string | null;
  error_class: string | null;
  webhook_sequence: number;
}
export interface ConnectionRow {
  id: string;
  owner_id: string | null;
  metadata_json: string;
  state: string;
  cooldown_until: number;
  unit_price: number;
  cost_limit: number;
  spent: number;
  credential_ref: string | null;
  revision: number;
}
export interface Claim {
  job: JobRow;
  output: OutputRow;
  connection: ProviderConnection;
  credentialRef?: string;
  token: number;
  input: JobInput;
  operation: "submit" | "poll";
}
export interface ArchivedAsset {
  assetId: string;
  sha256: string;
  mime: string;
  size: number;
}
export interface PublicJob {
  id: string;
  status: string;
  requestedOutputs: number;
  completedOutputs: number;
  outputs: Array<{
    index: number;
    status: OutputStatus;
    assetId?: string;
    assetRoute?: string;
    errorClass?: string;
  }>;
}
export class PlatformError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export const terminal = new Set<OutputStatus>([
  "succeeded",
  "failed",
  "cancelled",
  "dead_letter",
  "quarantined",
  "manual_review",
]);
export function rejectSecrets(value: unknown): void {
  const walk = (item: unknown, depth: number): void => {
    if (depth > 16) throw new PlatformError("INPUT_TOO_DEEP");
    if (Array.isArray(item)) {
      for (const entry of item) walk(entry, depth + 1);
      return;
    }
    if (
      typeof item === "string" &&
      /(?:Bearer\s+\S+|sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|https?:\/\/[^\s/@]+:[^\s/@]+@|https?:\/\/[^\s]*[?&](?:key|api_key|access_token|token|secret)=)/i.test(
        item,
      )
    )
      throw new PlatformError("SECRET_IN_INPUT");
    if (!item || typeof item !== "object") return;
    for (const [key, entry] of Object.entries(item)) {
      if (
        /api[_-]?key|refresh[_-]?token|access[_-]?token|authorization|password|secret|proxy.*credential|^credentials?$/i.test(
          key,
        )
      )
        throw new PlatformError("SECRET_IN_INPUT");
      walk(entry, depth + 1);
    }
  };
  walk(value, 0);
}
