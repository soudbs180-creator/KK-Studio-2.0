import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AgentActionButton, {
  AGENT_ACTION_BUTTON_GEOMETRY,
  transitionAgentActionState,
  shouldDebounceClick,
} from "../../src/components/AgentActionButton.tsx";
import { createTurnFreezingController } from "../../src/features/agent/index.ts";

const render = (
  state: Parameters<typeof AgentActionButton>[0]["state"],
  hasDraft = true,
) =>
  renderToStaticMarkup(createElement(AgentActionButton, { state, hasDraft }));
test("R1-T1-01: real action reducer completes the six-state lifecycle", () => {
  let state: Parameters<typeof transitionAgentActionState>[0] = "idle";
  for (const [event, expected] of [
    ["SEND", "executing"],
    ["PAUSE_REQUEST", "pausing"],
    ["STEP_COMPLETED_PAUSE", "paused"],
    ["RESUME_REQUEST", "resuming"],
    ["STEP_RESUMED", "executing"],
    ["TASK_COMPLETED", "completed"],
    ["RESET", "idle"],
  ] as const) {
    state = transitionAgentActionState(state, event);
    assert.equal(state, expected);
  }
});
test("R1-T1-02: actual button DOM disables empty drafts and allows content", () => {
  assert.match(render("idle", false), /disabled=""/);
  assert.doesNotMatch(render("idle", true), /disabled=""/);
  assert.match(render("idle"), /aria-label="发送消息"/);
});
test("R1-T1-03: pause waits for the current atomic step before freezing", async () => {
  const controller = createTurnFreezingController();
  controller.onTurnStart();
  const finish = controller.beginStep();
  const paused = controller.pause();
  assert.equal(controller.getState().state, "pausing");
  finish();
  await paused;
  assert.equal(controller.isPaused(), true);
  controller.reset();
});
test("R1-T1-04: resume releases queued steps while preserving active-step accounting", async () => {
  const c = createTurnFreezingController();
  c.onTurnStart();
  await c.pause();
  let resumed = false;
  const waiter = c.awaitUnfrozen().then(() => {
    resumed = true;
  });
  await Promise.resolve();
  assert.equal(resumed, false);
  await c.resume();
  await waiter;
  assert.equal(resumed, true);
  assert.equal(c.getState().state, "executing");
  c.reset();
});
test("R1-T1-05: actual button uses current 44px geometry and 28px icon", () => {
  assert.deepEqual(AGENT_ACTION_BUTTON_GEOMETRY, {
    desktopDiameter: 44,
    minTouchTarget: 44,
    iconSize: 28,
  });
  assert.match(render("paused"), /继续执行/);
  assert.doesNotMatch(render("paused"), /disabled=""/);
});
test("R1-T2-01: real debounce rejects rapid clicks and allows the configured boundary", () => {
  assert.equal(shouldDebounceClick(1000, 1299, 300), true);
  assert.equal(shouldDebounceClick(1000, 1300, 300), false);
  assert.equal(shouldDebounceClick(0, 1), false);
});
test("R1-T2-02: pausing resuming and completed DOM states remain disabled", () => {
  for (const state of ["pausing", "resuming", "completed"] as const)
    assert.match(render(state), /disabled=""/);
});
test("R1-T2-03: pause requires every active step to settle", async () => {
  const c = createTurnFreezingController();
  c.onTurnStart();
  const first = c.beginStep("a"),
    second = c.beginStep("b");
  let paused = false;
  const pending = c.pause().then(() => {
    paused = true;
  });
  first();
  await Promise.resolve();
  assert.equal(paused, false);
  assert.equal(c.getState().activeStepCount, 1);
  second();
  await pending;
  assert.equal(c.isPaused(), true);
  c.reset();
});
test("R1-T2-04: reset releases frozen waiters and removes outstanding step state", async () => {
  const c = createTurnFreezingController();
  c.onTurnStart();
  await c.pause();
  const waiting = c.awaitUnfrozen();
  c.reset();
  await waiting;
  assert.equal(c.getState().state, "idle");
  assert.equal(c.getState().activeStepCount, 0);
});
test("R1-T2-05: duplicate step completion and unrelated transitions do not corrupt state", async () => {
  const c = createTurnFreezingController();
  c.onTurnStart();
  const finish = c.beginStep();
  const paused = c.pause();
  finish();
  finish();
  await paused;
  assert.equal(c.getState().activeStepCount, 0);
  assert.equal(transitionAgentActionState("paused", "SEND"), "paused");
  c.reset();
});
