/**
 * Pure Domain Conversation Turn-Rewind Recovery & Token Ledger Rollback.
 *
 * Adheres strictly to Clean Architecture (Hexagonal Core):
 * Zero framework, zero DOM, zero platform/Tauri dependencies.
 */

import { z } from "zod";
export type RewindStatus =
  | "idle"
  | "preparing"
  | "persisting"
  | "compensating"
  | "verifying"
  | "reverting"
  | "complete"
  | "incomplete"
  | "ui-refresh-required";

export interface TurnTokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface ConversationTurn {
  readonly turnId: string;
  readonly role: "user" | "assistant" | "system" | "tool";
  readonly content: string;
  readonly status: "inProgress" | "completed" | "failed" | "interrupted";
  readonly tokenUsage?: TurnTokenUsage;
  readonly channelId?: string;
  readonly timestamp: number;
}

export interface RewindRecord {
  readonly runId: string;
  readonly threadId: string;
  readonly beforeTurnId: string;
  readonly startedAt: number;
  status: RewindStatus;
  revertedTurnCount: number;
  rolledBackTokens: TurnTokenUsage;
  historyBefore: readonly ConversationTurn[];
  error?: string;
  finishedAt?: number;
}

export interface RevertVerificationReport {
  readonly status: "complete" | "partial" | "blocked";
  readonly undone: readonly string[];
  readonly unresolved: readonly string[];
  readonly verification: readonly string[];
}

export interface TurnRewindHostBridge {
  validateRewindHistory?: (
    before: readonly ConversationTurn[],
    latest: readonly ConversationTurn[],
  ) => boolean;
  getThreadId(): string;
  getTurns(threadId: string): Promise<readonly ConversationTurn[]>;
  isThreadBusy(threadId: string): boolean;
  persistBackupSnapshot(record: RewindRecord): Promise<void>;
  executeCompensationPrompt(threadId: string, prompt: string): Promise<string>;
  truncateConversation(threadId: string, beforeTurnId: string): Promise<void>;
  rollbackTokenUsage(threadId: string, rolledBack: TurnTokenUsage): void;
  resetGatewayAffinity(threadId: string): void;
}

export class TurnRewindRecoveryController {
  readonly #bridge: TurnRewindHostBridge;
  readonly #activeRuns = new Map<string, RewindRecord>();
  readonly #pendingThreads = new Set<string>();

  constructor(bridge: TurnRewindHostBridge) {
    this.#bridge = bridge;
  }

  isRewinding(threadId: string): boolean {
    return this.#pendingThreads.has(threadId);
  }

  getActiveRecord(threadId: string): RewindRecord | undefined {
    return this.#activeRuns.get(threadId);
  }

  async executeRewind(
    threadId: string,
    beforeTurnId: string,
  ): Promise<RewindRecord> {
    if (this.#pendingThreads.has(threadId))
      throw new Error(`Turn rewind already active for thread ${threadId}`);
    if (threadId !== this.#bridge.getThreadId())
      throw new Error("Conversation changed before rewind");
    this.#pendingThreads.add(threadId);
    try {
      return await this.#executeRewind(threadId, beforeTurnId);
    } finally {
      this.#pendingThreads.delete(threadId);
    }
  }

  async #executeRewind(
    threadId: string,
    beforeTurnId: string,
  ): Promise<RewindRecord> {
    if (this.#activeRuns.has(threadId)) {
      throw new Error(`Turn rewind already active for thread ${threadId}`);
    }
    if (this.#bridge.isThreadBusy(threadId)) {
      throw new Error(
        `Cannot rewind while thread ${threadId} has in-flight operations`,
      );
    }

    const turns = await this.#bridge.getTurns(threadId);
    const targetIndex = turns.findIndex((t) => t.turnId === beforeTurnId);
    if (targetIndex < 0) {
      throw new Error(
        `Target turn ${beforeTurnId} not found in thread ${threadId}`,
      );
    }

    const turnsToRevert = turns.slice(targetIndex);
    const rolledBackTokens: TurnTokenUsage = turnsToRevert.reduce(
      (acc, t) => ({
        promptTokens: acc.promptTokens + (t.tokenUsage?.promptTokens ?? 0),
        completionTokens:
          acc.completionTokens + (t.tokenUsage?.completionTokens ?? 0),
        totalTokens: acc.totalTokens + (t.tokenUsage?.totalTokens ?? 0),
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    );

    const runId = `rewind-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const record: RewindRecord = {
      runId,
      threadId,
      beforeTurnId,
      startedAt: Date.now(),
      status: "preparing",
      revertedTurnCount: turnsToRevert.length,
      rolledBackTokens,
      historyBefore: turns,
    };

    this.#activeRuns.set(threadId, record);

    try {
      // 1. Persist snapshot for disaster-recovery safety
      record.status = "persisting";
      await this.#bridge.persistBackupSnapshot(record);

      // 2. Perform compensation if file/system operations were performed
      record.status = "compensating";
      const prompt = this.formatCompensationPrompt(
        runId,
        threadId,
        beforeTurnId,
        turnsToRevert,
      );
      const assistantOutput = await this.#bridge.executeCompensationPrompt(
        threadId,
        prompt,
      );

      // 3. Verify compensation report
      record.status = "verifying";
      const report = this.parseVerificationReport(assistantOutput, runId);
      if (report.status !== "complete" || report.unresolved.length > 0) {
        throw new Error(`Rollback incomplete: ${report.unresolved.join(", ")}`);
      }

      // Check for concurrent interleaving during prompt execution
      const latestTurns = await this.#bridge.getTurns(threadId);
      const validHistory =
        this.#bridge.validateRewindHistory?.(turns, latestTurns) ??
        (latestTurns.length === turns.length ||
          (latestTurns.length === turns.length + 1 &&
            latestTurns.at(-1)?.role === "assistant"));
      if (
        !validHistory ||
        this.#bridge.isThreadBusy(threadId) ||
        this.#bridge.getThreadId() !== threadId ||
        JSON.stringify(latestTurns.slice(0, turns.length)) !==
          JSON.stringify(turns)
      ) {
        throw new Error(
          "Concurrent activity detected during rewind; aborting truncation",
        );
      }

      // 4. Commit truncation and roll back token ledger & gateway affinity
      record.status = "reverting";
      await this.#bridge.truncateConversation(threadId, beforeTurnId);
      this.#bridge.rollbackTokenUsage(threadId, rolledBackTokens);
      this.#bridge.resetGatewayAffinity(threadId);

      record.status = "complete";
      record.finishedAt = Date.now();
      return record;
    } catch (err) {
      record.status = "incomplete";
      record.error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      this.#activeRuns.delete(threadId);
    }
  }

  formatCompensationPrompt(
    runId: string,
    threadId: string,
    beforeTurnId: string,
    turns: readonly ConversationTurn[],
  ): string {
    return [
      `[KK Studio Turn Rewind Compensation: ${runId}]`,
      `Thread: ${threadId}, Revert before turn: ${beforeTurnId}`,
      `Reverse any file/system operations executed in the following turns:`,
      JSON.stringify(
        turns.map((t) => ({ id: t.turnId, role: t.role, content: t.content })),
      ),
      `Ensure all modified files are backed up to .codex-rewind-backups/${runId}/ before modifying.`,
      `Output exactly the following verification footer on the last line:`,
      `KK_REWIND_RESULT_${runId}={"status":"complete","undone":[],"unresolved":[],"verification":[]}`,
    ].join("\n");
  }

  parseVerificationReport(
    output: string,
    runId: string,
  ): RevertVerificationReport {
    const prefix = `KK_REWIND_RESULT_${runId}=`;
    const line = output
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .at(-1);
    if (!line?.startsWith(prefix)) {
      throw new Error("Missing verification report from AI assistant");
    }
    const jsonStr = line.slice(prefix.length);
    const parsed = z
      .object({
        status: z.enum(["complete", "partial", "blocked"]),
        undone: z.array(z.string()),
        unresolved: z.array(z.string()),
        verification: z.array(z.string()),
      })
      .strict()
      .parse(JSON.parse(jsonStr));
    if (!["complete", "partial", "blocked"].includes(parsed.status)) {
      throw new Error(
        `Invalid status in verification report: ${parsed.status}`,
      );
    }
    return parsed;
  }
}
