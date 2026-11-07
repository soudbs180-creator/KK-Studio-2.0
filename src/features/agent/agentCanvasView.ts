import type { CanvasViewportData } from "./agentTypes.ts";

/** A live canvas controller, scoped to the mounted project, not a second persisted selection store. */
export interface AgentCanvasView {
  executeOperation?: (raw: unknown) => Promise<{
    success: boolean;
    op: string;
    error?: string;
    data?: unknown;
  }>;
  getState(): { selectedNodeIds: string[]; viewport: CanvasViewportData };
  selectNodes(ids: string[]): void;
  setViewport(viewport: CanvasViewportData): void;
}
