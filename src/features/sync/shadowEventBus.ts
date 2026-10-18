import { invoke, isTauri } from "@tauri-apps/api/core";
import type { AppendEventInput, CanvasEventRecord } from "./eventTypes.ts";

/**
 * Non-blocking, micro-batched ShadowEventBus client.
 * Captures canvas user interactions and agent operations in the background
 * without blocking UI thread execution (<2ms overhead).
 */
export class ShadowEventBus {
  private queue: CanvasEventRecord[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private nodeRevisions = new Map<string, number>();
  private subscribers = new Set<(event: CanvasEventRecord) => void>();

  /**
   * Get the last recorded revision for a node. Returns 0 if never recorded.
   */
  public getNodeRevision(nodeId: string): number {
    return this.nodeRevisions.get(nodeId) ?? 0;
  }

  /**
   * Explicitly set the tracked revision for a node.
   */
  public setNodeRevision(nodeId: string, rev: number): void {
    this.nodeRevisions.set(nodeId, rev);
  }

  /**
   * Increment and retrieve the new revision for a node.
   */
  public bumpNodeRevision(nodeId: string): { baseRev: number; newRev: number } {
    const baseRev = this.getNodeRevision(nodeId);
    const newRev = baseRev + 1;
    this.setNodeRevision(nodeId, newRev);
    return { baseRev, newRev };
  }

  /**
   * Subscribe to local event emissions (used by test harnesses and live monitors).
   */
  public subscribe(cb: (event: CanvasEventRecord) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  /**
   * Emit an event into the shadow buffer.
   * Assigns UUID and timestamp, updates revision cache, and schedules micro-batch flush.
   */
  public emit(input: AppendEventInput): CanvasEventRecord {
    const targetNodeId = input.targetNodeId ?? input.target ?? "canvas";
    const eventType = input.eventType ?? input.type ?? "canvas.node.updated";

    let baseRev = input.baseRev ?? input.base_rev;
    let newRev = input.newRev ?? input.new_rev;

    if (baseRev === undefined) {
      baseRev = this.getNodeRevision(targetNodeId);
    }
    if (newRev === undefined) {
      newRev = baseRev + 1;
      this.setNodeRevision(targetNodeId, newRev);
    } else {
      this.setNodeRevision(targetNodeId, newRev);
    }

    const eventId =
      input.eventId ??
      input.id ??
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

    const createdAt = input.createdAt ?? input.timestamp ?? Date.now();

    const record: CanvasEventRecord = {
      eventId,
      commandId: input.commandId,
      batchId: input.batchId,
      eventType: eventType as CanvasEventRecord["eventType"],
      targetNodeId,
      actor: input.actor ?? "designer",
      baseRev,
      newRev,
      payload: input.payload ?? {},
      idempotencyKey: input.idempotencyKey ?? input.idempotency_key,
      createdAt,
    };

    this.queue.push(record);

    for (const sub of this.subscribers) {
      try {
        sub(record);
      } catch (err) {
        console.error("[ShadowEventBus] subscriber error:", err);
      }
    }

    this.scheduleFlush();
    return record;
  }

  /**
   * Schedule a micro-batch flush within 16ms to avoid IPC chatter.
   */
  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 16);
  }

  /**
   * Flush pending queued events to Tauri backend SQLite EventBus.
   * Non-blocking: catches and ignores errors in browser or during app shutdown.
   */
  public async flush(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.queue.length) return;

    const batch = [...this.queue];
    this.queue = [];

    let isDesktop = false;
    try {
      isDesktop = isTauri();
    } catch {
      isDesktop = false;
    }

    if (!isDesktop) {
      return;
    }

    try {
      await invoke("event_bus_append", { events: batch });
    } catch (err) {
      console.warn("[ShadowEventBus] Append failed (non-blocking):", err);
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public reset(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.queue = [];
    this.nodeRevisions.clear();
    this.subscribers.clear();
  }
}

export const shadowEventBus = new ShadowEventBus();
