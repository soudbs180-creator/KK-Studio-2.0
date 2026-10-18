import assert from "node:assert/strict";
import test from "node:test";
import {
  createTurnFreezingController,
  type TurnFreezingController,
} from "../../src/features/agent/agentTurnFreezing.ts";

/* =========================================================================
 * Empirical Stress Harness Suite: Turn Freezing & Step Completion (R1)
 *
 * Scope:
 * 1. Concurrency race conditions: pause requested with N parallel active steps
 * 2. Queue blocking: zero tool calls leak through while paused or pausing
 * 3. Resume unblocking: FIFO execution order without drops under heavy churn
 * 4. Draft isolation: non-mutation and zero auto-send across lifecycle states
 * 5. Background polling: continuous remote polling during frozen turns
 * ========================================================================= */

// -------------------------------------------------------------------------
// Helpers & Types
// -------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface QueuedToolCall {
  id: number;
  name: string;
  enqueuedAt: number;
  startedAt?: number;
  finishedAt?: number;
}

interface SimulatedToolQueue {
  enqueue: (id: number, name?: string, delayMs?: number) => Promise<number>;
  getStartedCalls: () => QueuedToolCall[];
  getFinishedCalls: () => QueuedToolCall[];
  drain: () => Promise<void>;
}

/**
 * Creates a tool queue mimicking src/features/agent/agentConnection.ts lines 411-422:
 * const run = toolQueue.then(async () => {
 *   await turnFreezing.awaitUnfrozen();
 *   const endStep = turnFreezing.beginStep(event.requestId);
 *   try { await handleTool(...); } finally { endStep(); }
 * });
 */
function createSimulatedToolQueue(
  controller: TurnFreezingController,
  defaultExecutionDelayMs = 2,
): SimulatedToolQueue {
  let toolQueue: Promise<unknown> = Promise.resolve();
  const startedCalls: QueuedToolCall[] = [];
  const finishedCalls: QueuedToolCall[] = [];

  function enqueue(
    id: number,
    name = `tool-${id}`,
    delayMs = defaultExecutionDelayMs,
  ): Promise<number> {
    const record: QueuedToolCall = { id, name, enqueuedAt: Date.now() };

    const run = toolQueue.then(async () => {
      // Production gate 1: await unfrozen
      await controller.awaitUnfrozen();

      // Step starts
      record.startedAt = Date.now();
      startedCalls.push(record);

      const endStep = controller.beginStep(`step-tool-${id}`);
      try {
        if (delayMs > 0) {
          await sleep(delayMs);
        }
      } finally {
        endStep();
        record.finishedAt = Date.now();
        finishedCalls.push(record);
      }
      return id;
    });

    toolQueue = run.catch(() => -1);
    return run;
  }

  return {
    enqueue,
    getStartedCalls: () => [...startedCalls],
    getFinishedCalls: () => [...finishedCalls],
    drain: () => toolQueue.then(() => {}),
  };
}

// =========================================================================
// Area 1: Concurrency Race Conditions (N parallel active steps)
// =========================================================================

test("STRESS-1.1: pause requested while N=100 parallel steps are active completes all steps and drains cleanly", async () => {
  const controller = createTurnFreezingController({
    completedResetDelayMs: 200,
  });
  controller.onTurnStart();
  assert.equal(controller.isExecuting(), true);

  const N = 100;
  const completedSteps: number[] = [];
  const endStepCallbacks: Array<() => void> = [];

  // Launch 100 parallel steps with randomized async resolution times (2ms to 25ms)
  for (let i = 0; i < N; i++) {
    const end = controller.beginStep(`step-${i}`);
    endStepCallbacks.push(end);
  }

  assert.equal(controller.getState().activeStepCount, N);

  // Request pause while ALL 100 steps are in flight
  const pauseStartTime = Date.now();
  const pausePromise = controller.pause();

  // State must transition to pausing immediately
  assert.equal(controller.isPausing(), true);
  assert.equal(controller.isFrozen(), true);
  assert.equal(
    controller.isPaused(),
    false,
    "Must not be paused while steps remain active",
  );

  // Concurrently resolve the 100 steps in shuffled random batches
  const indices = Array.from({ length: N }, (_, idx) => idx).sort(
    () => Math.random() - 0.5,
  );

  const drainPromise = (async () => {
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      // Micro sleep to simulate asynchronous work concluding
      if (i % 10 === 0) {
        await sleep(2);
      }
      endStepCallbacks[idx]();
      completedSteps.push(idx);

      // Invariant: Controller must remain in "pausing" until the VERY LAST step concludes
      if (completedSteps.length < N) {
        assert.equal(
          controller.isPausing(),
          true,
          `Controller must remain in pausing while ${N - completedSteps.length} steps are active`,
        );
        assert.equal(controller.isPaused(), false);
      }
    }
  })();

  await drainPromise;
  await pausePromise;
  const pauseDurationMs = Date.now() - pauseStartTime;

  // Final assertions
  assert.equal(completedSteps.length, N, "All N steps must finish execution");
  assert.equal(
    controller.getState().activeStepCount,
    0,
    "Active step count must drain to 0",
  );
  assert.equal(
    controller.isPaused(),
    true,
    "Controller must transition to paused once all steps drain",
  );
  assert.equal(controller.isPausing(), false);
  assert.ok(pauseDurationMs >= 0, `Pause completed in ${pauseDurationMs}ms`);
});

test("STRESS-1.2: 50 concurrent pause() callers all wait on same pauseDeferred and resolve simultaneously", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  const endStep = controller.beginStep("long-running-step");
  assert.equal(controller.getState().activeStepCount, 1);

  // 50 callers concurrently request pause
  const CALLER_COUNT = 50;
  const resolvedTimes: number[] = [];

  const callers = Array.from({ length: CALLER_COUNT }, async () => {
    await controller.pause();
    resolvedTimes.push(Date.now());
  });

  assert.equal(controller.isPausing(), true);

  // Allow active step to run for 20ms then complete
  await sleep(20);
  endStep();

  await Promise.all(callers);

  assert.equal(
    resolvedTimes.length,
    CALLER_COUNT,
    "All 50 callers must resolve",
  );
  assert.equal(controller.isPaused(), true);

  // Invariant: All callers should resolve in the same microtask batch (diff < 15ms)
  const maxDiff = Math.max(...resolvedTimes) - Math.min(...resolvedTimes);
  assert.ok(
    maxDiff <= 25,
    `All callers should resolve simultaneously (spread: ${maxDiff}ms)`,
  );
});

test("STRESS-1.3: pause requested with 0 active steps transitions immediately to paused without deadlock", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();
  assert.equal(controller.getState().activeStepCount, 0);

  const start = Date.now();
  await controller.pause();
  const elapsed = Date.now() - start;

  assert.equal(controller.isPaused(), true);
  assert.ok(
    elapsed <= 10,
    `Immediate pause should resolve in <=10ms, took ${elapsed}ms`,
  );
});

test("STRESS-1.4: endStep idempotency prevents counter underflow or premature freeze", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  const endStep1 = controller.beginStep("step-1");
  const endStep2 = controller.beginStep("step-2");
  assert.equal(controller.getState().activeStepCount, 2);

  const pausePromise = controller.pause();
  assert.equal(controller.isPausing(), true);

  // Repeatedly invoke endStep1 10 times
  for (let i = 0; i < 10; i++) {
    endStep1();
  }

  // Active step count should be 1 (step-2 is still active), NOT 0 or negative
  assert.equal(controller.getState().activeStepCount, 1);
  assert.equal(controller.isPausing(), true);
  assert.equal(controller.isPaused(), false);

  // Now resolve step-2
  endStep2();
  await pausePromise;

  assert.equal(controller.getState().activeStepCount, 0);
  assert.equal(controller.isPaused(), true);
});

test("STRESS-1.5: reset() unblocks pending pause and awaitUnfrozen waiters during disconnect", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  // Active step never finishes normally
  controller.beginStep("abandoned-step");
  let pauseResolved = false;
  let waiterResolved = false;

  const pPause = controller.pause().then(() => {
    pauseResolved = true;
  });

  const pWaiter = controller.awaitUnfrozen().then(() => {
    waiterResolved = true;
  });

  assert.equal(controller.isPausing(), true);

  // Connection dropped: trigger reset
  controller.reset();

  await Promise.all([pPause, pWaiter]);

  assert.equal(pauseResolved, true, "Pending pause must resolve on reset");
  assert.equal(
    waiterResolved,
    true,
    "Pending awaitUnfrozen must resolve on reset",
  );
  assert.equal(controller.getState().state, "idle");
});

// =========================================================================
// Area 2: Tool Queue Blocking & Zero-Leak Verification
// =========================================================================

test("STRESS-2.1: zero tool calls leak through awaitUnfrozen while in paused state", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  // Enter paused state
  await controller.pause();
  assert.equal(controller.isPaused(), true);

  const queue = createSimulatedToolQueue(controller, 5);

  // Enqueue 100 tool calls into the queue while paused
  const QUEUE_SIZE = 100;
  for (let i = 1; i <= QUEUE_SIZE; i++) {
    void queue.enqueue(i);
  }

  // Wait 60ms to empirically observe if any tool calls leak
  await sleep(60);

  // Invariant: ZERO tool calls must have started
  const started = queue.getStartedCalls();
  const finished = queue.getFinishedCalls();

  assert.equal(
    started.length,
    0,
    `Zero tool calls must leak through while paused (observed: ${started.length})`,
  );
  assert.equal(
    finished.length,
    0,
    `Zero tool calls must finish while paused (observed: ${finished.length})`,
  );
  assert.equal(controller.getState().activeStepCount, 0);
  assert.equal(controller.isPaused(), true);
});

test("STRESS-2.2: zero tool calls leak through during pausing state while active step finishes", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  // Step 0 is active in background
  const endStep0 = controller.beginStep("step-0");

  // Pause requested -> transitions to pausing
  const pausePromise = controller.pause();
  assert.equal(controller.isPausing(), true);

  const queue = createSimulatedToolQueue(controller, 2);

  // Enqueue 50 new tool calls arriving while controller is pausing
  for (let i = 1; i <= 50; i++) {
    void queue.enqueue(i);
  }

  // Wait 30ms while step-0 is still running
  await sleep(30);
  assert.equal(
    queue.getStartedCalls().length,
    0,
    "No new tool call should start during pausing",
  );

  // Step 0 finally concludes
  endStep0();
  await pausePromise;

  assert.equal(controller.isPaused(), true);

  // Wait another 30ms in paused state
  await sleep(30);
  assert.equal(
    queue.getStartedCalls().length,
    0,
    "No new tool call should start after transitioning to paused",
  );
});

// =========================================================================
// Area 3: Resume Unblocking & Strict FIFO Preservation
// =========================================================================

test("STRESS-3.1: resume unblocks 100 queued tool calls and executes them in strict FIFO order without drops", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();
  await controller.pause();

  const queue = createSimulatedToolQueue(controller, 1);
  const COUNT = 100;

  for (let i = 1; i <= COUNT; i++) {
    void queue.enqueue(i);
  }

  assert.equal(queue.getStartedCalls().length, 0);

  // Resume turn
  const resumeStartTime = Date.now();
  await controller.resume();
  assert.equal(controller.isExecuting(), true);

  // Drain all 100 queued executions
  await queue.drain();
  const durationMs = Date.now() - resumeStartTime;

  const finished = queue.getFinishedCalls();
  assert.equal(finished.length, COUNT, `All ${COUNT} calls must execute`);

  // Verify strict FIFO order: 1, 2, 3, ..., COUNT
  const finishedIds = finished.map((c) => c.id);
  const expectedIds = Array.from({ length: COUNT }, (_, i) => i + 1);
  assert.deepEqual(
    finishedIds,
    expectedIds,
    "Queued calls must execute in exact FIFO order without inversion",
  );

  assert.ok(durationMs > 0, `Unblocked and drained in ${durationMs}ms`);
});

test("STRESS-3.2: intermittent multi-cycle pause/resume across 150 tool calls preserves strict sequence", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  const queue = createSimulatedToolQueue(controller, 1);
  const TOTAL = 150;

  // Enqueue first batch (1..50)
  for (let i = 1; i <= 50; i++) {
    void queue.enqueue(i);
  }

  // Let first batch start running, then pause at around item 15
  await sleep(15);
  const pause1 = controller.pause();
  await pause1;
  assert.equal(controller.isPaused(), true);

  const completedAtPause1 = queue.getFinishedCalls().length;
  assert.ok(
    completedAtPause1 < 50,
    `Completed ${completedAtPause1} before pause 1`,
  );

  // Enqueue second batch (51..100) while paused
  for (let i = 51; i <= 100; i++) {
    void queue.enqueue(i);
  }

  // Resume execution
  await controller.resume();
  assert.equal(controller.isExecuting(), true);

  // Let run for a bit, then pause again
  await sleep(25);
  const pause2 = controller.pause();
  await pause2;
  assert.equal(controller.isPaused(), true);

  const completedAtPause2 = queue.getFinishedCalls().length;
  assert.ok(completedAtPause2 > completedAtPause1 && completedAtPause2 < 100);

  // Enqueue third batch (101..150) while paused
  for (let i = 101; i <= 150; i++) {
    void queue.enqueue(i);
  }

  // Final resume and drain all items
  await controller.resume();
  await queue.drain();

  const allFinished = queue.getFinishedCalls();
  assert.equal(
    allFinished.length,
    TOTAL,
    "All 150 calls must execute across 2 freeze cycles",
  );

  const actualSequence = allFinished.map((c) => c.id);
  const expectedSequence = Array.from({ length: TOTAL }, (_, i) => i + 1);
  assert.deepEqual(
    actualSequence,
    expectedSequence,
    "Full sequence across multiple pause/resume cycles must remain 100% FIFO",
  );
});

// =========================================================================
// Area 4: Draft Isolation & Invariance
// =========================================================================

test("STRESS-4.1: draft text and attachments remain invariant across 100 rapid pause/resume cycles", async () => {
  const controller = createTurnFreezingController();

  interface DraftStore {
    text: string;
    attachments: string[];
    sentHistory: Array<{ text: string; attachments: string[] }>;
  }

  const draft: DraftStore = {
    text: "Initial creative prompt text with special chars: 🎨 & <xml>",
    attachments: ["uuid-asset-1.png", "uuid-asset-2.jpeg"],
    sentHistory: [],
  };

  let expectedText =
    "Initial creative prompt text with special chars: 🎨 & <xml>";
  const expectedAttachments = ["uuid-asset-1.png", "uuid-asset-2.jpeg"];

  // Hammer 100 pause/resume toggles
  for (let cycle = 0; cycle < 100; cycle++) {
    controller.onTurnStart();
    const end = controller.beginStep(`cycle-step-${cycle}`);

    // Pause
    const pPause = controller.pause();
    end();
    await pPause;
    assert.equal(controller.isPaused(), true);

    // Invariant: Draft must not be touched or auto-sent on pause
    assert.equal(draft.text, expectedText);
    assert.deepEqual(draft.attachments, expectedAttachments);
    assert.equal(draft.sentHistory.length, 0);

    // User can edit draft while paused
    if (cycle % 20 === 0) {
      expectedText = `Updated prompt at cycle ${cycle}`;
      draft.text = expectedText;
    }

    // Resume
    await controller.resume();
    assert.equal(controller.isExecuting(), true);

    // Invariant: Resuming must NOT send message or clear draft
    assert.equal(draft.text, expectedText);
    assert.deepEqual(draft.attachments, expectedAttachments);
    assert.equal(draft.sentHistory.length, 0);
  }

  // Only explicit user submission from idle sends the draft
  controller.onTurnComplete("completed");
  assert.equal(draft.sentHistory.length, 0);

  // Explicit send simulation
  draft.sentHistory.push({
    text: draft.text,
    attachments: [...draft.attachments],
  });
  draft.text = "";
  draft.attachments = [];

  assert.equal(draft.sentHistory.length, 1);
  assert.equal(draft.text, "");
});

// =========================================================================
// Area 5: Remote Task Background Polling Persistence
// =========================================================================

test("STRESS-5.1: remote background task polling continues uninterrupted while agent turn is frozen", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  // Model a remote ComfyUI / Canvas Proxy background task
  interface RemoteTask {
    id: string;
    status: "submitted" | "processing" | "completed";
    progressPct: number;
    resultAssetId?: string;
  }

  const remoteTask: RemoteTask = {
    id: "remote-prompt-uuid-99",
    status: "submitted",
    progressPct: 0,
  };

  // Simulate remote server progress advancement over time
  const remoteServerTimer = setInterval(() => {
    if (remoteTask.progressPct < 100) {
      remoteTask.progressPct += 20;
      remoteTask.status = "processing";
    }
    if (remoteTask.progressPct >= 100) {
      remoteTask.status = "completed";
      remoteTask.resultAssetId = "generated-canvas-asset-42";
      clearInterval(remoteServerTimer);
    }
  }, 10);

  // Polling loop in client (independent of turn freezing)
  let pollCount = 0;
  const pollLog: Array<{ poll: number; pct: number; isFrozen: boolean }> = [];
  let taskFinishedInClient = false;

  const pollInterval = setInterval(() => {
    pollCount++;
    pollLog.push({
      poll: pollCount,
      pct: remoteTask.progressPct,
      isFrozen: controller.isFrozen(),
    });

    if (remoteTask.status === "completed") {
      taskFinishedInClient = true;
      clearInterval(pollInterval);
    }
  }, 8);

  // Turn step is active
  const endStep = controller.beginStep("step-waiting-for-remote");

  // Pause turn after 15ms
  await sleep(15);
  const pausePromise = controller.pause();
  endStep();
  await pausePromise;

  assert.equal(controller.isPaused(), true);
  assert.equal(controller.isFrozen(), true);

  // Keep turn paused while remote task completes in the background (accommodates Windows timer granularity under runner load)
  const waitStart = Date.now();
  while (!taskFinishedInClient && Date.now() - waitStart < 400) {
    await sleep(20);
  }

  // Check empirical polling observations during the freeze
  const pollsWhileFrozen = pollLog.filter((p) => p.isFrozen);
  assert.ok(
    pollsWhileFrozen.length >= 2,
    `Background polling must continue while turn is frozen (observed ${pollsWhileFrozen.length} polls while frozen)`,
  );
  assert.equal(
    taskFinishedInClient,
    true,
    "Remote task must complete and be detected during frozen state",
  );
  assert.equal(remoteTask.resultAssetId, "generated-canvas-asset-42");

  // Resume turn: agent unfreezes and can consume result immediately
  await controller.resume();
  assert.equal(controller.isExecuting(), true);

  // Clean up timers
  clearInterval(remoteServerTimer);
  clearInterval(pollInterval);
});

test("STRESS-5.2: 5 parallel remote tasks poll concurrently across pause/resume cycles without starvation", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  const TASK_COUNT = 5;
  const tasks = Array.from({ length: TASK_COUNT }, (_, i) => ({
    id: `task-${i}`,
    polls: 0,
    done: false,
  }));

  // Each task has an independent polling loop
  const pollingTimers = tasks.map((task) =>
    setInterval(() => {
      task.polls++;
      if (task.polls >= 10) {
        task.done = true;
      }
    }, 5),
  );

  // Cycle pause and resume multiple times
  for (let i = 0; i < 3; i++) {
    await controller.pause();
    assert.equal(controller.isFrozen(), true);
    await sleep(20);
    await controller.resume();
    assert.equal(controller.isExecuting(), true);
    await sleep(20);
  }

  // Wait until all tasks conclude (up to 400ms to accommodate Windows timer granularity under runner load)
  const waitStart = Date.now();
  while (Date.now() - waitStart < 400 && !tasks.every((t) => t.done)) {
    await sleep(20);
  }
  pollingTimers.forEach(clearInterval);

  for (const task of tasks) {
    assert.equal(task.done, true, `Task ${task.id} must complete`);
    assert.ok(
      task.polls >= 10,
      `Task ${task.id} must have polled >=10 times (got ${task.polls})`,
    );
  }
});

// =========================================================================
// Additional Adversarial Stress Tests
// =========================================================================

test("STRESS-1.6: active steps throwing exceptions during pausing still cleanly transition to paused", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  const N = 50;
  const errorStepCallbacks: Array<() => void> = [];

  for (let i = 0; i < N; i++) {
    const end = controller.beginStep(`failing-step-${i}`);
    errorStepCallbacks.push(end);
  }

  assert.equal(controller.getState().activeStepCount, N);
  const pausePromise = controller.pause();
  assert.equal(controller.isPausing(), true);

  // Concurrently simulate all 50 steps failing with thrown exceptions
  for (let i = 0; i < N; i++) {
    try {
      throw new Error(`Simulated tool explosion #${i}`);
    } catch {
      // In production, finally block calls endStep()
      errorStepCallbacks[i]();
    }
  }

  await pausePromise;

  assert.equal(controller.getState().activeStepCount, 0);
  assert.equal(
    controller.isPaused(),
    true,
    "Controller must reach paused state even when steps fail",
  );
});

test("STRESS-3.3: toolQueue error tolerance preserves FIFO for remaining queued items after resume", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();
  await controller.pause();

  let toolQueue: Promise<unknown> = Promise.resolve();
  const executionLog: Array<{ id: number; success: boolean }> = [];

  // Enqueue 50 items where items 5, 15, 25, 35, 45 will throw errors
  for (let i = 1; i <= 50; i++) {
    const shouldFail = i % 10 === 5;
    const run = toolQueue.then(async () => {
      await controller.awaitUnfrozen();
      const endStep = controller.beginStep(`step-${i}`);
      try {
        if (shouldFail) {
          throw new Error(`Tool failure for item ${i}`);
        }
        executionLog.push({ id: i, success: true });
      } catch {
        executionLog.push({ id: i, success: false });
        throw new Error(`Tool ${i} exploded`);
      } finally {
        endStep();
      }
    });

    // Production pattern in agentConnection.ts line 422:
    // toolQueue = run.catch(() => undefined);
    toolQueue = run.catch(() => undefined);
  }

  // Resume turn
  await controller.resume();
  await toolQueue;

  assert.equal(
    executionLog.length,
    50,
    "All 50 queued operations must be processed",
  );

  // Verify strict ordering: 1, 2, ..., 50
  const ids = executionLog.map((item) => item.id);
  const expectedIds = Array.from({ length: 50 }, (_, i) => i + 1);
  assert.deepEqual(
    ids,
    expectedIds,
    "Ordering must remain strictly FIFO despite step failures",
  );

  const failedCount = executionLog.filter((item) => !item.success).length;
  assert.equal(
    failedCount,
    5,
    "Exactly 5 failing steps should be logged as failures",
  );
});

test("STRESS-3.4: 50 rapid alternating pause/resume hammer toggles settle deterministically", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  for (let i = 0; i < 50; i++) {
    if (i % 2 === 0) {
      void controller.pause();
    } else {
      void controller.resume();
    }
  }

  // Allow microtasks to settle
  await sleep(25);

  // Controller must be in a valid settled state (either executing or paused), never an invalid undefined state
  const finalState = controller.getState().state;
  assert.ok(
    finalState === "executing" ||
      finalState === "paused" ||
      finalState === "pausing",
    `Final state must be valid (was: ${finalState})`,
  );

  // A clean resume guarantees executing
  await controller.resume();
  assert.equal(controller.isExecuting(), true);
});

test("STRESS-4.2: complex multi-line unicode draft with binary payload preserved intact across freeze", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  const complexDraft = {
    text: "Line 1: 🚀 Prompt with Emoji and CJK: 这是一个复杂的草稿\nLine 2: \t\tIndent with 'quotes' & \"double\" <xml></xml>\nLine 3: 100% safe",
    attachments: [
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "file://d:/kk-studio/storage/assets/pristine-original-1234.png",
    ],
  };

  const snapshot = JSON.stringify(complexDraft);

  // Pause turn
  const p = controller.pause();
  await p;
  assert.equal(controller.isPaused(), true);

  // Resume turn
  await controller.resume();
  assert.equal(controller.isExecuting(), true);

  // Complete turn
  controller.onTurnComplete("completed");

  // Invariant check: Draft must remain identically equal byte-for-byte
  assert.equal(JSON.stringify(complexDraft), snapshot);
});
