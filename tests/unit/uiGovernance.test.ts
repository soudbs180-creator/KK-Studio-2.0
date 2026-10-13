import assert from "node:assert/strict";
import test from "node:test";
import * as governance from "../../src/domain/uiGovernance.ts";
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

test("generation progress only reports returned results from evidence, never from an intent save", () => {
  const task = {
    status: "running" as const,
    completedOutputs: 0,
    requestedOutputs: 1,
  };
  for (const saveState of ["saved", "saving"] as const) {
    const labels = governance.getGenerationProgressLabels({ task, saveState });
    assert.match(labels.taskLabel, /生成中/);
    assert.doesNotMatch(labels.taskLabel, /返回|已保存|完成/);
  }
  const returned = governance.getGenerationProgressLabels({
    task,
    saveState: "saved",
    resultSaving: true,
  });
  assert.match(returned.taskLabel, /结果已返回.*保存/);
  assert.doesNotMatch(returned.saveLabel, /已保存/);
  const loading = governance.getGenerationProgressLabels({
    task,
    saveState: "loading",
    resultSaving: true,
  });
  assert.match(loading.taskLabel, /结果已返回.*读取/);
  assert.doesNotMatch(loading.taskLabel, /正在保存/);
});

test("generation completion waits for the current project save before claiming saved results", () => {
  const task = {
    status: "succeeded" as const,
    completedOutputs: 1,
    requestedOutputs: 1,
  };
  const saving = governance.getGenerationProgressLabels({
    task,
    saveState: "saving",
  });
  assert.match(saving.taskLabel, /已完成.*保存/);
  assert.doesNotMatch(saving.taskLabel, /已保存/);
  const saved = governance.getGenerationProgressLabels({
    task,
    saveState: "saved",
  });
  assert.match(saved.taskLabel, /结果已保存.*本机/);
  assert.equal(saved.saveLabel, "已保存");
  for (const saveState of ["write_error", "read_error", "conflict"] as const) {
    const failed = governance.getGenerationProgressLabels({
      task,
      saveState,
      resultSaving: true,
    });
    assert.match(failed.taskLabel, /已完成.*保存.*核对/);
    assert.doesNotMatch(failed.taskLabel, /生成失败|正在保存|已保存/);
    assert.match(failed.saveLabel, /失败|保护|冲突/);
  }
});

test("uncertain outputs retain their reason and override stale saving feedback", () => {
  const error =
    "供应商结果已返回，但本地素材归档失败；请先核对素材库，不会自动重复提交。";
  for (const task of [
    {
      status: "unknown" as const,
      error,
      completedOutputs: 1,
      requestedOutputs: 2,
    },
    {
      status: "succeeded" as const,
      error,
      completedOutputs: 1,
      requestedOutputs: 2,
      outputs: [{ status: "unknown" }],
    },
  ]) {
    const labels = governance.getGenerationProgressLabels({
      task,
      saveState: "saved",
      resultSaving: true,
    });
    assert.equal(labels.taskLabel, error);
    assert.doesNotMatch(labels.taskLabel, /正在保存|结果已保存/);
    assert.match(labels.saveLabel, /记录已保存.*结果需核对/);
  }
});

test("partial results and cancellation never become a full result success", () => {
  const partial = governance.getGenerationProgressLabels({
    task: { status: "partial", completedOutputs: 1, requestedOutputs: 4 },
    saveState: "saved",
  });
  assert.match(partial.taskLabel, /部分完成.*1\/4/);
  assert.doesNotMatch(partial.taskLabel, /结果已保存到本机|已完成/);
  const cancelled = governance.getGenerationProgressLabels({
    task: { status: "cancelled", completedOutputs: 0, requestedOutputs: 1 },
    saveState: "saved",
    resultSaving: true,
  });
  assert.equal(cancelled.taskLabel, "已取消");
  assert.equal(cancelled.saveLabel, "已保存");
});
