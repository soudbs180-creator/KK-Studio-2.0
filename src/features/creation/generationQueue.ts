import {
  canEnterManagedPool,
  canScheduleConnection,
  isConnectionReady,
  type ConnectionState,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";

export type QueueStatus =
  | "queued"
  | "running"
  | "partial"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "offline"
  | "interrupted";

export interface GenerationQueueItem {
  id: string;
  batchId?: string;
  requestedOutputs: number;
  completedOutputs: number;
  status: QueueStatus;
  idempotencyKey: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface QueueConnectionHealth {
  state: ConnectionState;
  activeJobs: number;
  concurrencyLimit: number;
  cooldownUntil?: number;
}

export function canStartQueueItem(
  item: GenerationQueueItem,
  health: QueueConnectionHealth,
  now = Date.now(),
): boolean {
  return (
    item.status === "queued" &&
    isConnectionReady(health, now) &&
    health.activeJobs < health.concurrencyLimit
  );
}

/** Selects the least-loaded authorized connection without bypassing quotas. */
export function selectConnection(
  connections: readonly ProviderConnection[],
  kind: "image" | "video" | "audio" | "text",
  operation: "generate" | "edit" | "inpaint" | "outpaint" = "generate",
  now = Date.now(),
): ProviderConnection | null {
  const candidates = connections.filter(
    (connection) =>
      canEnterManagedPool(connection) &&
      canScheduleConnection(connection, kind, operation, now) &&
      (connection.activeJobs ?? 0) < connection.concurrencyLimit,
  );
  return (
    [...candidates].sort(
      (left, right) =>
        (left.activeJobs ?? 0) / left.concurrencyLimit -
        (right.activeJobs ?? 0) / right.concurrencyLimit,
    )[0] ?? null
  );
}

export function retryDelayMs(
  attempt: number,
  retryAfterSeconds?: number,
  maxDelayMs = 60_000,
): number {
  if (retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds))
    return Math.min(maxDelayMs, Math.max(0, retryAfterSeconds * 1000));
  const safeAttempt = Math.max(1, Math.min(8, Math.floor(attempt)));
  return Math.min(maxDelayMs, 500 * 2 ** (safeAttempt - 1));
}

export function nextBatchStatus(
  requestedOutputs: number,
  completedOutputs: number,
  failed: boolean,
): QueueStatus {
  if (completedOutputs >= requestedOutputs && requestedOutputs > 0)
    return "succeeded";
  if (completedOutputs > 0 && failed) return "partial";
  if (failed) return "failed";
  return "running";
}

/** Small bounded worker pool used by the local and BYOK image paths. */
export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(
    1,
    Math.min(values.length || 1, Math.floor(concurrency)),
  );
  const result = new Array<R>(values.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      result[index] = await worker(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => run()));
  return result;
}
