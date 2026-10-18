/**
 * Event taxonomy and schemas for the SQLite EventBus & Shadow Mode synchronizer.
 */

export type CanvasEventType =
  | "canvas.node.created"
  | "canvas.node.moved"
  | "canvas.node.updated"
  | "canvas.node.deleted"
  | "canvas.edge.created"
  | "canvas.edge.deleted"
  | "canvas.connection.created"
  | "canvas.connection.deleted"
  | "canvas.node.locked"
  | "canvas.node.unlocked"
  | "canvas.node.override"
  | "agent.task.cancelled"
  | "canvas.viewport.changed"
  | (string & {});

export type EventActor = "designer" | "agent" | "system";

/**
 * Immutable Event record matching the SQLite EventBus events schema.
 */
export interface CanvasEventRecord {
  /** Monotonic sequential ID assigned by SQLite AUTOINCREMENT */
  seq?: number;
  /** Unique UUID for this event */
  eventId: string;
  /** Optional originating command ID */
  commandId?: string;
  /** Optional batch identifier for grouped transactions */
  batchId?: string;
  /** Event taxonomy type string */
  eventType: CanvasEventType;
  /** Target node ID, edge ID, or canvas entity */
  targetNodeId: string;
  /** Initiator actor ("designer", "agent", "system") */
  actor: EventActor;
  /** Node revision before this event */
  baseRev: number;
  /** Node revision after this event */
  newRev: number;
  /** Event payload */
  payload: Record<string, unknown>;
  /** Optional deduplication key */
  idempotencyKey?: string;
  /** Epoch milliseconds timestamp */
  createdAt: number;
}

/**
 * Input format for appending an event via shadow mode or IPC.
 */
export interface AppendEventInput {
  id?: string;
  eventId?: string;
  commandId?: string;
  batchId?: string;
  type?: string;
  eventType?: CanvasEventType;
  target?: string;
  targetNodeId?: string;
  actor?: EventActor;
  baseRev?: number;
  base_rev?: number;
  newRev?: number;
  new_rev?: number;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  idempotency_key?: string;
  createdAt?: number;
  timestamp?: number;
}

/**
 * SQLite WAL checkpoint mode.
 */
export type CheckpointMode = "passive" | "full" | "restart" | "truncate";

/**
 * Result returned from an event bus WAL checkpoint operation.
 */
export interface CheckpointResult {
  /** True if checkpoint was blocked by concurrent reader/writer locks */
  busy: boolean;
  /** Number of WAL frames remaining in log prior to checkpoint */
  log: number;
  /** Number of WAL frames transferred to the database */
  checkpointed: number;
}

/**
 * Options for pruning historical event logs to prevent storage bloat.
 */
export interface PruneOptions {
  /** Prune events strictly with seq < beforeSeq */
  beforeSeq?: number;
  /** Retain only the latest N events (older events are pruned) */
  retainLatest?: number;
  /** Prune events created before this epoch timestamp */
  beforeTimestamp?: number;
  /** Whether to execute PRAGMA wal_checkpoint(TRUNCATE) after pruning to shrink disk file */
  checkpointAfter?: boolean;
}

/**
 * Result returned from an event log pruning operation.
 */
export interface PruneResult {
  /** Count of events deleted */
  deletedCount: number;
  /** Monotonic sequence cutoff below which events were pruned */
  prunedBeforeSeq: number;
  /** Count of event records remaining in the database */
  remainingCount: number;
  /** Checkpoint result if checkpointAfter was performed */
  checkpoint?: CheckpointResult | null;
}
