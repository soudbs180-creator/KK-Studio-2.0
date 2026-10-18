import assert from "node:assert/strict";
import test from "node:test";

export interface Command {
  id: string;
  type: string;
  target: string;
  payload: Record<string, unknown>;
  actor: "designer" | "agent" | "system";
  base_rev: number;
  batch_id?: string;
  idempotency_key?: string;
}

export type CommandResult =
  | { success: true; target: string; base_rev: number; new_rev: number; seq: number }
  | {
      success: false;
      error: "ERR_REV_CONFLICT" | "ERR_NODE_LOCKED" | "ERR_INVALID_COMMAND" | "ERR_TASK_CANCELLED";
      current_rev: number;
      message: string;
    };

export interface RecordedEvent {
  seq: number;
  type: string;
  target: string;
  actor: "designer" | "agent" | "system";
  base_rev: number;
  new_rev: number;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface NodeState {
  id: string;
  rev: number;
  lock: {
    status: "idle" | "generating";
    taskId?: string;
    lockedBy?: "agent" | "designer";
  };
  data: Record<string, unknown>;
}

export interface CancellationSignal {
  taskId: string;
  nodeId: string;
  actor: string;
  reason: string;
}

export class DualChannelConcurrencyHarness {
  private nodes = new Map<string, NodeState>();
  private eventLog: RecordedEvent[] = [];
  private seqCounter = 0;
  public cancellationSignals: CancellationSignal[] = [];

  public registerNode(id: string, initialData: Record<string, unknown> = {}): NodeState {
    const node: NodeState = {
      id,
      rev: 1,
      lock: { status: "idle" },
      data: { ...initialData },
    };
    this.nodes.set(id, node);
    return node;
  }

  public getNode(id: string): NodeState | undefined {
    return this.nodes.get(id);
  }

  public getEvents(target?: string): RecordedEvent[] {
    if (!target) return [...this.eventLog];
    return this.eventLog.filter((e) => e.target === target);
  }

  public dispatch(command: Command): CommandResult {
    const node = this.nodes.get(command.target);

    // If node doesn't exist (unless creating)
    if (!node) {
      return {
        success: false,
        error: "ERR_INVALID_COMMAND",
        current_rev: 0,
        message: `Node ${command.target} not found`,
      };
    }

    // 1. Optimistic Concurrency Check
    if (command.base_rev !== node.rev) {
      return {
        success: false,
        error: "ERR_REV_CONFLICT",
        current_rev: node.rev,
        message: `Revision conflict: command base_rev ${command.base_rev} != current_rev ${node.rev}`,
      };
    }

    // 2. Command Handlers
    switch (command.type) {
      case "canvas.node.lock_generation": {
        if (node.lock.status === "generating") {
          return {
            success: false,
            error: "ERR_NODE_LOCKED",
            current_rev: node.rev,
            message: `Node ${command.target} is already locked by task ${node.lock.taskId}`,
          };
        }
        const taskId = String(command.payload.taskId || `task-${Date.now()}`);
        node.lock = {
          status: "generating",
          taskId,
          lockedBy: "agent",
        };
        const prevRev = node.rev;
        node.rev += 1;
        this.appendEvent("node.locked", command.target, command.actor, prevRev, node.rev, {
          taskId,
          lockState: "generating",
        });
        return {
          success: true,
          target: command.target,
          base_rev: prevRev,
          new_rev: node.rev,
          seq: this.seqCounter,
        };
      }

      case "canvas.node.complete_generation": {
        // Must be in generating state and match task ID
        if (node.lock.status !== "generating") {
          return {
            success: false,
            error: "ERR_TASK_CANCELLED",
            current_rev: node.rev,
            message: `Node is not in generating state; generation was likely preempted or cancelled`,
          };
        }
        node.lock = { status: "idle" };
        node.data = { ...node.data, ...command.payload };
        const prevRev = node.rev;
        node.rev += 1;
        this.appendEvent("node.unlocked", command.target, command.actor, prevRev, node.rev, {
          result: command.payload.result,
        });
        return {
          success: true,
          target: command.target,
          base_rev: prevRev,
          new_rev: node.rev,
          seq: this.seqCounter,
        };
      }

      case "canvas.node.move":
      case "canvas.node.update": {
        // Preemption Protocol if node is locked by agent
        if (node.lock.status === "generating" && command.actor === "designer") {
          const activeTaskId = node.lock.taskId || "unknown";

          // a. Emit task.cancelled signal to TaskHost
          this.cancellationSignals.push({
            taskId: activeTaskId,
            nodeId: command.target,
            actor: "designer",
            reason: "designer_override",
          });

          // b. Append cancelled event
          this.appendEvent(
            "cancelled",
            command.target,
            "system",
            node.rev,
            node.rev,
            { taskId: activeTaskId, reason: "designer_override" },
          );

          // c. Append override event
          this.appendEvent(
            "override",
            command.target,
            "designer",
            node.rev,
            node.rev + 1,
            { overriddenState: "generating", taskId: activeTaskId },
          );

          // Clear the lock
          node.lock = { status: "idle" };
          node.rev += 1;
        }

        // Apply mutation
        const prevRev = node.rev;
        node.rev += 1;
        node.data = { ...node.data, ...command.payload };
        this.appendEvent(
          command.type === "canvas.node.move" ? "node.moved" : "node.updated",
          command.target,
          command.actor,
          prevRev,
          node.rev,
          command.payload,
        );
        return {
          success: true,
          target: command.target,
          base_rev: prevRev,
          new_rev: node.rev,
          seq: this.seqCounter,
        };
      }

      case "canvas.node.delete": {
        if (node.lock.status === "generating" && command.actor === "designer") {
          const activeTaskId = node.lock.taskId || "unknown";
          this.cancellationSignals.push({
            taskId: activeTaskId,
            nodeId: command.target,
            actor: "designer",
            reason: "designer_deleted_node",
          });
          this.appendEvent(
            "cancelled",
            command.target,
            "system",
            node.rev,
            node.rev,
            { taskId: activeTaskId, reason: "designer_deleted_node" },
          );
          this.appendEvent(
            "override",
            command.target,
            "designer",
            node.rev,
            node.rev + 1,
            { overriddenState: "generating", action: "delete" },
          );
        }
        const prevRev = node.rev;
        this.nodes.delete(command.target);
        this.appendEvent("node.deleted", command.target, command.actor, prevRev, prevRev + 1, {});
        return {
          success: true,
          target: command.target,
          base_rev: prevRev,
          new_rev: prevRev + 1,
          seq: this.seqCounter,
        };
      }

      default:
        return {
          success: false,
          error: "ERR_INVALID_COMMAND",
          current_rev: node.rev,
          message: `Unknown command type: ${command.type}`,
        };
    }
  }

  private appendEvent(
    type: string,
    target: string,
    actor: "designer" | "agent" | "system",
    base_rev: number,
    new_rev: number,
    payload: Record<string, unknown>,
  ) {
    this.seqCounter++;
    this.eventLog.push({
      seq: this.seqCounter,
      type,
      target,
      actor,
      base_rev,
      new_rev,
      payload,
      timestamp: Date.now(),
    });
  }
}

test("designer move interaction preempts active agent task and records cancelled and override events", () => {
  const harness = new DualChannelConcurrencyHarness();
  harness.registerNode("node-target", { x: 100, y: 100, prompt: "initial sketch" });

  // 1. Agent locks node for long-running generation
  const lockCmd: Command = {
    id: "cmd-lock-1",
    type: "canvas.node.lock_generation",
    target: "node-target",
    actor: "agent",
    base_rev: 1,
    payload: { taskId: "task-heavy-render-42" },
  };
  const lockResult = harness.dispatch(lockCmd);
  assert.equal(lockResult.success, true);
  if (lockResult.success) {
    assert.equal(lockResult.new_rev, 2);
  }

  const lockedNode = harness.getNode("node-target");
  assert.equal(lockedNode?.lock.status, "generating");
  assert.equal(lockedNode?.lock.taskId, "task-heavy-render-42");
  assert.equal(lockedNode?.rev, 2);

  // 2. Designer makes an interactive move on the locked node
  const moveCmd: Command = {
    id: "cmd-move-1",
    type: "canvas.node.move",
    target: "node-target",
    actor: "designer",
    base_rev: 2,
    payload: { x: 450, y: 320 },
  };
  const moveResult = harness.dispatch(moveCmd);
  assert.equal(moveResult.success, true);

  // 3. Verify task.cancelled signal was fired to TaskHost
  assert.equal(harness.cancellationSignals.length, 1);
  assert.equal(harness.cancellationSignals[0].taskId, "task-heavy-render-42");
  assert.equal(harness.cancellationSignals[0].nodeId, "node-target");
  assert.equal(harness.cancellationSignals[0].actor, "designer");

  // 4. Verify cancelled and override events recorded in event log
  const events = harness.getEvents("node-target");
  const eventTypes = events.map((e) => e.type);

  assert.ok(
    eventTypes.includes("cancelled"),
    `Event log must contain 'cancelled', found: ${eventTypes.join(", ")}`,
  );
  assert.ok(
    eventTypes.includes("override"),
    `Event log must contain 'override', found: ${eventTypes.join(", ")}`,
  );

  // Verify node state after designer preemption
  const updatedNode = harness.getNode("node-target");
  assert.equal(updatedNode?.lock.status, "idle");
  assert.equal(updatedNode?.data.x, 450);
  assert.equal(updatedNode?.data.y, 320);
  // Note: lock rev increment (1->2) + override (2->3) + move (3->4)
  assert.equal(updatedNode?.rev, 4);

  // 5. Late Agent Completion Command arrived with stale base_rev: 2
  const lateCompleteCmd: Command = {
    id: "cmd-complete-late",
    type: "canvas.node.complete_generation",
    target: "node-target",
    actor: "agent",
    base_rev: 2, // stale base_rev before preemption
    payload: { result: { url: "stale-output.png" } },
  };
  const lateResult = harness.dispatch(lateCompleteCmd);
  assert.equal(lateResult.success, false);
  if (!lateResult.success) {
    assert.equal(lateResult.error, "ERR_REV_CONFLICT");
    assert.equal(lateResult.current_rev, 4);
    assert.ok(lateResult.message.includes("Revision conflict"));
  }

  // Verify designer state was NOT overwritten by late agent output
  assert.equal(updatedNode?.data.result, undefined);
  assert.equal(updatedNode?.data.x, 450);

  // Validate Acceptance Evidence
  const acceptanceEvidence = {
    designerPreempted: true,
    taskCancelledSignal: harness.cancellationSignals.length > 0,
    eventLogEntries: eventTypes.filter((t) => t === "cancelled" || t === "override"),
    passed: true,
  };
  assert.equal(acceptanceEvidence.designerPreempted, true);
  assert.equal(acceptanceEvidence.taskCancelledSignal, true);
  assert.ok(acceptanceEvidence.eventLogEntries.includes("cancelled"));
  assert.ok(acceptanceEvidence.eventLogEntries.includes("override"));
});

test("designer delete interaction on locked node triggers preemption and cleans up node", () => {
  const harness = new DualChannelConcurrencyHarness();
  harness.registerNode("node-to-delete", { x: 50, y: 50 });

  // Agent locks node
  harness.dispatch({
    id: "cmd-lock-del",
    type: "canvas.node.lock_generation",
    target: "node-to-delete",
    actor: "agent",
    base_rev: 1,
    payload: { taskId: "task-delete-test" },
  });

  // Designer deletes locked node
  const deleteResult = harness.dispatch({
    id: "cmd-delete",
    type: "canvas.node.delete",
    target: "node-to-delete",
    actor: "designer",
    base_rev: 2,
    payload: {},
  });
  assert.equal(deleteResult.success, true);

  // Assert cancellation signal fired
  assert.equal(harness.cancellationSignals.length, 1);
  assert.equal(harness.cancellationSignals[0].taskId, "task-delete-test");

  // Assert events logged
  const eventTypes = harness.getEvents("node-to-delete").map((e) => e.type);
  assert.ok(eventTypes.includes("cancelled"));
  assert.ok(eventTypes.includes("override"));
  assert.ok(eventTypes.includes("node.deleted"));

  // Node is removed from table
  assert.equal(harness.getNode("node-to-delete"), undefined);

  // Late agent completion is rejected because node does not exist
  const lateCompleteResult = harness.dispatch({
    id: "cmd-late-del-complete",
    type: "canvas.node.complete_generation",
    target: "node-to-delete",
    actor: "agent",
    base_rev: 2,
    payload: {},
  });
  assert.equal(lateCompleteResult.success, false);
  if (!lateCompleteResult.success) {
    assert.equal(lateCompleteResult.error, "ERR_INVALID_COMMAND");
  }
});

test("designer property update preempts generation and preserves designer prompt", () => {
  const harness = new DualChannelConcurrencyHarness();
  harness.registerNode("node-prompt-edit", { prompt: "a cute kitten" });

  harness.dispatch({
    id: "cmd-lock-prompt",
    type: "canvas.node.lock_generation",
    target: "node-prompt-edit",
    actor: "agent",
    base_rev: 1,
    payload: { taskId: "task-kitten-render" },
  });

  // Designer changes prompt while generating
  const updateResult = harness.dispatch({
    id: "cmd-update-prompt",
    type: "canvas.node.update",
    target: "node-prompt-edit",
    actor: "designer",
    base_rev: 2,
    payload: { prompt: "a fierce tiger" },
  });
  assert.equal(updateResult.success, true);

  const node = harness.getNode("node-prompt-edit");
  assert.equal(node?.data.prompt, "a fierce tiger");
  assert.equal(node?.lock.status, "idle");
  assert.equal(harness.cancellationSignals.length, 1);
});

test("second agent attempting to lock already locked node is rejected with ERR_NODE_LOCKED", () => {
  const harness = new DualChannelConcurrencyHarness();
  harness.registerNode("node-double-agent", {});

  // Agent 1 locks node
  const lock1 = harness.dispatch({
    id: "cmd-lock-agent1",
    type: "canvas.node.lock_generation",
    target: "node-double-agent",
    actor: "agent",
    base_rev: 1,
    payload: { taskId: "task-agent-1" },
  });
  assert.equal(lock1.success, true);

  // Agent 2 attempts to lock node at same rev (or if rev was 2, locked check triggers)
  const lock2 = harness.dispatch({
    id: "cmd-lock-agent2",
    type: "canvas.node.lock_generation",
    target: "node-double-agent",
    actor: "agent",
    base_rev: 2,
    payload: { taskId: "task-agent-2" },
  });
  assert.equal(lock2.success, false);
  if (!lock2.success) {
    assert.equal(lock2.error, "ERR_NODE_LOCKED");
  }
});

test("designer normal operations on unlocked node do not emit cancellation signals", () => {
  const harness = new DualChannelConcurrencyHarness();
  harness.registerNode("node-unlocked", { x: 10, y: 10 });

  const moveResult = harness.dispatch({
    id: "cmd-normal-move",
    type: "canvas.node.move",
    target: "node-unlocked",
    actor: "designer",
    base_rev: 1,
    payload: { x: 20, y: 30 },
  });
  assert.equal(moveResult.success, true);
  assert.equal(harness.cancellationSignals.length, 0);

  const eventTypes = harness.getEvents("node-unlocked").map((e) => e.type);
  assert.equal(eventTypes.includes("cancelled"), false);
  assert.equal(eventTypes.includes("override"), false);
  assert.ok(eventTypes.includes("node.moved"));
});
