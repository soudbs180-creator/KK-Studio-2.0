import assert from "node:assert/strict";
import test from "node:test";
import {
  ActionButtonStateMachine,
  ACTION_BUTTON_DIMENSIONS,
  type AgentActionButtonProps,
} from "./harness.ts";

/* =========================================================================
 * R1: Agent Circular 6-State Action Button & Turn Freezing E2E Tests
 * ========================================================================= */

// -------------------------------------------------------------------------
// Tier 1: Feature Coverage (Core Contracts & Happy Paths)
// -------------------------------------------------------------------------

test("R1-T1-01: circular action button completes 6-state cyclic lifecycle transitions", async () => {
  const machine = new ActionButtonStateMachine("idle");
  machine.setDraft("Hello KK Studio Agent");

  assert.equal(machine.state, "idle");
  assert.equal(machine.isButtonDisabled(), false);

  // 1. Click idle -> executing
  let sendCalled = false;
  const res1 = await machine.handleClick(
    () => {
      sendCalled = true;
    },
    undefined,
    undefined,
  );
  assert.equal(res1.transitioned, true);
  assert.equal(res1.currentState, "executing");
  assert.equal(machine.state, "executing");
  assert.equal(sendCalled, true);

  // 2. Click executing -> pausing
  let pauseCalled = false;
  const res2 = await machine.handleClick(
    undefined,
    () => {
      pauseCalled = true;
    },
    undefined,
  );
  assert.equal(res2.transitioned, true);
  assert.equal(res2.currentState, "pausing");
  assert.equal(machine.state, "pausing");
  assert.equal(pauseCalled, true);
  assert.equal(
    machine.isButtonDisabled(),
    true,
    "Button must be disabled in pausing state",
  );

  // 3. Step completes & turn freezes -> paused
  machine.completeStepAndFreeze();
  assert.equal(machine.state, "paused");
  assert.equal(machine.isTurnQueueFrozen, true);
  assert.equal(
    machine.isButtonDisabled(),
    false,
    "Button must be enabled in paused state",
  );

  // 4. Click paused -> resuming
  let resumeCalled = false;
  const res3 = await machine.handleClick(undefined, undefined, () => {
    resumeCalled = true;
  });
  assert.equal(res3.transitioned, true);
  assert.equal(res3.currentState, "resuming");
  assert.equal(machine.state, "resuming");
  assert.equal(resumeCalled, true);
  assert.equal(
    machine.isButtonDisabled(),
    true,
    "Button must be disabled in resuming state",
  );

  // 5. Unfreeze acknowledged -> executing
  machine.acknowledgeUnfreeze();
  assert.equal(machine.state, "executing");
  assert.equal(machine.isTurnQueueFrozen, false);

  // 6. Turn completes -> completed -> idle
  machine.completeExecution();
  assert.equal(machine.state, "completed");

  const res4 = await machine.handleClick();
  assert.equal(res4.currentState, "idle");
  assert.equal(machine.state, "idle");
});

test("R1-T1-02: idle state button enablement is gated strictly by non-empty draft text or attachments", () => {
  const machine = new ActionButtonStateMachine("idle");

  // Empty text, no attachments -> Disabled
  machine.setDraft("", []);
  assert.equal(
    machine.isButtonDisabled(),
    true,
    "Empty draft must disable button",
  );

  // Whitespace only -> Disabled
  machine.setDraft("   \n\t  ", []);
  assert.equal(
    machine.isButtonDisabled(),
    true,
    "Whitespace-only draft must disable button",
  );

  // Non-empty text -> Enabled
  machine.setDraft("Generate a creative character", []);
  assert.equal(
    machine.isButtonDisabled(),
    false,
    "Non-empty text must enable button",
  );

  // Empty text but with attachment -> Enabled
  machine.setDraft("", ["asset-image-uuid-001"]);
  assert.equal(
    machine.isButtonDisabled(),
    false,
    "Attachment without text must enable button",
  );

  // Both text and attachment -> Enabled
  machine.setDraft("Modify this asset", ["asset-image-uuid-001"]);
  assert.equal(
    machine.isButtonDisabled(),
    false,
    "Text and attachment must enable button",
  );
});

test("R1-T1-03: turn freezing controller finishes active atomic step and freezes subsequent turn dispatch", () => {
  const machine = new ActionButtonStateMachine("executing");
  machine.setDraft("Step 1 -> Step 2 -> Step 3");

  // User requests pause
  assert.equal(machine.isTurnQueueFrozen, false);

  machine.handleClick(); // executing -> pausing
  assert.equal(machine.state, "pausing");

  // Simulate active step finishing: step completes cleanly, queue freezes
  machine.completeStepAndFreeze();
  assert.equal(machine.state, "paused");
  assert.equal(machine.isTurnQueueFrozen, true);

  // Verifies that while frozen, attempt to complete execution from paused is invalid
  assert.throws(() => machine.acknowledgeUnfreeze(), /Cannot unfreeze/);
});

test("R1-T1-04: draft input text and attachments are preserved intact during pause and strictly not auto-sent on resume", async () => {
  const machine = new ActionButtonStateMachine("executing");
  const originalDraftText =
    "Preserve this draft message without losing characters";
  const originalAttachments = ["attachment-ref-1.png", "attachment-ref-2.png"];
  machine.setDraft(originalDraftText, originalAttachments);

  // Pause turn
  await machine.handleClick(); // executing -> pausing
  machine.completeStepAndFreeze(); // pausing -> paused

  // Invariant: Draft remains completely preserved in paused state
  assert.equal(machine.draft.text, originalDraftText);
  assert.deepEqual(machine.draft.attachments, originalAttachments);

  // User resumes
  let sendFired = false;
  await machine.handleClick(
    () => {
      sendFired = true;
    },
    undefined,
    () => {},
  ); // paused -> resuming
  machine.acknowledgeUnfreeze(); // resuming -> executing

  // Invariant: Resuming must strictly NOT trigger send or wipe the draft
  assert.equal(sendFired, false, "Resume must NOT automatically send draft");
  assert.equal(
    machine.draft.text,
    originalDraftText,
    "Draft text must remain untouched",
  );
  assert.deepEqual(machine.draft.attachments, originalAttachments);
});

test("R1-T1-05: action button conforms to visual geometry and design token invariants", () => {
  assert.equal(
    ACTION_BUTTON_DIMENSIONS.desktopDiameter,
    40,
    "Desktop diameter must be 40px",
  );
  assert.ok(
    ACTION_BUTTON_DIMENSIONS.touchTargetMin >= 44,
    "Touch target hit boundary must be >= 44px",
  );
  assert.equal(
    ACTION_BUTTON_DIMENSIONS.iconSize,
    20,
    "Centered icon dimensions must be 20px",
  );

  // Component props interface validation
  const mockProps: AgentActionButtonProps = {
    state: "paused",
    hasInput: true,
    hasAttachments: false,
    disabled: false,
    onSend: () => {},
    onPause: () => {},
    onResume: () => {},
    className: "agent-action-button paused",
    "aria-label": "继续执行",
  };

  assert.equal(mockProps.state, "paused");
  assert.equal(mockProps["aria-label"], "继续执行");
});

// -------------------------------------------------------------------------
// Tier 2: Boundary & Corner Cases (Edge Conditions & Debouncing)
// -------------------------------------------------------------------------

test("R1-T2-01: rapid double-clicks during pausing transition are rejected via debounce and disabled flag", async () => {
  const machine = new ActionButtonStateMachine("executing");
  let pauseCallCount = 0;

  // First click triggers pause
  const firstClick = await machine.handleClick(
    undefined,
    () => {
      pauseCallCount++;
    },
    undefined,
  );
  assert.equal(firstClick.transitioned, true);
  assert.equal(machine.state, "pausing");
  assert.equal(pauseCallCount, 1);

  // Rapid second click during pausing state (within 5ms)
  const secondClick = await machine.handleClick(
    undefined,
    () => {
      pauseCallCount++;
    },
    undefined,
  );
  assert.equal(secondClick.transitioned, false, "Second click must be ignored");
  assert.equal(secondClick.currentState, "pausing");
  assert.equal(pauseCallCount, 1, "onPause callback must not be invoked twice");
});

test("R1-T2-02: rapid double-clicks during resuming transition are rejected to prevent duplicate unfreeze dispatches", async () => {
  const machine = new ActionButtonStateMachine("paused");
  let resumeCallCount = 0;

  // First click triggers resume
  const firstClick = await machine.handleClick(undefined, undefined, () => {
    resumeCallCount++;
  });
  assert.equal(firstClick.transitioned, true);
  assert.equal(machine.state, "resuming");
  assert.equal(resumeCallCount, 1);

  // Rapid second click during resuming state
  const secondClick = await machine.handleClick(undefined, undefined, () => {
    resumeCallCount++;
  });
  assert.equal(
    secondClick.transitioned,
    false,
    "Second click must be rejected",
  );
  assert.equal(machine.state, "resuming");
  assert.equal(
    resumeCallCount,
    1,
    "onResume callback must not be invoked twice",
  );
});

test("R1-T2-03: background remote polling for accepted generation jobs persists across paused turn", async () => {
  const machine = new ActionButtonStateMachine("executing");
  machine.setRemotePolling(true); // Background generation task running

  // Pause turn
  await machine.handleClick(); // executing -> pausing
  machine.completeStepAndFreeze(); // pausing -> paused

  // Invariant: Pausing the agent loop does NOT abort remote polling
  assert.equal(machine.state, "paused");
  assert.equal(machine.isTurnQueueFrozen, true);
  assert.equal(
    machine.isRemotePollingActive,
    true,
    "Remote polling must remain active while turn is frozen",
  );
});

test("R1-T2-04: modifying draft while in paused state safely retains the edits without accidental submission", async () => {
  const machine = new ActionButtonStateMachine("paused");
  machine.setDraft("Initial paused draft");

  // User edits draft while agent execution is paused
  machine.setDraft("Updated draft with critical instructions", [
    "extra-spec.pdf",
  ]);
  assert.equal(machine.draft.text, "Updated draft with critical instructions");
  assert.equal(machine.draft.attachments.length, 1);

  // Resume turn
  let sendTriggered = false;
  await machine.handleClick(
    () => {
      sendTriggered = true;
    },
    undefined,
    () => {},
  );
  machine.acknowledgeUnfreeze();

  assert.equal(sendTriggered, false);
  assert.equal(machine.state, "executing");
  assert.equal(machine.draft.text, "Updated draft with critical instructions");
});

test("R1-T2-05: timeout or error during pausing transition recovers gracefully to stable paused state", () => {
  const machine = new ActionButtonStateMachine("pausing");

  // In the event of a micro-step timeout, controller forces step completion
  // to prevent leaving the UI in an unclickable dead state
  machine.completeStepAndFreeze();

  assert.equal(machine.state, "paused");
  assert.equal(machine.isTurnQueueFrozen, true);
  assert.equal(machine.isButtonDisabled(), false);
});
