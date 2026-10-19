/**
 * Subagent Delegation Pipeline
 *
 * Enables the primary agent to offload resource-intensive, verbose, or localized
 * tasks (e.g. document scraping, deep multi-source analysis, localized image editing)
 * to isolated child subagents with sandboxed tool execution and clean structural foldback.
 */

import {
  type SubagentFoldbackResult,
  type SubagentTaskBrief,
  type SubagentTaskType,
} from "./foldbackContract.ts";
import {
  SubagentSandbox,
  type SubagentToolDefinition,
  type SubagentTurnHandler,
  type SandboxExecutionOptions,
} from "./subagentSandbox.ts";

export interface SubagentRolePreset {
  role: string;
  defaultTaskType: SubagentTaskType;
  description: string;
  defaultAllowedTools: string[];
  maxTurns?: number;
  timeoutMs?: number;
}

export const DEFAULT_ROLE_PRESETS: Record<string, SubagentRolePreset> = {
  scraper: {
    role: "scraper",
    defaultTaskType: "scrape",
    description: "Offload web scraping, document text extraction, and table parsing.",
    defaultAllowedTools: ["fetch_url", "extract_dom", "parse_table", "read_file_content"],
    maxTurns: 15,
    timeoutMs: 30000,
  },
  deep_analysis: {
    role: "deep_analysis",
    defaultTaskType: "deep_analysis",
    description: "Analyze lengthy reference materials, compile metrics, and generate synthesis.",
    defaultAllowedTools: ["search_index", "compute_metrics", "summarize_section", "compare_diffs"],
    maxTurns: 20,
    timeoutMs: 60000,
  },
  local_image_edit: {
    role: "local_image_edit",
    defaultTaskType: "local_image_edit",
    description: "Run localized image inpainting, segmentation, and prompt refinement.",
    defaultAllowedTools: ["segment_mask", "generate_layer_variant", "render_preview"],
    maxTurns: 10,
    timeoutMs: 45000,
  },
  code_verify: {
    role: "code_verify",
    defaultTaskType: "code_verify",
    description: "Verify isolated code snippets, run syntax checks, and validate logic.",
    defaultAllowedTools: ["run_isolated_test", "lint_snippet", "typecheck_code"],
    maxTurns: 10,
    timeoutMs: 30000,
  },
};

export interface DelegationPipelineOptions {
  defaultMaxConcurrency?: number;
  presets?: Record<string, SubagentRolePreset>;
  tools?: SubagentToolDefinition[];
}

export interface PipelineMetrics {
  totalTasksDispatched: number;
  successfulTasks: number;
  partialTasks: number;
  failedTasks: number;
  totalTokensConsumed: number;
  totalTokensSaved: number;
  averageDurationMs: number;
}

export type PipelineEvent =
  | { type: "task_started"; taskId: string; role: string }
  | { type: "task_completed"; taskId: string; result: SubagentFoldbackResult }
  | { type: "task_failed"; taskId: string; error: string };

export class DelegationPipeline {
  private _presets: Map<string, SubagentRolePreset> = new Map();
  private _tools: Map<string, SubagentToolDefinition> = new Map();
  private _sandboxes: Map<string, SubagentSandbox> = new Map();
  private _results: Map<string, SubagentFoldbackResult> = new Map();
  private _activeControllers: Map<string, AbortController> = new Map();
  private _listeners: Set<(event: PipelineEvent) => void> = new Set();
  private _maxConcurrency: number;

  constructor(options?: DelegationPipelineOptions) {
    this._maxConcurrency = options?.defaultMaxConcurrency ?? 5;

    // Load presets
    const initialPresets = { ...DEFAULT_ROLE_PRESETS, ...(options?.presets || {}) };
    for (const [key, preset] of Object.entries(initialPresets)) {
      this._presets.set(key, preset);
    }

    // Load registered tools
    if (options?.tools) {
      for (const tool of options.tools) {
        this._tools.set(tool.name, tool);
      }
    }
  }

  /**
   * Register a tool for the delegation pipeline.
   */
  registerTool(tool: SubagentToolDefinition): void {
    this._tools.set(tool.name, tool);
  }

  /**
   * Register or override a role preset.
   */
  registerPreset(preset: SubagentRolePreset): void {
    this._presets.set(preset.role, preset);
  }

  /**
   * Get a role preset by name.
   */
  getPreset(role: string): SubagentRolePreset | undefined {
    return this._presets.get(role);
  }

  /**
   * Subscribe to pipeline lifecycle events.
   */
  subscribe(listener: (event: PipelineEvent) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private emit(event: PipelineEvent): void {
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn("[DelegationPipeline] listener notification failed:", err);
      }
    }
  }

  /**
   * Offload and dispatch a task brief to an isolated subagent sandbox.
   */
  async dispatchTask(
    brief: SubagentTaskBrief,
    customTurnHandler?: SubagentTurnHandler,
    options?: SandboxExecutionOptions,
  ): Promise<SubagentFoldbackResult> {
    const preset = this._presets.get(brief.subagentRole);

    // Merge allowed tools from preset if brief does not specify
    const allowedToolNames = brief.allowedTools || preset?.defaultAllowedTools || [];
    const availableTools: SubagentToolDefinition[] = [];

    for (const toolName of allowedToolNames) {
      const tool = this._tools.get(toolName);
      if (tool) {
        availableTools.push(tool);
      }
    }

    const abortController = new AbortController();
    this._activeControllers.set(brief.taskId, abortController);

    // Create isolated sandbox
    const sandbox = new SubagentSandbox(
      {
        ...brief,
        allowedTools: allowedToolNames,
        maxTurns: brief.maxTurns ?? preset?.maxTurns ?? 20,
        timeoutMs: brief.timeoutMs ?? preset?.timeoutMs ?? 30000,
      },
      {
        tools: availableTools,
      },
    );

    this._sandboxes.set(brief.taskId, sandbox);
    this.emit({ type: "task_started", taskId: brief.taskId, role: brief.subagentRole });

    // Link options signal if provided
    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        abortController.abort(options.signal?.reason);
      });
    }

    // Default turn handler if none supplied
    const handler = customTurnHandler || this.createDefaultTurnHandler(brief);

    try {
      const result = await sandbox.run(handler, {
        maxTurns: options?.maxTurns ?? brief.maxTurns ?? preset?.maxTurns,
        timeoutMs: options?.timeoutMs ?? brief.timeoutMs ?? preset?.timeoutMs,
        signal: abortController.signal,
      });

      this._results.set(brief.taskId, result);

      if (result.status === "failed") {
        this.emit({
          type: "task_failed",
          taskId: brief.taskId,
          error: result.error || "Unknown task failure",
        });
      } else {
        this.emit({ type: "task_completed", taskId: brief.taskId, result });
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const fallbackResult = sandbox.compileFoldbackResult({
        status: "failed",
        executiveSummary: `Subagent dispatch failed: ${errorMsg}`,
        error: errorMsg,
      });
      this._results.set(brief.taskId, fallbackResult);
      this.emit({ type: "task_failed", taskId: brief.taskId, error: errorMsg });
      return fallbackResult;
    } finally {
      this._activeControllers.delete(brief.taskId);
    }
  }

  /**
   * Dispatch multiple tasks in parallel with bounded concurrency.
   */
  async dispatchBatch(
    briefs: SubagentTaskBrief[],
    customTurnHandler?: SubagentTurnHandler,
    options?: { concurrency?: number; signal?: AbortSignal },
  ): Promise<SubagentFoldbackResult[]> {
    const concurrency = Math.max(1, options?.concurrency ?? this._maxConcurrency);
    const results: SubagentFoldbackResult[] = new Array(briefs.length);
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < briefs.length) {
        if (options?.signal?.aborted) break;
        const index = currentIndex++;
        const brief = briefs[index];
        results[index] = await this.dispatchTask(brief, customTurnHandler, {
          signal: options?.signal,
        });
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, briefs.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  /**
   * Cancel an actively executing subagent task.
   */
  cancelTask(taskId: string, reason: string = "Task cancelled by primary agent."): boolean {
    const controller = this._activeControllers.get(taskId);
    if (controller) {
      controller.abort(new Error(reason));
      return true;
    }
    return false;
  }

  /**
   * Cancel all running subagents.
   */
  cancelAll(reason: string = "All tasks cancelled."): void {
    for (const controller of this._activeControllers.values()) {
      controller.abort(new Error(reason));
    }
    this._activeControllers.clear();
  }

  /**
   * Get sandbox by task ID.
   */
  getSandbox(taskId: string): SubagentSandbox | undefined {
    return this._sandboxes.get(taskId);
  }

  /**
   * Get result by task ID.
   */
  getResult(taskId: string): SubagentFoldbackResult | undefined {
    return this._results.get(taskId);
  }

  /**
   * Count of currently active subagent sandboxes.
   */
  getActiveTaskCount(): number {
    return this._activeControllers.size;
  }

  /**
   * Aggregate metrics across all executed tasks in this pipeline session.
   */
  getMetrics(): PipelineMetrics {
    const results = Array.from(this._results.values());
    let successful = 0;
    let partial = 0;
    let failed = 0;
    let tokensConsumed = 0;
    let tokensSaved = 0;
    let totalDurationMs = 0;

    for (const res of results) {
      if (res.status === "success") successful++;
      else if (res.status === "partial") partial++;
      else failed++;

      tokensConsumed += res.tokensConsumed || 0;
      if (res.executionStats) {
        tokensSaved += res.executionStats.tokensSaved || 0;
        totalDurationMs += res.executionStats.durationMs || 0;
      }
    }

    return {
      totalTasksDispatched: results.length,
      successfulTasks: successful,
      partialTasks: partial,
      failedTasks: failed,
      totalTokensConsumed: tokensConsumed,
      totalTokensSaved: tokensSaved,
      averageDurationMs: results.length > 0 ? Math.round(totalDurationMs / results.length) : 0,
    };
  }

  /**
   * Creates a default turn handler for scenarios where external LLM completion isn't injected.
   */
  private createDefaultTurnHandler(brief: SubagentTaskBrief): SubagentTurnHandler {
    return async (history, availableTools) => {
      // If we haven't executed tools yet and tools are available, execute the first matching tool
      if (history.length <= 2 && availableTools.length > 0) {
        const primaryTool = availableTools[0];
        return {
          content: `Invoking tool ${primaryTool.name} to accomplish goal: ${brief.goal}`,
          toolCalls: [
            {
              id: `call_${Date.now()}_${primaryTool.name}`,
              name: primaryTool.name,
              args: brief.inputs || {},
            },
          ],
        };
      }

      // Finish with foldback summary
      return {
        done: true,
        finalSummary: `Subagent completed goal: ${brief.goal}`,
        structuredData: {
          taskType: brief.taskType,
          completedAt: new Date().toISOString(),
          processedInputs: brief.inputs ?? {},
        },
      };
    };
  }
}
