import assert from "node:assert/strict";
import test from "node:test";
import {
  createProject,
  createTask,
  normalizeCreationSnapshot,
} from "../../src/features/creation/model.ts";
import {
  applyTaskCostReceipt,
  normalizeTaskCostReceipt,
} from "../../src/features/creation/taskState.ts";

function task() {
  return createTask(
    createProject({
      prompt: "fixture",
      model: "synthetic",
      kind: "image",
      attachments: [],
    }),
  );
}

function receipt(
  target: ReturnType<typeof task>,
  extra: Record<string, unknown> = {},
) {
  return {
    kind: "estimate",
    amount: 0.08,
    currency: "USD",
    source: "provider",
    providerId: "test-provider",
    receiptId: "quote-1",
    receivedAt: 1,
    taskId: target.id,
    idempotencyKey: target.idempotencyKey,
    ...extra,
  };
}

function read(target: ReturnType<typeof task>, extra: Record<string, unknown>) {
  return normalizeCreationSnapshot({
    version: 2,
    projects: [{ id: "p1", items: [], tasks: [{ ...target, ...extra }] }],
  })?.projects[0]?.tasks[0];
}

test("cost receipts validate complete bounded provenance and nonnegative finite amounts", () => {
  const target = task();
  const valid = receipt(target, { amount: 0 });
  assert.deepEqual(normalizeTaskCostReceipt(valid), valid);
  for (const extra of [
    { amount: -1 },
    { amount: Infinity },
    { amount: NaN },
    { currency: "usd" },
    { currency: "US" },
    { source: "real" },
    { kind: "charge" },
    { receiptId: "" },
    { receiptId: "x".repeat(161) },
    { providerId: "token=value" },
    { receivedAt: -1 },
    { receivedAt: 0.5 },
    { receivedAt: Number.MAX_SAFE_INTEGER + 1 },
    { taskId: "" },
    { idempotencyKey: "" },
    { apiKey: "forbidden" },
  ]) {
    assert.equal(
      normalizeTaskCostReceipt(receipt(target, extra)),
      undefined,
      JSON.stringify(extra),
    );
  }
  for (const input of [undefined, null, [], {}, "unknown"])
    assert.equal(normalizeTaskCostReceipt(input), undefined);
});

test("applying provider quotes preserves task identity and never marks an estimate as actual", () => {
  const target = task();
  const result = applyTaskCostReceipt(target, receipt(target));
  assert.equal(result.status, "applied");
  assert.equal(result.task.estimatedCostUsd, 0.08);
  assert.equal(result.task.actualCostUsd, undefined);
  assert.equal(result.task.status, "queued");
  assert.equal(target.estimatedCostUsd, undefined);
  assert.deepEqual(result.task.estimatedCostQuote, receipt(target));
});

test("cost application rejects cross-task and cross-idempotency receipts", () => {
  const target = task();
  for (const extra of [
    { taskId: "other-task" },
    { idempotencyKey: "other-intent" },
  ]) {
    const result = applyTaskCostReceipt(target, receipt(target, extra));
    assert.equal(result.status, "rejected");
    assert.equal(result.reason, "task_mismatch");
    assert.equal(result.task, target);
  }
});

test("duplicate receipts are idempotent and conflicting receipts cannot overwrite accepted costs", () => {
  const target = task();
  const first = applyTaskCostReceipt(target, receipt(target)).task;
  const duplicate = applyTaskCostReceipt(first, receipt(target));
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.task, first);
  for (const extra of [
    { amount: 10 },
    { receiptId: "quote-2" },
    { source: "fixture" },
  ]) {
    const result = applyTaskCostReceipt(first, receipt(target, extra));
    assert.equal(result.status, "rejected");
    assert.equal(result.reason, "receipt_conflict");
    assert.equal(result.task, first);
  }
  const actual = applyTaskCostReceipt(
    first,
    receipt(target, { kind: "actual", receiptId: "bill-1", amount: 0.06 }),
  );
  assert.equal(actual.status, "applied");
  assert.equal(actual.task.estimatedCostUsd, 0.08);
  assert.equal(actual.task.actualCostUsd, 0.06);
});

test("fixture receipts and non-USD records never become dollar billing claims", () => {
  const target = task();
  for (const extra of [
    { source: "fixture" },
    { currency: "CNY" },
    { kind: "actual", source: "fixture" },
    { kind: "actual", currency: "CNY" },
  ]) {
    const result = applyTaskCostReceipt(target, receipt(target, extra));
    assert.equal(result.status, "applied");
    assert.equal(result.task.estimatedCostUsd, undefined);
    assert.equal(result.task.actualCostUsd, undefined);
    const stored =
      extra.kind === "actual"
        ? result.task.actualCostReceipt
        : result.task.estimatedCostQuote;
    assert.equal(stored?.source, extra.source ?? "provider");
    assert.equal(stored?.currency, extra.currency ?? "USD");
  }
});

test("snapshot readback preserves receipt identity and derives the bound provider USD amount", () => {
  const target = task();
  const quote = receipt(target);
  const actual = receipt(target, {
    kind: "actual",
    receiptId: "bill-1",
    amount: 0.06,
  });
  const restored = read(target, {
    estimatedCostQuote: quote,
    actualCostReceipt: actual,
    estimatedCostUsd: 999,
    actualCostUsd: 999,
  });
  assert.deepEqual(restored?.estimatedCostQuote, quote);
  assert.deepEqual(restored?.actualCostReceipt, actual);
  assert.equal(restored?.estimatedCostUsd, 0.08);
  assert.equal(restored?.actualCostUsd, 0.06);
});

test("snapshot readback keeps missing costs unknown and strips invalid or misbound receipts", () => {
  const target = task();
  assert.equal(read(target, {})?.actualCostUsd, undefined);
  assert.equal(
    read(target, { estimatedCostUsd: Infinity, actualCostUsd: Infinity })
      ?.estimatedCostUsd,
    undefined,
  );
  assert.equal(
    read(target, { estimatedCostUsd: Infinity, actualCostUsd: Infinity })
      ?.actualCostUsd,
    undefined,
  );
  assert.equal(
    read(target, { estimatedCostUsd: -1, actualCostUsd: -1 })?.actualCostUsd,
    undefined,
  );
  for (const extra of [
    { taskId: "other-task" },
    { idempotencyKey: "other-intent" },
    { amount: -1 },
    { kind: "actual" },
  ]) {
    const restored = read(target, {
      estimatedCostQuote: receipt(target, extra),
    });
    assert.equal(restored?.estimatedCostQuote, undefined);
    assert.equal(restored?.estimatedCostUsd, undefined);
  }
  const legacy = read(target, { estimatedCostUsd: 0.08, actualCostUsd: 0.06 });
  assert.equal(legacy?.estimatedCostUsd, 0.08);
  assert.equal(legacy?.actualCostUsd, 0.06);
  assert.equal(legacy?.estimatedCostQuote, undefined);
  assert.equal(legacy?.actualCostReceipt, undefined);
});

test("snapshot receipt metadata prevents fixture/non-USD scalar spoofing", () => {
  const target = task();
  for (const extra of [{ source: "fixture" }, { currency: "CNY" }]) {
    const restored = read(target, {
      estimatedCostQuote: receipt(target, extra),
      actualCostReceipt: receipt(target, {
        ...extra,
        kind: "actual",
        receiptId: "bill-1",
      }),
      estimatedCostUsd: 999,
      actualCostUsd: 999,
    });
    assert.equal(restored?.estimatedCostUsd, undefined);
    assert.equal(restored?.actualCostUsd, undefined);
  }
});

test("snapshot receipts require a durable source task idempotency key", () => {
  const target = task();
  const restored = read(target, {
    idempotencyKey: undefined,
    estimatedCostQuote: receipt(target),
  });
  assert.equal(restored?.estimatedCostQuote, undefined);
  assert.equal(restored?.estimatedCostUsd, undefined);
});
