import {
  type Mandate,
  type Ticket,
  type WorkflowPhase,
  type StructuredPlan,
  type PlanImpactAssessment,
  type ConfirmationCheckpoint,
  createMandate,
  validateMandateExecution,
  transitionWorkflowPhase,
} from "../../domain/agentWorkflow.ts";

/**
 * Lifecycle and credential manager for Scoped Mandates and Stateful Tickets.
 */
export class MandateLifecycleManager {
  readonly #mandates = new Map<string, Mandate>();
  readonly #tickets = new Map<string, Ticket>();

  issueMandate(params: {
    authorizedBy: "Router" | "User";
    allowedTools: readonly string[];
    maxStepCount: number;
    ttlMs?: number;
    scope?: string;
    policyVersion?: string;
  }): Mandate {
    const mandate = createMandate(params);
    this.#mandates.set(mandate.id, mandate);
    return mandate;
  }

  createTicket(
    mandateId: string,
    workerId: string,
    executionPayload?: unknown,
  ): Ticket {
    const mandate = this.#mandates.get(mandateId);
    if (!mandate) {
      throw new Error(`Mandate ${mandateId} not found`);
    }

    const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ticket: Ticket = {
      ticketId,
      mandateId,
      mandate,
      workerId,
      status: "pending",
      stepsUsed: 0,
      currentStepCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stepLogs: [],
      artifactRefs: [],
      inputs: [],
      executionPayload,
    };

    this.#tickets.set(ticketId, ticket);
    return ticket;
  }

  getMandate(mandateId: string): Mandate | undefined {
    return this.#mandates.get(mandateId);
  }

  getTicket(ticketId: string): Ticket | undefined {
    return this.#tickets.get(ticketId);
  }

  listTickets(): readonly Ticket[] {
    return Array.from(this.#tickets.values());
  }

  executeStep(
    ticketId: string,
    tool: string,
  ): { allowed: boolean; reason?: string; stepsRemaining?: number } {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket) {
      return { allowed: false, reason: "Ticket not found", stepsRemaining: 0 };
    }

    if (ticket.status !== "pending" && ticket.status !== "in_progress") {
      return {
        allowed: false,
        reason: `Ticket is ${ticket.status}`,
        stepsRemaining: 0,
      };
    }

    const check = validateMandateExecution(
      ticket.mandate,
      tool,
      ticket.stepsUsed,
    );
    if (!check.allowed) {
      ticket.status = "blocked";
      ticket.blockedReason = check.reason;
      ticket.updatedAt = new Date().toISOString();
      return {
        allowed: false,
        reason: check.reason,
        stepsRemaining: Math.max(
          0,
          ticket.mandate.maxStepCount - ticket.stepsUsed,
        ),
      };
    }

    ticket.stepsUsed += 1;
    ticket.currentStepCount = ticket.stepsUsed;
    ticket.currentTool = tool;
    ticket.status = "in_progress";
    ticket.updatedAt = new Date().toISOString();

    return {
      allowed: true,
      stepsRemaining: ticket.mandate.maxStepCount - ticket.stepsUsed,
    };
  }

  completeTicket(ticketId: string, resultSummary?: string): void {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket) return;
    ticket.status = "completed";
    ticket.resultSummary = resultSummary;
    ticket.updatedAt = new Date().toISOString();
  }

  failTicket(ticketId: string, error: string): void {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket) return;
    ticket.status = "failed";
    ticket.error = error;
    ticket.updatedAt = new Date().toISOString();
  }

  unblockTicket(ticketId: string, additionalSteps?: number): void {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket) return;
    ticket.status = "in_progress";
    ticket.blockedReason = undefined;
    ticket.updatedAt = new Date().toISOString();

    if (additionalSteps && additionalSteps > 0) {
      // Re-issue or extend via updated mandate copy
      const current = ticket.mandate;
      const updatedMandate: Mandate = Object.freeze({
        ...current,
        maxStepCount: current.maxStepCount + additionalSteps,
      });
      this.#mandates.set(updatedMandate.id, updatedMandate);
      (ticket as { mandate: Mandate }).mandate = updatedMandate;
    }
  }
}

export interface CoordinatorOptions {
  mandateManager?: MandateLifecycleManager;
  defaultQuota?: number;
}

/**
 * Three-Phase Flow Coordinator:
 * Orchestrates Planning -> Confirm -> Execution state machine and human checkpoints.
 */
export class ThreePhaseFlowCoordinator {
  #phase: WorkflowPhase = "idle";
  #currentPlan?: StructuredPlan;
  #currentCheckpoint?: ConfirmationCheckpoint;
  #activeTicketId?: string;
  readonly #mandateManager: MandateLifecycleManager;

  constructor(options?: CoordinatorOptions) {
    this.#mandateManager =
      options?.mandateManager ?? new MandateLifecycleManager();
  }

  get phase(): WorkflowPhase {
    return this.#phase;
  }

  get currentPlan(): StructuredPlan | undefined {
    return this.#currentPlan && structuredClone(this.#currentPlan);
  }

  get currentCheckpoint(): ConfirmationCheckpoint | undefined {
    return this.#currentCheckpoint && structuredClone(this.#currentCheckpoint);
  }

  get activeTicketId(): string | undefined {
    return this.#activeTicketId;
  }

  get mandateManager(): MandateLifecycleManager {
    return this.#mandateManager;
  }

  startPlanning(userPrompt: string): { phase: WorkflowPhase; planId: string } {
    if (!["idle", "completed", "failed", "cancelled"].includes(this.#phase))
      throw new Error("Workflow is already active");
    this.#activeTicketId = undefined;
    this.#currentCheckpoint = undefined;
    this.#phase = transitionWorkflowPhase(this.#phase, {
      type: "START_PLANNING",
    });
    const planId = `plan-${Date.now()}`;
    this.#currentPlan = {
      planId,
      title: userPrompt.slice(0, 40),
      userPrompt,
      items: [],
      requestedTools: [],
      suggestedStepQuota: 10,
    };
    return { phase: this.#phase, planId };
  }

  compilePlan(
    plan: StructuredPlan,
    impact: PlanImpactAssessment,
    forceConfirmation?: boolean,
  ): { checkpoint: ConfirmationCheckpoint; requiresConfirmation: boolean } {
    if (this.#phase !== "planning")
      throw new Error("Plan does not belong to the active planning phase");
    this.#currentPlan = structuredClone(plan);
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 60 * 1000).toISOString();

    const requiresConfirmation =
      forceConfirmation === true ||
      (forceConfirmation !== false &&
        (impact.costTier === "high" ||
          impact.costTier === "medium" ||
          impact.triggeredGates.length > 0 ||
          impact.securityRiskLevel !== "low")) ||
      (forceConfirmation === false &&
        (impact.triggeredGates.includes("high_cost_batch") ||
          impact.securityRiskLevel === "critical"));

    const checkpoint: ConfirmationCheckpoint = {
      checkpointId: `chk-${now}`,
      planId: plan.planId,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      plan: structuredClone(plan),
      impact: structuredClone(impact),
      status: "pending",
    };

    this.#currentCheckpoint = checkpoint;
    this.#phase = transitionWorkflowPhase(this.#phase, {
      type: "PLAN_READY",
      requiresConfirmation,
    });

    return { checkpoint: structuredClone(checkpoint), requiresConfirmation };
  }

  approveCheckpoint(
    checkpointId: string,
    options?: { authorizedBy?: "Router" | "User"; workerId?: string },
  ): { phase: WorkflowPhase; mandate: Mandate; ticket: Ticket } {
    if (
      !this.#currentCheckpoint ||
      this.#currentCheckpoint.checkpointId !== checkpointId
    ) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    if (
      this.#currentCheckpoint.status !== "pending" ||
      !["confirm", "execution"].includes(this.#phase)
    )
      throw new Error("Checkpoint is no longer pending");
    if (Date.now() >= Date.parse(this.#currentCheckpoint.expiresAt)) {
      this.#currentCheckpoint.status = "expired";
      throw new Error("Checkpoint has expired");
    }

    this.#currentCheckpoint.status = "approved";
    this.#currentCheckpoint.decision = {
      decidedAt: new Date().toISOString(),
      decidedBy: "user",
      action: "approve",
    };

    this.#phase = transitionWorkflowPhase(this.#phase, {
      type: "USER_APPROVE",
    });

    const tools =
      this.#currentCheckpoint.decision?.adjustedToolWhitelist ??
      this.#currentCheckpoint.plan.requestedTools;
    const quota =
      this.#currentCheckpoint.decision?.adjustedStepQuota ??
      this.#currentCheckpoint.plan.suggestedStepQuota;

    const mandate = this.#mandateManager.issueMandate({
      authorizedBy: options?.authorizedBy ?? "User",
      allowedTools: tools,
      maxStepCount: quota,
      scope: this.#currentCheckpoint.planId,
    });

    const ticket = this.#mandateManager.createTicket(
      mandate.id,
      options?.workerId ?? "worker-general",
      { planId: this.#currentCheckpoint.planId },
    );

    this.#activeTicketId = ticket.ticketId;

    return { phase: this.#phase, mandate, ticket };
  }

  rejectCheckpoint(
    checkpointId: string,
    reason?: string,
  ): { phase: WorkflowPhase } {
    if (
      this.#currentCheckpoint &&
      this.#currentCheckpoint.checkpointId === checkpointId
    ) {
      this.#currentCheckpoint.status = "rejected";
      this.#currentCheckpoint.decision = {
        decidedAt: new Date().toISOString(),
        decidedBy: "user",
        action: "reject",
        reworkFeedback: reason,
      };
    }
    this.#phase = transitionWorkflowPhase(this.#phase, { type: "USER_REJECT" });
    return { phase: this.#phase };
  }

  modifyCheckpoint(
    checkpointId: string,
    feedback: string,
    adjustedTools?: string[],
    adjustedQuota?: number,
  ): { phase: WorkflowPhase; reworkedPlan: StructuredPlan } {
    if (
      !this.#currentCheckpoint ||
      this.#currentCheckpoint.checkpointId !== checkpointId
    ) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    this.#currentCheckpoint.status = "modified";
    this.#currentCheckpoint.decision = {
      decidedAt: new Date().toISOString(),
      decidedBy: "user",
      action: "modify",
      reworkFeedback: feedback,
      adjustedToolWhitelist: adjustedTools,
      adjustedStepQuota: adjustedQuota,
    };

    this.#phase = transitionWorkflowPhase(this.#phase, { type: "USER_MODIFY" });

    const updatedPlan: StructuredPlan = {
      ...this.#currentCheckpoint.plan,
      requestedTools:
        adjustedTools ?? this.#currentCheckpoint.plan.requestedTools,
      suggestedStepQuota:
        adjustedQuota ?? this.#currentCheckpoint.plan.suggestedStepQuota,
    };
    this.#currentPlan = updatedPlan;

    return { phase: this.#phase, reworkedPlan: updatedPlan };
  }

  executeStep(tool: string): {
    allowed: boolean;
    reason?: string;
    stepsRemaining?: number;
  } {
    if (!this.#activeTicketId) {
      return { allowed: false, reason: "No active ticket in execution phase" };
    }
    const result = this.#mandateManager.executeStep(this.#activeTicketId, tool);
    if (!result.allowed) {
      this.#phase = transitionWorkflowPhase(this.#phase, {
        type: "STEP_BLOCKED",
        reason: result.reason ?? "Blocked",
      });
    }
    return result;
  }

  completeExecution(summary?: string): {
    phase: WorkflowPhase;
    ticket?: Ticket;
  } {
    if (this.#activeTicketId) {
      this.#mandateManager.completeTicket(this.#activeTicketId, summary);
    }
    this.#phase = transitionWorkflowPhase(this.#phase, {
      type: "EXECUTION_COMPLETE",
    });
    const ticket = this.#activeTicketId
      ? this.#mandateManager.getTicket(this.#activeTicketId)
      : undefined;
    return { phase: this.#phase, ticket };
  }

  failExecution(error: string): { phase: WorkflowPhase; ticket?: Ticket } {
    if (this.#activeTicketId) {
      this.#mandateManager.failTicket(this.#activeTicketId, error);
    }
    this.#phase = transitionWorkflowPhase(this.#phase, {
      type: "FATAL_ERROR",
      error,
    });
    const ticket = this.#activeTicketId
      ? this.#mandateManager.getTicket(this.#activeTicketId)
      : undefined;
    return { phase: this.#phase, ticket };
  }

  unblockExecution(additionalSteps?: number): {
    phase: WorkflowPhase;
    ticket?: Ticket;
  } {
    if (this.#activeTicketId) {
      this.#mandateManager.unblockTicket(this.#activeTicketId, additionalSteps);
    }
    this.#phase = transitionWorkflowPhase(this.#phase, {
      type: "UNBLOCK_RESUME",
    });
    const ticket = this.#activeTicketId
      ? this.#mandateManager.getTicket(this.#activeTicketId)
      : undefined;
    return { phase: this.#phase, ticket };
  }
}
