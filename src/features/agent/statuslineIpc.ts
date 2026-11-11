import {
  formatStatuslineIPC,
  type StatuslineStatusInput,
  type StatuslinePayload,
  type RichStatuslinePayload,
  type AgentState,
} from "../../domain/agentWorkflow.ts";

export {
  formatStatuslineIPC,
  type StatuslineStatusInput,
  type StatuslinePayload,
  type RichStatuslinePayload,
  type AgentState,
};

export type StatuslineListener = (
  payload: RichStatuslinePayload,
  rawJson: string,
) => void;

export interface StatuslineBroadcasterOptions {
  minEmitIntervalMs?: number;
}

/**
 * Real-time Statusline Telemetry Broadcaster.
 * Streams structured JSON updates to UI components, logs, and external listeners.
 */
export class StatuslineBroadcaster {
  readonly #listeners = new Set<StatuslineListener>();
  readonly #minEmitIntervalMs: number;
  #lastEmitTimestamp = 0;

  constructor(options?: StatuslineBroadcasterOptions) {
    this.#minEmitIntervalMs = options?.minEmitIntervalMs ?? 0;
  }

  get listenerCount(): number {
    return this.#listeners.size;
  }

  subscribe(listener: StatuslineListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  broadcast(payload: RichStatuslinePayload): boolean {
    const now = Date.now();
    if (
      this.#minEmitIntervalMs > 0 &&
      now - this.#lastEmitTimestamp < this.#minEmitIntervalMs
    ) {
      return false;
    }
    this.#lastEmitTimestamp = now;

    let rawJson: string;
    try {
      rawJson = JSON.stringify(payload);
    } catch {
      rawJson = String(payload);
    }

    for (const listener of this.#listeners) {
      try {
        listener(payload, rawJson);
      } catch (err) {
        // Safe listener error suppression to avoid breaking agent pipeline
        console.error("StatuslineBroadcaster listener error:", err);
      }
    }
    return true;
  }

  formatAnsiStatusline(
    payload: RichStatuslinePayload,
    terminalWidth = 80,
  ): string {
    const stateIcons: Record<AgentState, string> = {
      idle: "IDLE",
      thinking: "THINKING",
      working: "WORKING",
      tool_use: "TOOL",
      review: "REVIEW",
      blocked: "BLOCKED",
      completed: "DONE",
      failed: "FAILED",
    };

    const statusTag = `[${stateIcons[payload.state] ?? "RUNNING"}]`;
    const agentTag = payload.agent;
    const progressTag = `${payload.progress}%`;
    const stepTag = `(${payload.step}/${payload.totalSteps})`;
    const toolTag = payload.currentTool ? `tool:${payload.currentTool}` : "";

    const line = [statusTag, agentTag, progressTag, stepTag, toolTag]
      .filter((s) => s.length > 0)
      .join(" ");

    return line.length > terminalWidth
      ? line.slice(0, terminalWidth - 3) + "..."
      : line;
  }
}
