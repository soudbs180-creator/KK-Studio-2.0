/**
 * Single-writer ticket engine adapted from dsh-superagent.
 * One Engine instance serializes Intake, Eval, Tickets, Assignments and the outbox.
 */

export type TriggerStrength = "explicit" | "inferred" | "not_admitted";
export type MandateBasis = "addressed" | "followup" | "admission" | "bot";
export type PolicyMode = "off" | "observe" | "auto";
export type DecisionKind = "accept" | "stop" | "ignore" | "unavailable";
export type TicketPhase =
  | "person/delivery"
  | "person/answer"
  | "person/review"
  | "person/blocked"
  | "working/queued"
  | "idle"
  | "working";
export type EffectKind =
  "assessment" | "launch" | "delivery" | "relay" | "notice" | "reply";

export interface Trigger {
  id: string;
  threadId: string;
  text: string;
  source: "conversation" | "canvas" | "external";
  explicit?: boolean;
}

export interface Policy {
  version: number;
  mode: PolicyMode;
}

export interface Mandate {
  policyVersion: number;
  scope: string;
  strength: TriggerStrength;
  basis: MandateBasis;
  matchedRules: string[];
}

export interface Attention {
  id: string;
  question: string;
}

export interface Report {
  status: "ready" | "blocked" | "failed" | "waiting";
  at: number;
}

export interface Assignment {
  workerId: string;
  state: "pending" | "running" | "done";
}

export interface Ticket {
  id: string;
  threadId: string;
  phase: TicketPhase;
  mandate?: Mandate;
  attention?: Attention;
  report?: Report;
  assignment?: Assignment;
  deliveryFailed?: boolean;
  humanMessageAt?: number;
  ended?: boolean;
}

export interface Effect {
  id: string;
  kind: EffectKind;
  ticketId: string;
  attempts: number;
  done: boolean;
}

export interface EngineSnapshot {
  policy: Policy;
  tickets: Ticket[];
  observations: { triggerId: string; note: string }[];
  busy: number;
  slots: number;
  pendingNotices: number;
}

export interface Disposition {
  triggerId: string;
  decision: DecisionKind;
  ticketId?: string;
  observed?: boolean;
}

export interface PhaseInput {
  deliveryFailed?: boolean;
  attention?: boolean;
  report?: Report["status"];
  humanAfterReport?: boolean;
  assignment?: "missing" | "pending" | "running";
  waiting?: boolean;
}

/** First matching row wins, in the order fixed by the execution document. */
export function ticketPhase(input: PhaseInput): TicketPhase {
  if (input.deliveryFailed) return "person/delivery";
  if (input.attention) return "person/answer";
  if (input.report === "ready") return "person/review";
  if (
    (input.report === "blocked" || input.report === "failed") &&
    !input.humanAfterReport
  )
    return "person/blocked";
  if (input.assignment === "missing" || input.assignment === "pending")
    return "working/queued";
  if (input.waiting || input.report === "waiting") return "idle";
  return "working";
}

export function stageToTicketPhase(
  status: string,
  approved: boolean,
): TicketPhase {
  if (status === "blocked") return "person/blocked";
  if (status === "result_review") return "person/review";
  if (status === "plan_review") return "person/answer";
  if (status === "doing" && !approved) return "working/queued";
  if (status === "done") return "idle";
  return "working";
}

const STOP = /^(?:停止|取消|终止|中止)\b|\b(?:stop|abort|cancel)\b/i;

export class SuperagentEngine {
  readonly #seen = new Set<string>();
  readonly #tickets = new Map<string, Ticket>();
  readonly #threadTicket = new Map<string, string>();
  readonly #outbox: Effect[] = [];
  #policy: Policy = { version: 1, mode: "observe" };
  #slots = 2;
  #busy = 0;
  #sequence = 0;
  readonly #observations: { triggerId: string; note: string }[] = [];

  constructor(options?: { slots?: number; policy?: Policy }) {
    if (options?.slots) this.#slots = options.slots;
    if (options?.policy) this.#policy = options.policy;
  }

  policy(): Policy {
    return this.#policy;
  }

  setPolicy(policy: Policy): void {
    const previous = this.#policy.version;
    this.#policy = policy;
    if (policy.version === previous) return;
    for (const ticket of this.#tickets.values()) {
      if (ticket.ended || !ticket.assignment) continue;
      this.#enqueue("notice", ticket.id);
    }
  }

  intake(trigger: Trigger): Disposition {
    if (this.#seen.has(trigger.id)) {
      const ticketId = this.#threadTicket.get(trigger.threadId);
      return { triggerId: trigger.id, decision: "ignore", ticketId };
    }
    this.#seen.add(trigger.id);
    const existing = this.#threadTicket.get(trigger.threadId);
    if (existing) {
      const ticket = this.#tickets.get(existing)!;
      if (ticket.ended) this.revalidate(ticket.id);
      ticket.humanMessageAt = Date.now();
      this.#enqueue("reply", ticket.id);
      return { triggerId: trigger.id, decision: "accept", ticketId: ticket.id };
    }
    return this.#evaluate(trigger);
  }

  #evaluate(trigger: Trigger): Disposition {
    const strength: TriggerStrength = STOP.test(trigger.text)
      ? "explicit"
      : trigger.explicit
        ? "explicit"
        : "inferred";
    if (strength === "inferred" && this.#policy.mode === "off")
      return { triggerId: trigger.id, decision: "ignore" };
    if (STOP.test(trigger.text))
      return { triggerId: trigger.id, decision: "stop" };
    if (this.#policy.mode === "observe" && strength === "inferred") {
      this.#observations.push({ triggerId: trigger.id, note: "would accept" });
      return { triggerId: trigger.id, decision: "ignore", observed: true };
    }
    if (this.#busy >= this.#slots)
      return { triggerId: trigger.id, decision: "unavailable" };
    const id = `ticket-${++this.#sequence}`;
    const mandate: Mandate = {
      policyVersion: this.#policy.version,
      scope: trigger.source,
      strength,
      basis: trigger.explicit ? "addressed" : "admission",
      matchedRules:
        strength === "explicit" ? ["explicit-address"] : ["inferred"],
    };
    const ticket: Ticket = {
      id,
      threadId: trigger.threadId,
      phase: "working/queued",
      mandate,
    };
    this.#tickets.set(id, ticket);
    this.#threadTicket.set(trigger.threadId, id);
    this.#enqueue("assessment", id);
    this.#enqueue("launch", id);
    return { triggerId: trigger.id, decision: "accept", ticketId: id };
  }

  assign(ticketId: string): Assignment | undefined {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket || ticket.ended) return undefined;
    const reserved = 1;
    if (
      this.#busy >= this.#slots - reserved &&
      ticket.mandate?.basis !== "followup"
    )
      return undefined;
    if (this.#busy >= this.#slots) return undefined;
    ticket.assignment = { workerId: `worker-${ticket.id}`, state: "pending" };
    ticket.phase = ticketPhase({ assignment: "pending" });
    this.#busy += 1;
    return ticket.assignment;
  }

  report(ticketId: string, status: Report["status"]): Ticket | undefined {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket) return undefined;
    ticket.report = { status, at: Date.now() };
    if (ticket.assignment)
      ticket.assignment.state = status === "waiting" ? "running" : "done";
    if (status !== "waiting" && this.#busy > 0) this.#busy -= 1;
    ticket.ended =
      status === "ready" || status === "failed" || status === "blocked";
    ticket.phase = ticketPhase({
      report: status,
      assignment: ticket.assignment ? "running" : "missing",
      waiting: status === "waiting",
    });
    this.#enqueue(status === "ready" ? "delivery" : "notice", ticket.id);
    return ticket;
  }

  ask(ticketId: string, question: string): void {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket) return;
    ticket.attention = { id: `q-${++this.#sequence}`, question };
    ticket.phase = "person/answer";
  }

  revalidate(ticketId: string): boolean {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket?.mandate) return false;
    const current = ticket.mandate.policyVersion === this.#policy.version;
    if (!current) {
      ticket.mandate = {
        ...ticket.mandate,
        policyVersion: this.#policy.version,
        basis: "followup",
      };
      ticket.ended = false;
      ticket.phase = "working/queued";
      this.#enqueue("assessment", ticket.id);
    }
    return current;
  }

  handback(ticketId: string, text: string): Disposition {
    const ticket = this.#tickets.get(ticketId);
    if (ticket?.assignment && this.#busy > 0) this.#busy -= 1;
    if (ticket) {
      ticket.assignment = undefined;
      ticket.ended = true;
      this.#threadTicket.delete(ticket.threadId);
    }
    return this.intake({
      id: `handback-${++this.#sequence}`,
      threadId: ticket?.threadId ?? ticketId,
      text,
      source: "conversation",
      explicit: true,
    });
  }

  drain(kind?: EffectKind): Effect[] {
    const ready = this.#outbox.filter(
      (effect) => !effect.done && (!kind || effect.kind === kind),
    );
    for (const effect of ready) effect.done = true;
    return ready;
  }

  failEffect(id: string): void {
    const effect = this.#outbox.find((item) => item.id === id);
    if (!effect) return;
    effect.done = false;
    effect.attempts += 1;
  }

  tickets(): Ticket[] {
    return [...this.#tickets.values()];
  }

  observations(): readonly { triggerId: string; note: string }[] {
    return this.#observations;
  }

  occupancy(): { busy: number; slots: number } {
    return { busy: this.#busy, slots: this.#slots };
  }

  snapshot(): EngineSnapshot {
    return {
      policy: this.#policy,
      tickets: this.tickets(),
      observations: [...this.#observations],
      busy: this.#busy,
      slots: this.#slots,
      pendingNotices: this.#outbox.filter(
        (effect) => effect.kind === "notice" && !effect.done,
      ).length,
    };
  }

  restore(saved: EngineSnapshot): void {
    this.#policy = saved.policy;
    this.#busy = saved.busy;
    this.#slots = saved.slots || this.#slots;
    this.#tickets.clear();
    this.#threadTicket.clear();
    this.#observations.splice(
      0,
      this.#observations.length,
      ...(saved.observations ?? []),
    );
    for (const ticket of saved.tickets) {
      this.#tickets.set(ticket.id, ticket);
      this.#threadTicket.set(ticket.threadId, ticket.id);
    }
    this.#sequence = saved.tickets.length + saved.observations.length + 1;
  }

  #enqueue(kind: EffectKind, ticketId: string): void {
    this.#outbox.push({
      id: `fx-${++this.#sequence}`,
      kind,
      ticketId,
      attempts: 0,
      done: false,
    });
  }
}
