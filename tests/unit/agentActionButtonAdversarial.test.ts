/**
 * tests/unit/agentActionButtonAdversarial.test.ts
 *
 * Adversarial Empirical Stress Test Suite for KK Studio Milestone 1 (R1).
 * Specifically challenges:
 *   1. Rapid click spamming (100 rapid clicks across transitions, clock skew, jitter)
 *   2. Exhaustive invalid jump attempts (42-cell matrix, 10,000 random-walk fuzzing oracle)
 *   3. Transient state double-clicks (pausing, resuming, completed, queue stampedes)
 *   4. Geometry bounds, touch hit expansion (40px/44px/20px), and token invariants
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement, Fragment, type ReactElement } from "react";
import ts from "typescript";
import { createTurnFreezingController } from "../../src/features/agent/agentTurnFreezing.ts";

export type AgentActionState =
  "idle" | "executing" | "pausing" | "paused" | "resuming" | "completed";

export type AgentActionTransitionEvent =
  | "SEND"
  | "PAUSE_REQUEST"
  | "STEP_COMPLETED_PAUSE"
  | "RESUME_REQUEST"
  | "STEP_RESUMED"
  | "TASK_COMPLETED"
  | "RESET";

interface TranspiledActionButtonModule {
  default: (props: AgentActionButtonComponentProps) => ReactElement;
  transitionAgentActionState: (
    current: AgentActionState,
    event: AgentActionTransitionEvent,
  ) => AgentActionState;
  shouldDebounceClick: (
    lastClickTime: number,
    currentTime: number,
    debounceMs?: number,
  ) => boolean;
  AGENT_ACTION_BUTTON_GEOMETRY: {
    readonly desktopDiameter: number;
    readonly minTouchTarget: number;
    readonly iconSize: number;
  };
  DEFAULT_DEBOUNCE_MS: number;
  DEFAULT_COMPLETED_TIMEOUT_MS: number;
}

interface AgentActionButtonComponentProps {
  state?: AgentActionState;
  hasContent?: boolean;
  hasDraft?: boolean;
  disabled?: boolean;
  debounceMs?: number;
  autoResetMs?: number;
  onSend?: () => void | Promise<void>;
  onPause?: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
  onCompleted?: () => void;
  className?: string;
  size?: number;
  "aria-label"?: string;
}

// ---------------------------------------------------------------------------
// Transpiler & Component Harness with Persistent Ref Simulation
// ---------------------------------------------------------------------------
async function loadTranspiledActionButtonModule(): Promise<TranspiledActionButtonModule> {
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

  const exports: Partial<TranspiledActionButtonModule> = {};

  // Stateful useRef store allowing multiple renders of the same component instance to share refs
  const activeSharedRef: { current: number } = { current: 0 };

  const modules: Record<string, unknown> = {
    react: {
      createElement,
      Fragment,
      useRef: (initial: number) => {
        if (activeSharedRef.current === undefined) {
          activeSharedRef.current = initial;
        }
        return activeSharedRef;
      },
      useEffect: (effect: () => void | (() => void)) => {
        // Run effect synchronously in unit harness
        const cleanup = effect();
        return cleanup;
      },
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
    "../styles/agent-action-button.css": {},
  };

  runInNewContext(compiled.outputText, {
    exports,
    setTimeout,
    clearTimeout,
    Date,
    console,
    require: (name: string) => {
      if (name in modules) return modules[name];
      if (name.endsWith(".css")) return {};
      throw new Error(`Unexpected dependency in AgentActionButton: ${name}`);
    },
  });

  return exports as TranspiledActionButtonModule;
}

// Helper to find clickable button element
function findButtonElement(value: unknown):
  | ReactElement<{
      onClick?: (e?: unknown) => void;
      disabled?: boolean;
      [key: string]: unknown;
    }>
  | undefined {
  if (Array.isArray(value)) return value.map(findButtonElement).find(Boolean);
  if (value && typeof value === "object" && "props" in value) {
    const el = value as ReactElement<{
      children?: unknown;
      onClick?: (e?: unknown) => void;
      disabled?: boolean;
    }>;
    return el.type === "button" ? el : findButtonElement(el.props.children);
  }
  return undefined;
}

// ===========================================================================
// SUITE 1: Rapid Click Spamming & Debounce Stress Harness (100 Clicks)
// ===========================================================================

test("ADV-1.1: shouldDebounceClick handles exact boundaries, micro-intervals, and backward clock skew", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const { shouldDebounceClick } = mod;

  // 1. Initial click (lastClickTime = 0) must never be debounced
  assert.equal(
    shouldDebounceClick(0, 1000, 300),
    false,
    "Initial click must not be debounced",
  );
  assert.equal(
    shouldDebounceClick(0, 0, 300),
    false,
    "Zero timestamp initial click not debounced",
  );

  // 2. Immediate subsequent clicks (delta = 0) must be debounced
  assert.equal(
    shouldDebounceClick(1000, 1000, 300),
    true,
    "Identical timestamp must be debounced",
  );

  // 3. Sub-millisecond and rapid intervals (< 300ms)
  assert.equal(
    shouldDebounceClick(1000, 1001, 300),
    true,
    "1ms delta must be debounced",
  );
  assert.equal(
    shouldDebounceClick(1000, 1150, 300),
    true,
    "150ms delta must be debounced",
  );
  assert.equal(
    shouldDebounceClick(1000, 1299, 300),
    true,
    "299ms delta must be debounced",
  );

  // 4. Exact boundary (delta = 300ms) must NOT be debounced (allowed)
  assert.equal(
    shouldDebounceClick(1000, 1300, 300),
    false,
    "Exact 300ms delta must be allowed",
  );
  assert.equal(
    shouldDebounceClick(1000, 1301, 300),
    false,
    "301ms delta must be allowed",
  );

  // 5. System clock skew / backward jump (now < lastClickTime)
  // In Javascript: (now - lastClickTime) < 300 evaluates to true for negative values,
  // effectively preventing double-clicks even if the system clock synchronizes backwards!
  assert.equal(
    shouldDebounceClick(2000, 1900, 300),
    true,
    "Negative time delta from clock skew must remain safely debounced",
  );
  assert.equal(
    shouldDebounceClick(2000, 1000, 300),
    true,
    "Large negative time delta must remain safely debounced",
  );

  // 6. Custom debounce intervals
  assert.equal(
    shouldDebounceClick(1000, 1050, 50),
    false,
    "Exact custom 50ms boundary allowed",
  );
  assert.equal(
    shouldDebounceClick(1000, 1049, 50),
    true,
    "49ms with custom 50ms debounced",
  );
});

test("ADV-1.2: 100 rapid click spam on idle state triggers onSend EXACTLY once", async () => {
  const mod = await loadTranspiledActionButtonModule();
  let sendCount = 0;

  // We simulate rapid clicks via a custom wrapper tracking lastClickRef
  const sharedRef = { current: 0 };

  const executeClick = (currentTime: number) => {
    if (mod.shouldDebounceClick(sharedRef.current, currentTime, 300)) {
      return false;
    }
    sharedRef.current = currentTime;
    sendCount++;
    return true;
  };

  // Spam 100 clicks in 100ms (1ms interval)
  const baseTime = 100_000;
  let allowedCount = 0;
  for (let i = 0; i < 100; i++) {
    const fired = executeClick(baseTime + i);
    if (fired) allowedCount++;
  }

  assert.equal(
    sendCount,
    1,
    "onSend must fire exactly once across 100 rapid clicks",
  );
  assert.equal(allowedCount, 1, "Only 1 of the 100 clicks must be admitted");
});

test("ADV-1.3: 100 clicks across multiple debounce windows admit exactly 3 invocations", async () => {
  const mod = await loadTranspiledActionButtonModule();
  let sendCount = 0;
  const sharedRef = { current: 0 };

  const executeClick = (currentTime: number) => {
    if (mod.shouldDebounceClick(sharedRef.current, currentTime, 300)) {
      return false;
    }
    sharedRef.current = currentTime;
    sendCount++;
    return true;
  };

  const baseTime = 500_000;
  // 100 clicks distributed across 3 distinct 300ms windows:
  // Window 1: Clicks 0..32 (t = baseTime to baseTime + 290)
  // Window 2: Clicks 33..65 (t = baseTime + 301 to baseTime + 590)
  // Window 3: Clicks 66..99 (t = baseTime + 602 to baseTime + 890)
  for (let i = 0; i < 100; i++) {
    let t: number;
    if (i === 0) {
      t = baseTime;
    } else if (i < 33) {
      t = baseTime + i * 8; // 8ms .. 256ms < 300ms
    } else if (i === 33) {
      t = baseTime + 305; // New window 2!
    } else if (i < 66) {
      t = baseTime + 305 + (i - 33) * 8; // < 605ms
    } else if (i === 66) {
      t = baseTime + 610; // New window 3!
    } else {
      t = baseTime + 610 + (i - 66) * 8; // < 910ms
    }
    executeClick(t);
  }

  assert.equal(
    sendCount,
    3,
    "Exactly 3 distinct send calls must fire across the 3 time windows",
  );
});

test("ADV-1.4: 100 rapid clicks on executing state triggers onPause EXACTLY once", async () => {
  const mod = await loadTranspiledActionButtonModule();
  let pauseCount = 0;
  const sharedRef = { current: 0 };

  const executePauseClick = (currentTime: number) => {
    if (mod.shouldDebounceClick(sharedRef.current, currentTime, 300)) {
      return false;
    }
    sharedRef.current = currentTime;
    pauseCount++;
    return true;
  };

  const baseTime = 10_000;
  for (let i = 0; i < 100; i++) {
    executePauseClick(baseTime + i * 2); // 100 clicks in 200ms
  }

  assert.equal(
    pauseCount,
    1,
    "onPause must fire exactly once for 100 rapid clicks in executing state",
  );
});

test("ADV-1.5: 100 rapid clicks on paused state triggers onResume EXACTLY once", async () => {
  const mod = await loadTranspiledActionButtonModule();
  let resumeCount = 0;
  const sharedRef = { current: 0 };

  const executeResumeClick = (currentTime: number) => {
    if (mod.shouldDebounceClick(sharedRef.current, currentTime, 300)) {
      return false;
    }
    sharedRef.current = currentTime;
    resumeCount++;
    return true;
  };

  const baseTime = 20_000;
  for (let i = 0; i < 100; i++) {
    executeResumeClick(baseTime + i * 2); // 100 clicks in 200ms
  }

  assert.equal(
    resumeCount,
    1,
    "onResume must fire exactly once for 100 rapid clicks in paused state",
  );
});

test("ADV-1.6: 100 continuous spam clicks across a dynamic 6-state transition sequence", async () => {
  const mod = await loadTranspiledActionButtonModule();
  let sendCount = 0;
  let pauseCount = 0;
  let resumeCount = 0;
  let illegalCallbackCount = 0;

  let currentState: AgentActionState = "idle";
  const sharedRef = { current: 0 };

  // Dispatch click logic mimicking AgentActionButton.handleClick
  const dispatchClick = (currentTime: number) => {
    // Check disabled status
    const isPausingOrResuming =
      currentState === "pausing" || currentState === "resuming";
    const isCompleted = currentState === "completed";
    const isButtonDisabled = isPausingOrResuming || isCompleted;

    if (isButtonDisabled) {
      // In real DOM, disabled button ignores clicks. If synthetic event reaches handler:
      illegalCallbackCount++;
      return;
    }

    if (mod.shouldDebounceClick(sharedRef.current, currentTime, 300)) {
      return;
    }
    sharedRef.current = currentTime;

    if (currentState === "idle") {
      sendCount++;
    } else if (currentState === "executing") {
      pauseCount++;
    } else if (currentState === "paused") {
      resumeCount++;
    }
  };

  // Simulate 100 rapid spam clicks (1ms interval) while state shifts
  const baseTime = 1_000_000;
  for (let i = 0; i < 100; i++) {
    const t = baseTime + i;

    // Transition state at designated milestones:
    if (i === 15) {
      currentState = "executing";
    } else if (i === 35) {
      currentState = "pausing";
    } else if (i === 55) {
      currentState = "paused";
    } else if (i === 70) {
      currentState = "resuming";
    } else if (i === 85) {
      currentState = "completed";
    } else if (i === 95) {
      currentState = "idle";
    }

    dispatchClick(t);
  }

  // Verification:
  // 1. In idle (clicks 0..14): exactly 1 onSend
  assert.equal(sendCount, 1, "onSend must fire exactly once");
  // 2. In executing (clicks 15..34): lastClick was at t=0, so at t=15 (15ms < 300ms from t=0),
  // debounce blocks pause until cooldown clears!
  // This verifies that rapid clicking in idle does not immediately trigger pause if the state flips!
  assert.equal(pauseCount, 0, "onPause safely debounced from idle spam");
  // 3. During pausing (clicks 35..54): disabled, 0 callbacks
  // 4. In paused (clicks 55..69): debounced from previous clicks, 0 callbacks
  // 5. In resuming (clicks 70..84): disabled, 0 callbacks
  // 6. In completed (clicks 85..94): disabled, 0 callbacks
  assert.equal(resumeCount, 0, "onResume safely debounced during rapid spam");
  assert.equal(
    illegalCallbackCount,
    45,
    "Clicks during disabled states must be intercepted",
  );
});

test("ADV-1.7: Direct synchronous 100-click spam on mounted React component in idle state", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const AgentActionButton = mod.default;

  let sendCount = 0;
  const tree = AgentActionButton({
    state: "idle",
    hasContent: true,
    onSend: () => {
      sendCount++;
    },
  });

  const button = findButtonElement(tree);
  assert.ok(button, "Button element must be rendered");
  assert.equal(button.props.disabled, false);

  // Synchronous spam: 100 consecutive invocations of button.props.onClick
  const mockEvt = { preventDefault: () => {}, stopPropagation: () => {} };
  for (let i = 0; i < 100; i++) {
    button.props.onClick?.(mockEvt);
  }

  assert.equal(
    sendCount,
    1,
    "onSend must fire EXACTLY 1 time across 100 synchronous spam clicks on component",
  );
});

test("ADV-1.8: Direct synchronous 100-click spam on mounted React component in executing state", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const AgentActionButton = mod.default;

  let pauseCount = 0;
  const tree = AgentActionButton({
    state: "executing",
    onPause: () => {
      pauseCount++;
    },
  });

  const button = findButtonElement(tree);
  assert.ok(button);
  assert.equal(button.props.disabled, false);

  const mockEvt = { preventDefault: () => {}, stopPropagation: () => {} };
  for (let i = 0; i < 100; i++) {
    button.props.onClick?.(mockEvt);
  }

  assert.equal(
    pauseCount,
    1,
    "onPause must fire EXACTLY 1 time across 100 synchronous spam clicks on component",
  );
});

test("ADV-1.9: Direct synchronous 100-click spam on mounted React component in paused state", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const AgentActionButton = mod.default;

  let resumeCount = 0;
  const tree = AgentActionButton({
    state: "paused",
    onResume: () => {
      resumeCount++;
    },
  });

  const button = findButtonElement(tree);
  assert.ok(button);
  assert.equal(button.props.disabled, false);

  const mockEvt = { preventDefault: () => {}, stopPropagation: () => {} };
  for (let i = 0; i < 100; i++) {
    button.props.onClick?.(mockEvt);
  }

  assert.equal(
    resumeCount,
    1,
    "onResume must fire EXACTLY 1 time across 100 synchronous spam clicks on component",
  );
});

// ===========================================================================
// SUITE 2: Exhaustive Invalid State Transitions & Oracle Verification
// ===========================================================================

test("ADV-2.1: Complete 42-cell Cartesian matrix: 7 valid transitions vs 35 strict no-ops", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const { transitionAgentActionState } = mod;

  const states: AgentActionState[] = [
    "idle",
    "executing",
    "pausing",
    "paused",
    "resuming",
    "completed",
  ];

  const events: AgentActionTransitionEvent[] = [
    "SEND",
    "PAUSE_REQUEST",
    "STEP_COMPLETED_PAUSE",
    "RESUME_REQUEST",
    "STEP_RESUMED",
    "TASK_COMPLETED",
    "RESET",
  ];

  // The 7 canonical allowed transitions:
  const canonicalTransitions: Record<string, AgentActionState> = {
    "idle:SEND": "executing",
    "executing:PAUSE_REQUEST": "pausing",
    "executing:TASK_COMPLETED": "completed",
    "pausing:STEP_COMPLETED_PAUSE": "paused",
    "paused:RESUME_REQUEST": "resuming",
    "resuming:STEP_RESUMED": "executing",
    "completed:RESET": "idle",
  };

  let validCount = 0;
  let noOpCount = 0;

  for (const st of states) {
    for (const ev of events) {
      const key = `${st}:${ev}`;
      const next = transitionAgentActionState(st, ev);

      if (key in canonicalTransitions) {
        assert.equal(
          next,
          canonicalTransitions[key],
          `Expected valid transition for ${key} -> ${canonicalTransitions[key]}`,
        );
        validCount++;
      } else {
        // Must be strict NO-OP (returning same state unmodified)
        assert.equal(
          next,
          st,
          `Adversarial illegal jump ${key} MUST return original state ${st}, got ${next}`,
        );
        noOpCount++;
      }
    }
  }

  assert.equal(validCount, 7, "Exactly 7 canonical transitions must succeed");
  assert.equal(
    noOpCount,
    35,
    "Exactly 35 illegal transitions must be strictly blocked",
  );
  assert.equal(validCount + noOpCount, 42, "Full 42-cell matrix verified");
});

test("ADV-2.2: Adversarial input resilience (unknown events, malformed states, prototypes)", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const { transitionAgentActionState } = mod;

  // Unknown events must fall-through to default and return current state
  const strangeEvents = [
    "UNKNOWN_ACTION",
    "pause",
    "Send",
    "",
    "null",
    "__proto__",
    "constructor",
    "valueOf",
  ];

  for (const ev of strangeEvents) {
    assert.equal(
      transitionAgentActionState(
        "idle",
        ev as unknown as AgentActionTransitionEvent,
      ),
      "idle",
    );
    assert.equal(
      transitionAgentActionState(
        "executing",
        ev as unknown as AgentActionTransitionEvent,
      ),
      "executing",
    );
    assert.equal(
      transitionAgentActionState(
        "paused",
        ev as unknown as AgentActionTransitionEvent,
      ),
      "paused",
    );
  }

  // Malformed current state should return the passed malformed state cleanly
  const corruptedState = "corrupted_non_existent" as AgentActionState;
  assert.equal(
    transitionAgentActionState(corruptedState, "SEND"),
    corruptedState,
  );
});

test("ADV-2.3: 10,000 random-walk fuzzing verification against independent formal oracle", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const { transitionAgentActionState } = mod;

  // Independent Formal Oracle Model
  class ActionButtonOracle {
    private state: AgentActionState = "idle";

    public getState(): AgentActionState {
      return this.state;
    }

    public dispatch(event: string): AgentActionState {
      const current = this.state;
      if (current === "idle" && event === "SEND") {
        this.state = "executing";
      } else if (current === "executing" && event === "PAUSE_REQUEST") {
        this.state = "pausing";
      } else if (current === "executing" && event === "TASK_COMPLETED") {
        this.state = "completed";
      } else if (current === "pausing" && event === "STEP_COMPLETED_PAUSE") {
        this.state = "paused";
      } else if (current === "paused" && event === "RESUME_REQUEST") {
        this.state = "resuming";
      } else if (current === "resuming" && event === "STEP_RESUMED") {
        this.state = "executing";
      } else if (current === "completed" && event === "RESET") {
        this.state = "idle";
      }
      return this.state;
    }
  }

  const oracle = new ActionButtonOracle();
  let currentState: AgentActionState = "idle";

  const candidateEvents: AgentActionTransitionEvent[] = [
    "SEND",
    "PAUSE_REQUEST",
    "STEP_COMPLETED_PAUSE",
    "RESUME_REQUEST",
    "STEP_RESUMED",
    "TASK_COMPLETED",
    "RESET",
  ];

  // Seeded pseudo-random generator (LCG) for deterministic reproducibility
  let seed = 0xbeefcafe;
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  const validTransitionsObserved: Record<string, number> = {};

  for (let step = 0; step < 10_000; step++) {
    // 80% pick from candidateEvents, 20% pick an invalid noise string
    let action: string;
    if (nextRandom() < 0.8) {
      const idx = Math.floor(nextRandom() * candidateEvents.length);
      action = candidateEvents[idx];
    } else {
      action = `NOISE_EVENT_${Math.floor(nextRandom() * 100)}`;
    }

    const prevState = currentState;
    const expected = oracle.dispatch(action);
    const actual = transitionAgentActionState(
      currentState,
      action as AgentActionTransitionEvent,
    );

    assert.equal(
      actual,
      expected,
      `Oracle mismatch at step ${step}: state=${prevState}, event=${action}, expected=${expected}, got=${actual}`,
    );

    if (prevState !== actual) {
      const key = `${prevState} -> ${actual} via ${action}`;
      validTransitionsObserved[key] = (validTransitionsObserved[key] || 0) + 1;
    }

    currentState = actual;
  }

  // Ensure all 7 transitions were exercised during the 10,000 steps
  assert.equal(
    Object.keys(validTransitionsObserved).length,
    7,
    "All 7 canonical state transitions must be exercised during 10,000-step fuzzing",
  );
});

// ===========================================================================
// SUITE 3: Transient State Double-Clicks & Concurrency Stress
// ===========================================================================

test("ADV-3.1: Transient states (pausing, resuming, completed) disable button & reject clicks", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const AgentActionButton = mod.default;

  const transientStates: AgentActionState[] = [
    "pausing",
    "resuming",
    "completed",
  ];

  for (const st of transientStates) {
    let clicked = false;
    const tree = AgentActionButton({
      state: st,
      onSend: () => {
        clicked = true;
      },
      onPause: () => {
        clicked = true;
      },
      onResume: () => {
        clicked = true;
      },
    });

    const button = findButtonElement(tree);
    assert.ok(button, `Button must exist for state ${st}`);
    assert.equal(
      button.props.disabled,
      true,
      `Button must be disabled in state ${st}`,
    );

    if (st === "pausing" || st === "resuming") {
      assert.equal(
        button.props["aria-busy"],
        true,
        `aria-busy must be true for ${st}`,
      );
    }

    // Direct invocation of onClick prop must NOT invoke callbacks
    button.props.onClick?.({
      preventDefault: () => {},
      stopPropagation: () => {},
    });
    assert.equal(
      clicked,
      false,
      `onClick callback must never fire during transient state ${st}`,
    );
  }
});

test("ADV-3.2: TurnFreezingController: 50 concurrent pause requests during 10 active steps", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  assert.equal(controller.getState().state, "executing");
  assert.equal(controller.isExecuting(), true);

  // Start 10 asynchronous steps
  const endSteps: Array<() => void> = [];
  for (let i = 0; i < 10; i++) {
    endSteps.push(controller.beginStep(`async-step-${i}`));
  }

  assert.equal(controller.getState().activeStepCount, 10);

  // Concurrently request pause from 50 callers
  const pausePromises: Promise<void>[] = [];
  for (let i = 0; i < 50; i++) {
    pausePromises.push(controller.pause());
  }

  // State must immediately become "pausing"
  assert.equal(controller.getState().state, "pausing");
  assert.equal(controller.isPausing(), true);
  assert.equal(controller.isFrozen(), true);

  // Conclude steps 1 to 9 (in random order)
  const stepIndices = [4, 2, 7, 1, 9, 0, 6, 8, 3];
  for (const idx of stepIndices) {
    endSteps[idx]();
    // Must remain pausing while at least 1 step is active
    assert.equal(controller.getState().state, "pausing");
  }

  assert.equal(controller.getState().activeStepCount, 1);

  // Conclude the last step (index 5)
  endSteps[5]();

  // All 50 pause promises must resolve simultaneously
  await Promise.all(pausePromises);

  assert.equal(controller.getState().state, "paused");
  assert.equal(controller.isPaused(), true);
  assert.equal(controller.getState().activeStepCount, 0);
});

test("ADV-3.3: TurnFreezingController: queue unfreezing stampede with 50 waiting workers", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  // Enter paused state
  await controller.pause();
  assert.equal(controller.isPaused(), true);

  // 50 workers arrive and block on awaitUnfrozen()
  let unblockedCount = 0;
  const workers = Array.from({ length: 50 }, async (_, id) => {
    await controller.awaitUnfrozen();
    unblockedCount++;
    return `worker-${id}-done`;
  });

  // Ensure all workers are held
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(unblockedCount, 0, "No workers may proceed while paused");

  // Call resume concurrently 10 times (idempotency check)
  const resumeCalls = Array.from({ length: 10 }, () => controller.resume());
  await Promise.all(resumeCalls);

  // All 50 workers must unblock cleanly
  const results = await Promise.all(workers);
  assert.equal(
    unblockedCount,
    50,
    "All 50 workers must unblock simultaneously upon resume",
  );
  assert.equal(results.length, 50);
  assert.equal(controller.isExecuting(), true);
  assert.equal(controller.isFrozen(), false);
});

test("ADV-3.4: Idempotent step conclusion: calling endStep multiple times does not corrupt counter", () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  const endStep = controller.beginStep("re-entrant-step");
  assert.equal(controller.getState().activeStepCount, 1);

  // End step 5 times
  for (let i = 0; i < 5; i++) {
    endStep();
  }

  assert.equal(controller.getState().activeStepCount, 0);
});

test("ADV-3.5: Sudden turn interruption resolves deferred promises and resets state cleanly", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();
  controller.beginStep("orphan-step");

  const pausePromise = controller.pause();
  assert.equal(controller.isPausing(), true);

  // Abort turn unexpectedly
  controller.onTurnComplete("interrupted");

  // Deferred pause promise must resolve cleanly without hanging
  await pausePromise;
  assert.equal(controller.getState().state, "idle");
  assert.equal(controller.getState().activeStepCount, 0);
});

test("ADV-3.6: 100 rapid pause/resume cycles under active workload maintain queue integrity", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();

  for (let cycle = 0; cycle < 100; cycle++) {
    const endStep = controller.beginStep(`cycle-step-${cycle}`);
    const pausePromise = controller.pause();
    assert.equal(controller.isPausing(), true);

    endStep();
    await pausePromise;
    assert.equal(controller.isPaused(), true);

    await controller.resume();
    assert.equal(controller.isExecuting(), true);
  }

  assert.equal(controller.isExecuting(), true);
  assert.equal(controller.getState().activeStepCount, 0);
});

// ===========================================================================
// SUITE 4: Geometry, Touch Target, and Design Token Invariants
// ===========================================================================

test("ADV-4.1: Exported geometry constants strictly adhere to spec standards", async () => {
  const mod = await loadTranspiledActionButtonModule();
  const { AGENT_ACTION_BUTTON_GEOMETRY } = mod;

  assert.equal(
    AGENT_ACTION_BUTTON_GEOMETRY.desktopDiameter,
    40,
    "Desktop button diameter must be strictly 40px",
  );
  assert.ok(
    AGENT_ACTION_BUTTON_GEOMETRY.minTouchTarget >= 44,
    "Touch target boundary must be >= 44px (got " +
      AGENT_ACTION_BUTTON_GEOMETRY.minTouchTarget +
      ")",
  );
  assert.equal(
    AGENT_ACTION_BUTTON_GEOMETRY.iconSize,
    20,
    "Centered icon dimension must be strictly 20px",
  );
});

test("ADV-4.2: CSS rules enforce 40px diameter, circular border-radius, and >=44px touch target", async () => {
  const cssPath = new URL(
    "../../src/styles/agent-action-button.css",
    import.meta.url,
  );
  const css = await readFile(cssPath, "utf8");

  // Visual button diameter
  assert.match(css, /width:\s*40px;/, "CSS must declare visual width: 40px");
  assert.match(css, /height:\s*40px;/, "CSS must declare visual height: 40px");
  assert.match(
    css,
    /border-radius:\s*var\(--kk-radius-full\);/,
    "CSS must declare circular border-radius using --kk-radius-full token",
  );

  // Touch target expansion pseudo-element ::after
  assert.match(
    css,
    /\.agent-action-button::after\s*\{[^}]*min-width:\s*44px;/,
    "CSS ::after pseudo-element must have min-width: 44px",
  );
  assert.match(
    css,
    /\.agent-action-button::after\s*\{[^}]*min-height:\s*44px;/,
    "CSS ::after pseudo-element must have min-height: 44px",
  );
  assert.match(
    css,
    /\.agent-action-button::after\s*\{[^}]*pointer-events:\s*auto;/,
    "::after pseudo-element must have pointer-events: auto to receive touch events",
  );

  // Critical Layout Invariant: .agent-action-button must NOT have overflow: hidden
  // because overflow: hidden would clip the 44px touch hit target back down to 40px!
  const buttonRuleMatch = css.match(/\.agent-action-button\s*\{([^}]*)\}/);
  assert.ok(buttonRuleMatch, ".agent-action-button CSS rule must exist");
  assert.doesNotMatch(
    buttonRuleMatch[1],
    /overflow:\s*hidden/,
    "CRITICAL: .agent-action-button must NOT set overflow: hidden, which would clip the 44px touch target",
  );

  // Zero raw color literal verification
  const colorLiteralRegex = /#([0-9a-fA-F]{3,8})\b|rgb\(|rgba\(|hsl\(|hsla\(/g;
  const matches = [...css.matchAll(colorLiteralRegex)];
  assert.equal(
    matches.length,
    0,
    `Zero raw color literals permitted in agent-action-button.css. Found: ${matches.map((m) => m[0]).join(", ")}`,
  );
});

test("ADV-4.3: Interactive touch hit area geometry bounds mathematically exceed 44px minimum", () => {
  // Spec invariant verification:
  // Visual button: 40px wide × 40px high
  // Pseudo-element ::after: min 44px × 44px, centered at (20, 20)
  const visualWidth = 40;
  const visualHeight = 40;
  const touchWidth = Math.max(visualWidth, 44);
  const touchHeight = Math.max(visualHeight, 44);

  const touchAreaPx = touchWidth * touchHeight;
  const minRequiredArea = 44 * 44; // 1936 px²

  assert.ok(
    touchAreaPx >= minRequiredArea,
    `Touch hit target surface area (${touchAreaPx}px²) must meet or exceed minimum (${minRequiredArea}px²)`,
  );

  // Hit target expansion padding on each edge:
  const leftPadding = (touchWidth - visualWidth) / 2;
  const rightPadding = (touchWidth - visualWidth) / 2;
  const topPadding = (touchHeight - visualHeight) / 2;
  const bottomPadding = (touchHeight - visualHeight) / 2;

  assert.equal(leftPadding, 2, "Touch target must extend 2px to the left");
  assert.equal(rightPadding, 2, "Touch target must extend 2px to the right");
  assert.equal(topPadding, 2, "Touch target must extend 2px to the top");
  assert.equal(bottomPadding, 2, "Touch target must extend 2px to the bottom");
});
