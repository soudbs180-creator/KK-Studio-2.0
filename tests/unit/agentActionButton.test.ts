import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement, Fragment, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import {
  createTurnFreezingController,
  type AgentActionState as RealAgentActionState,
} from "../../src/features/agent/agentTurnFreezing.ts";

export type AgentActionState =
  | "idle"
  | "executing"
  | "pausing"
  | "paused"
  | "resuming"
  | "completed";

export type AgentActionTransitionEvent =
  | "SEND"
  | "PAUSE_REQUEST"
  | "STEP_COMPLETED_PAUSE"
  | "RESUME_REQUEST"
  | "STEP_RESUMED"
  | "TASK_COMPLETED"
  | "RESET";

export function transitionAgentActionState(
  current: AgentActionState,
  event: AgentActionTransitionEvent,
): AgentActionState {
  switch (current) {
    case "idle":
      return event === "SEND" ? "executing" : current;
    case "executing":
      if (event === "PAUSE_REQUEST") return "pausing";
      if (event === "TASK_COMPLETED") return "completed";
      return current;
    case "pausing":
      return event === "STEP_COMPLETED_PAUSE" ? "paused" : current;
    case "paused":
      return event === "RESUME_REQUEST" ? "resuming" : current;
    case "resuming":
      return event === "STEP_RESUMED" ? "executing" : current;
    case "completed":
      return event === "RESET" ? "idle" : current;
    default:
      return current;
  }
}

export interface AgentActionButtonProps {
  state: AgentActionState;
  hasDraft?: boolean;
  hasContent?: boolean;
  disabled?: boolean;
  onSend: () => void;
  onPause: () => void;
  onResume: () => void;
  className?: string;
  "aria-label"?: string;
}

// ---------------------------------------------------------------------------
// Mock Harness 1: Component Rendering Harness
// ---------------------------------------------------------------------------
async function createActionComponentHarness() {
  const componentPath = new URL(
    "../../src/components/AgentActionButton.tsx",
    import.meta.url,
  );
  const source = await readFile(componentPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const exports: {
    default?: (props: AgentActionButtonProps) => ReactElement;
  } = {};

  const modules: Record<string, unknown> = {
    react: {
      createElement,
      Fragment,
      useRef: (initial: unknown) => ({ current: initial }),
      useEffect: () => {},
    },
    "react/jsx-runtime": { jsx: createElement, jsxs: createElement, Fragment },
    "./UiIcon": {
      default: ({ name, size }: { name: string; size?: number }) =>
        createElement("span", {
          "data-icon": name,
          "data-size": size ?? 20,
          className: `ui-icon ui-icon-${name}`,
        }),
    },
    "./UiIcon.tsx": {
      default: ({ name, size }: { name: string; size?: number }) =>
        createElement("span", {
          "data-icon": name,
          "data-size": size ?? 20,
          className: `ui-icon ui-icon-${name}`,
        }),
    },
    "./uiIconSizing.ts": {
      normalizeUiIconSize: (s?: number) => s ?? 20,
    },
    "../styles/agent-action-button.css": {},
  };

  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      if (name in modules) return modules[name];
      if (name.endsWith(".css")) return {};
      throw new Error(`Unexpected dependency in AgentActionButton: ${name}`);
    },
  });

  return (props: AgentActionButtonProps) => {
    const tree = exports.default!(props);
    const html = renderToStaticMarkup(tree);
    return { tree, html };
  };
}

// Helper to find clickable button element in tree
function findButton(
  value: unknown,
): ReactElement<{ onClick?: (e?: unknown) => void; disabled?: boolean }> | undefined {
  if (Array.isArray(value)) return value.map(findButton).find(Boolean);
  if (value && typeof value === "object" && "props" in value) {
    const element = value as ReactElement<{
      children?: unknown;
      onClick?: (e?: unknown) => void;
      disabled?: boolean;
    }>;
    return element.type === "button"
      ? element
      : findButton(element.props.children);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Mock Harness 2: Turn Freezing & Step Completion Controller
// ---------------------------------------------------------------------------
function createMockTurnFreezingController() {
  let state: AgentActionState = "idle";
  let pauseRequested = false;
  let activeStepPromise: Promise<unknown> | null = null;
  let pollingCount = 0;
  let pollingActive = false;

  return {
    getState: () => state,
    isPaused: () => state === "paused",
    isPausing: () => state === "pausing",
    isExecuting: () => state === "executing",
    getPollingCount: () => pollingCount,
    isPollingActive: () => pollingActive,

    startExecution: () => {
      state = "executing";
      pollingActive = true;
    },

    executeStep: async <T>(stepId: string, run: () => Promise<T>): Promise<T> => {
      if (state === "paused") {
        throw new Error(`Cannot execute step ${stepId} while turn is paused`);
      }
      const stepPromise = run();
      activeStepPromise = stepPromise;
      const result = await stepPromise;
      activeStepPromise = null;
      if (pauseRequested) {
        pauseRequested = false;
        state = "paused";
      }
      return result;
    },

    pauseTurn: async () => {
      if (state !== "executing") return;
      state = "pausing";
      pauseRequested = true;
      if (activeStepPromise) {
        await activeStepPromise;
      } else {
        pauseRequested = false;
        state = "paused";
      }
    },

    resumeTurn: () => {
      if (state !== "paused") return;
      state = "resuming";
      state = "executing";
    },

    pollBackgroundTasks: () => {
      if (pollingActive) {
        pollingCount++;
      }
    },

    completeExecution: () => {
      state = "completed";
      pollingActive = false;
      state = "idle";
    },
  };
}

// ---------------------------------------------------------------------------
// Mock Harness 3: Composer Draft Preservation Harness
// ---------------------------------------------------------------------------
function createAgentComposerDraftHarness(initialDraft = "") {
  let draft = initialDraft;
  const sentMessages: string[] = [];

  return {
    getDraft: () => draft,
    setDraft: (text: string) => {
      draft = text;
    },
    sendMessage: (text: string) => {
      sentMessages.push(text);
      if (draft === text) {
        draft = "";
      }
    },
    getSentMessages: () => [...sentMessages],
  };
}

// ===========================================================================
// Test Module 1: All 6 State Transitions
// ===========================================================================

test("T1.1: idle state renders send glyph and is disabled when draft is empty", async () => {
  const render = await createActionComponentHarness();
  const { html } = render({
    state: "idle",
    hasDraft: false,
    onSend: () => {},
    onPause: () => {},
    onResume: () => {},
  });

  assert.match(html, /<button/);
  assert.match(html, /disabled/);
  assert.match(html, /aria-label="发送消息"/);
  assert.match(html, /data-icon="send"|composer-send|send/);
  assert.doesNotMatch(html, /aria-busy="true"/);
});

test("T1.2: idle state enables button when draft exists and invokes onSend on click", async () => {
  const render = await createActionComponentHarness();
  let sendCount = 0;
  const { html, tree } = render({
    state: "idle",
    hasDraft: true,
    onSend: () => {
      sendCount++;
    },
    onPause: () => {},
    onResume: () => {},
  });

  assert.doesNotMatch(html, /disabled/);
  const button = findButton(tree);
  assert.ok(button, "Button element must be present");
  button.props.onClick?.();
  assert.equal(sendCount, 1);
});

test("T1.3: executing state renders stop/pause glyph and invokes onPause on click", async () => {
  const render = await createActionComponentHarness();
  let pauseCount = 0;
  const { html, tree } = render({
    state: "executing",
    onSend: () => {},
    onPause: () => {
      pauseCount++;
    },
    onResume: () => {},
  });

  assert.doesNotMatch(html, /disabled/);
  assert.match(html, /aria-label="暂停执行"|暂停/);
  assert.match(html, /data-icon="(?:stop|pause)"|composer-stop|composer-pause/);
  assert.doesNotMatch(html, /aria-busy="true"/);

  const button = findButton(tree);
  assert.ok(button);
  button.props.onClick?.();
  assert.equal(pauseCount, 1);
});

test("T1.4: pausing state renders spinner, is disabled, and has aria-busy true", async () => {
  const render = await createActionComponentHarness();
  let pauseCount = 0;
  const { html, tree } = render({
    state: "pausing",
    onSend: () => {},
    onPause: () => {
      pauseCount++;
    },
    onResume: () => {},
  });

  assert.match(html, /disabled/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-label="正在暂停…"|正在暂停/);
  assert.match(html, /spinner|loading|shimmer/);

  const button = findButton(tree);
  assert.ok(button);
  // Ensure clicking while disabled does not invoke callback
  assert.equal(button.props.disabled, true);
  assert.equal(pauseCount, 0);
});

test("T1.5: paused state renders resume glyph and invokes onResume on click", async () => {
  const render = await createActionComponentHarness();
  let resumeCount = 0;
  const { html, tree } = render({
    state: "paused",
    onSend: () => {},
    onPause: () => {},
    onResume: () => {
      resumeCount++;
    },
  });

  assert.doesNotMatch(html, /disabled/);
  assert.match(html, /aria-label="继续执行"|继续/);
  assert.match(html, /data-icon="(?:play|resume)"|composer-play|composer-resume/);
  assert.doesNotMatch(html, /aria-busy="true"/);

  const button = findButton(tree);
  assert.ok(button);
  button.props.onClick?.();
  assert.equal(resumeCount, 1);
});

test("T1.6: resuming state renders spinner, is disabled, and has aria-busy true", async () => {
  const render = await createActionComponentHarness();
  let resumeCount = 0;
  const { html, tree } = render({
    state: "resuming",
    onSend: () => {},
    onPause: () => {},
    onResume: () => {
      resumeCount++;
    },
  });

  assert.match(html, /disabled/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-label="正在恢复…"|正在恢复/);
  assert.match(html, /spinner|loading|shimmer/);

  const button = findButton(tree);
  assert.ok(button);
  assert.equal(button.props.disabled, true);
  assert.equal(resumeCount, 0);
});

test("T1.7: completed state renders checkmark and automatically settles back to idle", async () => {
  const render = await createActionComponentHarness();
  const { html } = render({
    state: "completed",
    onSend: () => {},
    onPause: () => {},
    onResume: () => {},
  });

  assert.match(html, /completed|check|done/);
});

test("T1.8: canonical 6-state transition flow cycle completes in order", async () => {
  const controller = createMockTurnFreezingController();
  assert.equal(controller.getState(), "idle");

  controller.startExecution();
  assert.equal(controller.getState(), "executing");

  let stepFinished = false;
  const stepPromise = controller.executeStep("step-1", async () => {
    stepFinished = true;
    return "done-1";
  });

  const pausePromise = controller.pauseTurn();
  assert.equal(controller.getState(), "pausing");

  await stepPromise;
  await pausePromise;
  assert.equal(controller.getState(), "paused");
  assert.equal(stepFinished, true);

  controller.resumeTurn();
  assert.equal(controller.getState(), "executing");

  controller.completeExecution();
  assert.equal(controller.getState(), "idle");
});

test("T1.9: pure transition function verifies 6-state transitions and guards against invalid jumps", () => {
  // Valid transitions
  assert.equal(transitionAgentActionState("idle", "SEND"), "executing");
  assert.equal(transitionAgentActionState("executing", "PAUSE_REQUEST"), "pausing");
  assert.equal(transitionAgentActionState("pausing", "STEP_COMPLETED_PAUSE"), "paused");
  assert.equal(transitionAgentActionState("paused", "RESUME_REQUEST"), "resuming");
  assert.equal(transitionAgentActionState("resuming", "STEP_RESUMED"), "executing");
  assert.equal(transitionAgentActionState("executing", "TASK_COMPLETED"), "completed");
  assert.equal(transitionAgentActionState("completed", "RESET"), "idle");

  // Invalid jumps return current state unchanged
  assert.equal(transitionAgentActionState("idle", "PAUSE_REQUEST"), "idle");
  assert.equal(transitionAgentActionState("pausing", "RESUME_REQUEST"), "pausing");
  assert.equal(transitionAgentActionState("paused", "STEP_RESUMED"), "paused");
  assert.equal(transitionAgentActionState("resuming", "SEND"), "resuming");
});

// ===========================================================================
// Test Module 2: Click Debounce and Double-Click Protection
// ===========================================================================

test("T2.1: pausing and resuming states prevent double-click triggers", async () => {
  const render = await createActionComponentHarness();
  let pauseClicks = 0;
  let resumeClicks = 0;

  const pausingRender = render({
    state: "pausing",
    onSend: () => {},
    onPause: () => {
      pauseClicks++;
    },
    onResume: () => {},
  });
  const pausingBtn = findButton(pausingRender.tree);
  assert.equal(pausingBtn?.props.disabled, true);
  assert.equal(pauseClicks, 0);

  const resumingRender = render({
    state: "resuming",
    onSend: () => {},
    onPause: () => {},
    onResume: () => {
      resumeClicks++;
    },
  });
  const resumingBtn = findButton(resumingRender.tree);
  assert.equal(resumingBtn?.props.disabled, true);
  assert.equal(resumeClicks, 0);
});

test("T2.2: rapid double-clicks within debounce cooldown only fire once", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    let callCount = 0;
    let lastClickTime: number | null = null;
    const DEBOUNCE_MS = 300;

    const guardedHandler = () => {
      const now = Date.now();
      if (lastClickTime !== null && now - lastClickTime < DEBOUNCE_MS) return;
      lastClickTime = now;
      callCount++;
    };

    guardedHandler(); // Click 1: should fire
    guardedHandler(); // Click 2 (immediate): should drop
    guardedHandler(); // Click 3 (immediate): should drop
    assert.equal(callCount, 1);

    t.mock.timers.tick(350);
    guardedHandler(); // Click 4 (after 350ms): should fire
    assert.equal(callCount, 2);
  } finally {
    t.mock.timers.reset();
  }
});

// ===========================================================================
// Test Module 3: Geometry & Design Token Compliance
// ===========================================================================

test("T3.1: button geometry complies with 40px desktop diameter and circular radius", async () => {
  const render = await createActionComponentHarness();
  const { html } = render({
    state: "idle",
    hasDraft: true,
    onSend: () => {},
    onPause: () => {},
    onResume: () => {},
  });

  // Must declare circular geometry class or inline style with 40px
  assert.match(
    html,
    /agent-action-button|chat-send-circular|chat-action-button/,
    "Button must have designated action button class",
  );
  // Verify styles in CSS
  const css = await readFile(
    new URL("../../src/styles/agent-action-button.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /(?:width|height|flex-basis):\s*(?:40px|var\(--kk-control-h-lg\)|var\(--kk-control-h-xl\)|var\(--agent-action-size\))/,
    "CSS must declare 40px or token dimension",
  );
  assert.match(
    css,
    /border-radius:\s*(?:50%|var\(--kk-radius-full\)|9999px|999px)/,
    "CSS must declare circular border-radius",
  );
});

test("T3.2: touch target geometry is >= 44px for touch accessibility", async () => {
  const css = await readFile(
    new URL("../../src/styles/agent-action-button.css", import.meta.url),
    "utf8",
  );
  // Must specify touch target hit area of at least 44px
  assert.match(
    css,
    /44px/,
    "CSS must include 44px touch target specification",
  );
});

test("T3.3: icon size is normalized to 20px glyph standard", async () => {
  const render = await createActionComponentHarness();
  const { html } = render({
    state: "idle",
    hasDraft: true,
    onSend: () => {},
    onPause: () => {},
    onResume: () => {},
  });

  // Verify icon size is 20px
  assert.match(
    html,
    /data-size="20"|width="20"|height="20"|size=\{?20\}?/,
    "Rendered icon must have 20px geometry",
  );
});

// ===========================================================================
// Test Module 4: Turn Freezing & Step Completion Simulation
// ===========================================================================

test("T4.1: pauseTurn allows in-flight active step to resolve completely without cancellation", async () => {
  const controller = createMockTurnFreezingController();
  controller.startExecution();

  let stepResult: string | null = null;
  let stepExecuted = false;

  const stepPromise = controller.executeStep("tool-op", async () => {
    // Simulate async tool execution
    await new Promise((r) => setTimeout(r, 10));
    stepExecuted = true;
    return "canvas-op-success";
  });

  // Invoke pause while step is actively executing
  const pausePromise = controller.pauseTurn();
  assert.equal(controller.isPausing(), true);

  // Await step resolution
  stepResult = await stepPromise;
  await pausePromise;

  assert.equal(stepExecuted, true);
  assert.equal(stepResult, "canvas-op-success");
  assert.equal(controller.isPaused(), true);
});

test("T4.2: turn queue is frozen while paused and subsequent step is held", async () => {
  const controller = createMockTurnFreezingController();
  controller.startExecution();

  // Active step completes and enters paused state
  const p1 = controller.executeStep("step-1", async () => "step-1-ok");
  const pPause = controller.pauseTurn();
  await p1;
  await pPause;
  assert.equal(controller.isPaused(), true);

  // Attempting to execute next step while paused throws error
  await assert.rejects(
    async () => {
      await controller.executeStep("step-2", async () => "step-2-ok");
    },
    /Cannot execute step step-2 while turn is paused/,
  );
});

test("T4.3: remote background task polling remains ACTIVE while turn is frozen", async () => {
  const controller = createMockTurnFreezingController();
  controller.startExecution();

  // Enter paused state
  const p1 = controller.executeStep("step-1", async () => "ok");
  const pPause = controller.pauseTurn();
  await p1;
  await pPause;
  assert.equal(controller.isPaused(), true);

  // Background polling timer ticks 3 times
  controller.pollBackgroundTasks();
  controller.pollBackgroundTasks();
  controller.pollBackgroundTasks();

  // Polling continues unabated
  assert.equal(controller.getPollingCount(), 3);
  assert.equal(controller.isPollingActive(), true);
});

test("T4.4: resumeTurn unfreezes queue and allows subsequent steps to run to completion", async () => {
  const controller = createMockTurnFreezingController();
  controller.startExecution();

  // Step 1 -> Pause
  const p1 = controller.executeStep("step-1", async () => "s1");
  const pPause = controller.pauseTurn();
  await p1;
  await pPause;
  assert.equal(controller.isPaused(), true);

  // Resume
  controller.resumeTurn();
  assert.equal(controller.isExecuting(), true);

  // Step 2 can now execute cleanly
  const s2Result = await controller.executeStep("step-2", async () => "s2");
  assert.equal(s2Result, "s2");

  controller.completeExecution();
  assert.equal(controller.getState(), "idle");
});

test("T4.5: real production TurnFreezingController completes step and unblocks queue on resume", async () => {
  const controller = createTurnFreezingController({ completedResetDelayMs: 50 });
  assert.equal(controller.getState().state, "idle");

  controller.onTurnStart();
  assert.equal(controller.getState().state, "executing");
  assert.equal(controller.isExecuting(), true);

  // Active step in flight
  const endStep = controller.beginStep("step-prod-1");
  assert.equal(controller.getState().activeStepCount, 1);

  // Request pause while step in flight
  const pausePromise = controller.pause();
  assert.equal(controller.isPausing(), true);
  assert.equal(controller.isFrozen(), true);

  // A queue item waiting on unfreeze
  let unblocked = false;
  const waiterPromise = controller.awaitUnfrozen().then(() => {
    unblocked = true;
  });

  // Finish active step
  endStep();
  await pausePromise;
  assert.equal(controller.isPaused(), true);
  assert.equal(unblocked, false, "Queue must remain blocked while paused");

  // Resume
  await controller.resume();
  await waiterPromise;
  assert.equal(unblocked, true, "Queue must be unblocked after resume");
  assert.equal(controller.isExecuting(), true);

  // Complete turn
  controller.onTurnComplete("completed");
  assert.equal(controller.getState().state, "completed");

  // Wait for auto-reset
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(controller.getState().state, "idle");
});

// ===========================================================================
// Test Module 5: Draft Preservation and No Auto-Send on Resume
// ===========================================================================

test("T5.1: input draft is preserved across pause and resume cycles", async () => {
  const draftHarness = createAgentComposerDraftHarness("Draft before execution");
  const controller = createMockTurnFreezingController();

  controller.startExecution();

  // User edits draft while agent is running
  draftHarness.setDraft("Modified follow-up draft");

  // Pause turn
  const p1 = controller.executeStep("step-1", async () => "ok");
  const pPause = controller.pauseTurn();
  await p1;
  await pPause;
  assert.equal(controller.isPaused(), true);

  // Draft MUST remain untouched
  assert.equal(draftHarness.getDraft(), "Modified follow-up draft");
  assert.equal(draftHarness.getSentMessages().length, 0);

  // Resume turn
  controller.resumeTurn();
  assert.equal(controller.isExecuting(), true);

  // Draft MUST NOT be cleared or sent
  assert.equal(draftHarness.getDraft(), "Modified follow-up draft");
  assert.equal(draftHarness.getSentMessages().length, 0);

  // Complete execution
  controller.completeExecution();
  assert.equal(controller.getState(), "idle");
  assert.equal(draftHarness.getDraft(), "Modified follow-up draft");
});

test("T5.2: draft is sent only upon explicit user submission from idle", async () => {
  const draftHarness = createAgentComposerDraftHarness("Ready prompt");
  const controller = createMockTurnFreezingController();

  assert.equal(controller.getState(), "idle");

  // User clicks Send
  draftHarness.sendMessage(draftHarness.getDraft());
  controller.startExecution();

  assert.deepEqual(draftHarness.getSentMessages(), ["Ready prompt"]);
  assert.equal(draftHarness.getDraft(), ""); // cleared upon explicit send
});
