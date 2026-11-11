import test from "node:test";
import assert from "node:assert/strict";
import { deduplicateRelayEntries } from "../../src/features/models/modelDeduplication.ts";
import { searchModels } from "../../src/features/models/modelSearch.ts";
import type { Entry } from "../../src/features/models/modelMenuEntries.ts";
import { gatewayFixture } from "../support/gatewayFixture.ts";
const entry = (
  id: string,
  model = "model",
  priority = 100,
  state = "active",
): Entry => ({
  id,
  label: `Model ${model}`,
  detail: id,
  selection: { source: "api", connectionId: id, model },
  metadata: { connectionName: id, priority, weight: 1, state },
  terms: [id, model],
});
test("R3-T1-01: production catalog merges same model connections", () => {
  const rows = deduplicateRelayEntries([
    entry("a"),
    entry("b"),
    entry("c", "other"),
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].metadata?.candidateConnectionIds, ["a", "b"]);
});
test("R3-T1-02: real menu metadata reports merged connection badge", () => {
  const [row] = deduplicateRelayEntries([entry("a"), entry("b"), entry("c")]);
  assert.equal(row.metadata?.count, 3);
  assert.equal(row.badge, "中转 · 3 个连接可用");
});
test("R3-T1-03: single provider preserves its original menu row", () => {
  const original = entry("official");
  assert.deepEqual(deduplicateRelayEntries([original]), [original]);
});
test("R3-T1-04: priority chooses the actual primary connection", () => {
  const [row] = deduplicateRelayEntries([
    entry("low", "model", 10),
    entry("high", "model", 100),
  ]);
  assert.equal(row.selection?.connectionId, "high");
  assert.deepEqual(row.metadata?.candidateConnectionIds, ["high", "low"]);
});
test("R3-T1-05: real scheduler dispatches to the primary adapter", async () => {
  const f = gatewayFixture();
  assert.equal((await f.scheduler.dispatch(f.request)).channelId, "primary");
  assert.deepEqual(f.submissions, ["primary"]);
});
test("R3-T2-01: disabled connections cannot outrank an active candidate", () => {
  const [row] = deduplicateRelayEntries([
    entry("disabled", "model", 200, "disabled"),
    entry("active", "model", 1),
  ]);
  assert.equal(row.selection?.connectionId, "active");
  assert.equal(row.disabled, undefined);
});
test("R3-T2-02: real scheduler fails over only after explicit pre-acceptance rate limit", async () => {
  const f = gatewayFixture({ failPrimary: true });
  assert.equal((await f.scheduler.dispatch(f.request)).channelId, "secondary");
  assert.deepEqual(f.submissions, ["primary", "secondary"]);
});
test("R3-T2-03: failed polling of accepted work never dispatches a second task", async () => {
  const f = gatewayFixture({ asyncPrimary: true });
  const result = await f.scheduler.dispatch(f.request);
  assert.equal(result.kind, "submitted");
  await assert.rejects(f.scheduler.poll("primary", "accepted-job", f.request));
  assert.deepEqual(f.submissions, ["primary"]);
  assert.deepEqual(f.polls, ["primary"]);
});
test("R3-T2-04: real search finds canonical model and relay alias terms", () => {
  const rows = deduplicateRelayEntries([
    entry("relay-alias"),
    entry("other-relay"),
  ]);
  assert.equal(searchModels(rows, "relay-alias").length, 1);
  assert.equal(searchModels(rows, "model").length, 1);
  assert.equal(searchModels(rows, "nonexistent999").length, 0);
});
test("R3-T2-05: equal-priority connections rank by configured weight", () => {
  const a = entry("a"),
    b = entry("b");
  a.metadata!.weight = 90;
  b.metadata!.weight = 10;
  const [row] = deduplicateRelayEntries([b, a]);
  assert.equal(row.selection?.connectionId, "a");
  assert.deepEqual(row.metadata?.candidateConnectionIds, ["a", "b"]);
});
