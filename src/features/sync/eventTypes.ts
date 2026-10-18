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
