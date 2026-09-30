import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllowedActions,
  getDisabledReason,
  getGenerationUiState,
  type GenerationContext,
  type GenerationUiState,
} from "../../src/domain/uiGovernance.ts";

const base: GenerationContext = {
  prompt: "一只在夜色中奔跑的兔子",
  inputValid: true,
  modelConfigured: true,
  quotaAvailable: true,
  online: true,
  serviceConfigured: true,
};

function state(context: Partial<GenerationContext>): GenerationUiState {
  return getGenerationUiState({ ...base, ...context });
}

test("maps the Figma state matrix to the eleven canonical UI states", () => {
  assert.equal(state({ prompt: "", modelConfigured: true }), "idle");
  assert.equal(state({ prompt: "草稿", inputValid: false }), "editing");
  assert.equal(state({ validationError: "比例无效" }), "validation-error");
  assert.equal(state({}), "ready");
  assert.equal(state({ taskStatus: "queued" }), "queued");
  assert.equal(state({ taskStatus: "running" }), "running");
  assert.equal(state({ taskStatus: "succeeded" }), "success");
  assert.equal(state({ taskStatus: "failed" }), "failure");
  assert.equal(state({ taskStatus: "cancelled" }), "cancelled");
  assert.equal(state({ online: false }), "offline");
  assert.equal(state({ serviceConfigured: false }), "service-unconfigured");
});

test("does not allow submit when model or service is unconfigured", () => {
  const modelMissing = { ...base, modelConfigured: false };
  const serviceMissing = { ...base, serviceConfigured: false };

  assert.equal(getGenerationUiState(modelMissing), "service-unconfigured");
  assert.equal(
    getAllowedActions("service-unconfigured").includes("submit"),
    false,
  );
  assert.match(getDisabledReason("service-unconfigured") ?? "", /设置/);
  assert.equal(getGenerationUiState(serviceMissing), "service-unconfigured");
});

test("running and queued tasks keep view/cancel but reject duplicate submit", () => {
  for (const taskStatus of ["queued", "running"] as const) {
    const current = getAllowedActions(
      taskStatus === "queued" ? "queued" : "running",
    );
    assert.equal(current.includes("view-task"), true);
    assert.equal(current.includes("cancel"), true);
    assert.equal(current.includes("submit"), false);
  }
});

test("failure and cancellation preserve recovery actions", () => {
  assert.deepEqual(getAllowedActions("failure"), [
    "retry",
    "view-reason",
    "feedback",
  ]);
  assert.deepEqual(getAllowedActions("cancelled"), ["resubmit", "view-record"]);
  assert.match(getDisabledReason("failure") ?? "", /空结果/);
});
