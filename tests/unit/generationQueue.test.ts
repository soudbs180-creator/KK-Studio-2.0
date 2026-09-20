import assert from "node:assert/strict";
import test from "node:test";
import {
  canStartQueueItem,
  mapWithConcurrency,
  nextBatchStatus,
  retryDelayMs,
  selectConnection,
} from "../../src/features/creation/generationQueue.ts";
import {
  canScheduleConnection,
  type ProviderConnection,
} from "../../src/domain/providerConnections.ts";

test("queue only starts active connections below concurrency and cooldown", () => {
  const item = {
    id: "job-1",
    requestedOutputs: 4,
    completedOutputs: 0,
    status: "queued" as const,
    idempotencyKey: "job-1-key",
    createdAt: 1,
    updatedAt: 1,
  };
  assert.equal(
    canStartQueueItem(item, {
      state: "active",
      activeJobs: 0,
      concurrencyLimit: 2,
    }),
    true,
  );
  assert.equal(
    canStartQueueItem(
      item,
      {
        state: "cooldown",
        activeJobs: 0,
        concurrencyLimit: 2,
        cooldownUntil: 10,
      },
      9,
    ),
    false,
  );
  assert.equal(
    canStartQueueItem(
      item,
      {
        state: "cooldown",
        activeJobs: 0,
        concurrencyLimit: 2,
        cooldownUntil: 10,
      },
      10,
    ),
    true,
  );
  assert.equal(
    canStartQueueItem(item, {
      state: "active",
      activeJobs: 2,
      concurrencyLimit: 2,
    }),
    false,
  );
});

test("retry delay respects provider Retry-After and caps exponential backoff", () => {
  assert.equal(retryDelayMs(4, 3), 3000);
  assert.equal(retryDelayMs(8), 60000);
});

test("connection selection excludes local OAuth and chooses the least-loaded API", () => {
  const base: ProviderConnection = {
    id: "api-1",
    provider: "test",
    kind: "user_byok",
    displayName: "API 1",
    baseUrl: "https://one.example.test/v1",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      async: false,
    },
    state: "active",
    concurrencyLimit: 2,
    activeJobs: 1,
  };
  const selected = selectConnection(
    [
      base,
      { ...base, id: "api-2", displayName: "API 2", activeJobs: 0 },
      { ...base, id: "oauth", kind: "user_oauth_local", activeJobs: 0 },
    ],
    "image",
  );
  assert.equal(selected?.id, "api-2");
});

test("batch state distinguishes complete, partial and failed output sets", () => {
  assert.equal(nextBatchStatus(4, 4, false), "succeeded");
  assert.equal(nextBatchStatus(4, 2, true), "partial");
  assert.equal(nextBatchStatus(4, 0, true), "failed");
});

test("bounded worker map preserves result order", async () => {
  let active = 0;
  let peak = 0;
  const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, value === 1 ? 5 : 1));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(result, [2, 4, 6, 8]);
  assert.equal(peak, 2);
});

test("expired cooldown is eligible without treating an active cooldown as ready", () => {
  const connection: ProviderConnection = {
    id: "cooldown",
    provider: "test",
    kind: "user_byok",
    displayName: "Cooldown",
    baseUrl: "https://cooldown.example.test/v1",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      async: false,
    },
    state: "cooldown",
    cooldownUntil: 100,
    concurrencyLimit: 1,
  };
  assert.equal(selectConnection([connection], "image", "generate", 99), null);
  assert.equal(
    selectConnection([connection], "image", "generate", 100)?.id,
    "cooldown",
  );
  assert.equal(
    selectConnection([connection], "image", "generate", 101)?.id,
    "cooldown",
  );
  // A clock beyond wall time catches failure to pass the scheduler's clock down.
  const future = { ...connection, cooldownUntil: Date.now() + 86_400_000 };
  assert.equal(
    selectConnection([future], "image", "generate", future.cooldownUntil)?.id,
    "cooldown",
  );
  assert.equal(
    connection.state,
    "cooldown",
    "eligibility must not fake health-probe success",
  );
  assert.equal(
    selectConnection(
      [{ ...connection, cooldownUntil: undefined }],
      "image",
      "generate",
      100,
    ),
    null,
  );
  for (const state of ["quarantined", "disabled", "degraded"] as const)
    assert.equal(
      selectConnection([{ ...connection, state }], "image", "generate", 100),
      null,
    );
  assert.equal(
    selectConnection(
      [{ ...connection, activeJobs: 1 }],
      "image",
      "generate",
      100,
    ),
    null,
  );
  assert.equal(selectConnection([connection], "video", "generate", 100), null);
  assert.equal(selectConnection([connection], "image", "edit", 100), null);
  assert.equal(
    canScheduleConnection(
      { ...connection, state: "active" },
      "image",
      "generate",
      99,
    ),
    false,
  );
});
