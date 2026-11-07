import {
  type AgentRole,
  type Ticket,
  type RouterDecision,
  type GateEvaluationResult,
  type ApprovalGate,
  requiredApprovalGates,
} from "../../domain/agentWorkflow.ts";
import { MandateLifecycleManager } from "./threePhaseFlow.ts";

export interface AgentTask {
  id: string;
  prompt: string;
  targetWorker?: "writer" | "artist" | "critic" | "coder" | AgentRole;
  complexityScore?: number;
  metadata?: Record<string, unknown>;
}

export type StandardWorkerType = "writer" | "artist" | "critic" | "coder";

const STOP_COMMAND_PATTERNS = [
  /\b(?:stop|abort|halt|cancel)\b/i,
  /^(?:停止|取消|终止|中止)/,
];

const ARTIST_PATTERNS = [
  /\b(?:image|draw|storyboard|render|paint)\b/i,
  /(?:画|分镜|生图|渲染|配图)/,
];

const CRITIC_PATTERNS = [
  /\b(?:review|audit|critique|check|inspect)\b/i,
  /(?:评审|审核|质检|红线|审查)/,
];

const CODER_PATTERNS = [
  /\b(?:code|typescript|javascript|bug|script|compile)\b/i,
  /(?:代码|脚本|编译|修复bug)/,
];

/**
 * Deterministic classifier matching canonical RouterWorkerEngine contracts.
 */
export function classifyWorkerRole(prompt: string): StandardWorkerType {
  const text = prompt.toLowerCase();
  for (const pattern of ARTIST_PATTERNS) {
    if (pattern.test(text)) return "artist";
  }
  for (const pattern of CRITIC_PATTERNS) {
    if (pattern.test(text)) return "critic";
  }
  for (const pattern of CODER_PATTERNS) {
    if (pattern.test(text)) return "coder";
  }
  return "writer";
}

/**
 * Computes deterministic complexity score (0 to 100).
 */
export function computeComplexityScore(prompt: string): number {
  let score = 0;
  const len = prompt.trim().length;

  // Length factor
  if (len > 300) score += 35;
  else if (len > 100) score += 20;
  else if (len > 40) score += 10;
  else score += 5;

  // Sequence markers
  if (
    /(?:第一步|第二步|首先|然后|接着|步骤)/.test(prompt) ||
    /\b(?:step 1|then|after that)\b/i.test(prompt)
  ) {
    score += 30;
  }

  // Multi-modal / canvas keywords
  if (
    /(?:画布|连线|节点|生成并排布|分镜排布)/.test(prompt) ||
    /\b(?:canvas|connect|layout)\b/i.test(prompt)
  ) {
    score += 25;
  }

  // Generation / model keywords
  if (
    /(?:生图|视频|渲染|高清)/.test(prompt) ||
    /\b(?:generate|render|sdxl|sora)\b/i.test(prompt)
  ) {
    score += 20;
  }

  return Math.min(100, score);
}

/**
 * 3-Pass Deterministic Gate Pre-Evaluator.
 */
export function evaluateGate(prompt: string): GateEvaluationResult {
  const text = prompt.trim();
  const workerType = classifyWorkerRole(text);
  const complexityScore = computeComplexityScore(text);

  // Role mapping
  const roleMap: Record<StandardWorkerType, AgentRole> = {
    artist: "generation_worker",
    critic: "reviewer",
    coder: "prompt_compiler",
    writer: "planner",
  };
  const recommendedRole = roleMap[workerType];

  // Tool recommendation only when task requires worker delegation
  const tools: string[] = [];
  const requiresWorker = complexityScore >= 30;
  if (requiresWorker) {
    if (workerType === "artist") {
      tools.push("generate_image", "canvas_add_node");
    } else if (workerType === "critic") {
      tools.push("audit_aesthetic_redline", "verify_character_consistency");
    } else if (workerType === "coder") {
      tools.push("compile_optics", "parse_references");
    } else {
      tools.push("plan_get_stage_status", "search_index");
    }
  }

  const gates: ApprovalGate[] = [];
  if (complexityScore >= 70 || /(?:全部覆盖|批量|16张|删除)/.test(text)) {
    gates.push(
      ...requiredApprovalGates({
        privacyMode: "local_only",
        requestedOutputs: /(?:16张|批量)/.test(text) ? 16 : 1,
        overwriteOriginal: /(?:覆盖原图|删除)/.test(text),
      }),
    );
  }

  return {
    complexityScore,
    requiresWorker,
    recommendedRole,
    recommendedTools: Object.freeze(tools),
    recommendedMaxSteps: complexityScore > 60 ? 15 : 8,
    requiredGates: Object.freeze(gates),
    rationale: `Complexity score ${complexityScore} evaluated for role ${recommendedRole}`,
  };
}

/**
 * Canonical RouterWorkerEngine conforming to E2E harness and production dispatching.
 */
export class RouterWorkerEngine {
  classifyAndRoute(task: AgentTask): {
    route: "router_direct" | "worker_delegate";
    workerType: StandardWorkerType;
    requiresGateApproval: boolean;
  } {
    const workerType = classifyWorkerRole(task.prompt);
    const isComplex = (task.complexityScore || task.prompt.length) > 100;

    return {
      route: isComplex ? "worker_delegate" : "router_direct",
      workerType,
      requiresGateApproval: isComplex,
    };
  }
}

/**
 * Router Session: Orchestrator for Level 1 multi-agent hierarchy.
 */
export class RouterSession {
  readonly #mandateManager: MandateLifecycleManager;
  readonly #engine = new RouterWorkerEngine();

  constructor(mandateManager?: MandateLifecycleManager) {
    this.#mandateManager = mandateManager ?? new MandateLifecycleManager();
  }

  get mandateManager(): MandateLifecycleManager {
    return this.#mandateManager;
  }

  get engine(): RouterWorkerEngine {
    return this.#engine;
  }

  /**
   * Evaluates input prompt through deterministic security and complexity gate passes.
   */
  evaluateInput(prompt: string): RouterDecision {
    const trimmed = prompt.trim();

    // Pass 1: Stop Command Guard
    for (const pattern of STOP_COMMAND_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          kind: "stop",
          reason: "User requested immediate workflow termination",
          audit: {
            complexityScore: 0,
            evaluatedGates: [],
          },
        };
      }
    }

    // Pass 2 & 3: Complexity and Threshold Gate
    const gateResult = evaluateGate(trimmed);

    if (!gateResult.requiresWorker && gateResult.complexityScore < 30) {
      return {
        kind: "direct_reply",
        reason: "Low complexity query handled directly by router",
        directResponseText: `[Router Direct Response]: Processing request: ${trimmed}`,
        audit: {
          complexityScore: gateResult.complexityScore,
          matchedRole: gateResult.recommendedRole,
          evaluatedGates: gateResult.requiredGates,
        },
      };
    }

    // High complexity: Issue Mandate
    const mandate = this.#mandateManager.issueMandate({
      authorizedBy: "Router",
      allowedTools: gateResult.recommendedTools,
      maxStepCount: gateResult.recommendedMaxSteps,
    });

    const ticket = this.#mandateManager.createTicket(
      mandate.id,
      `worker-${gateResult.recommendedRole}`,
    );

    return {
      kind: "accept",
      reason: gateResult.rationale,
      ticketId: ticket.ticketId,
      mandate,
      audit: {
        complexityScore: gateResult.complexityScore,
        matchedRole: gateResult.recommendedRole,
        evaluatedGates: gateResult.requiredGates,
      },
    };
  }

  /**
   * Dispatches task using canonical classification and lifecycle tickets.
   */
  dispatchTask(task: AgentTask): {
    decision: RouterDecision;
    ticket?: Ticket;
  } {
    const routing = this.#engine.classifyAndRoute(task);
    if (routing.route === "router_direct") {
      return {
        decision: {
          kind: "direct_reply",
          reason: "Task routed directly to router without worker delegation",
          directResponseText: `Direct reply for task: ${task.prompt}`,
          audit: {
            complexityScore: task.complexityScore ?? task.prompt.length,
            evaluatedGates: [],
          },
        },
      };
    }

    const decision = this.evaluateInput(task.prompt);
    const ticket = decision.ticketId
      ? this.#mandateManager.getTicket(decision.ticketId)
      : undefined;

    return { decision, ticket };
  }
}
