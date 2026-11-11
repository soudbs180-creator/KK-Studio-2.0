import assert from "node:assert/strict";
import test from "node:test";
import {
  clearUsageRecords,
  getDailySummaries,
  getModelBreakdown,
  getUsageKpis,
  getUsageRecords,
  recordUsage,
  seedSampleUsageIfEmpty,
} from "../../src/features/usage/tokenUsageStore.ts";

test("tokenUsageStore records and calculates token usage correctly", () => {
  clearUsageRecords();
  assert.equal(getUsageRecords().length, 0);

  const now = Date.now();
  const rec1 = recordUsage({
    provider: "deepseek",
    model: "DeepSeek-V3",
    promptTokens: 120,
    completionTokens: 350,
    timestamp: now,
  });

  assert.equal(rec1.totalTokens, 470);
  assert.equal(rec1.promptTokens, 120);
  assert.equal(rec1.completionTokens, 350);
  assert.equal(rec1.model, "DeepSeek-V3");
  assert.equal(rec1.status, "succeeded");

  const rec2 = recordUsage({
    provider: "openai",
    model: "GPT-4o",
    promptTokens: 50,
    completionTokens: 80,
    totalTokens: 130,
    timestamp: now,
    costUsd: 0.002,
    latencyMs: 240,
  });

  assert.equal(rec2.totalTokens, 130);
  assert.equal(rec2.costUsd, 0.002);

  const all = getUsageRecords();
  assert.equal(all.length, 2);
});

test("tokenUsageStore computes daily summaries and model breakdowns", () => {
  clearUsageRecords();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  recordUsage({
    model: "DeepSeek-V3",
    promptTokens: 100,
    completionTokens: 200,
    timestamp: now,
  });

  recordUsage({
    model: "DeepSeek-V3",
    promptTokens: 300,
    completionTokens: 400,
    timestamp: now,
  });

  recordUsage({
    model: "Claude-3.5-Sonnet",
    promptTokens: 500,
    completionTokens: 500,
    timestamp: oneDayAgo,
  });

  const breakdown = getModelBreakdown();
  assert.equal(breakdown["DeepSeek-V3"], 1000);
  assert.equal(breakdown["Claude-3.5-Sonnet"], 1000);

  const daily7 = getDailySummaries(7);
  assert.equal(daily7.length, 7);

  const todaySummary = daily7[daily7.length - 1];
  assert.equal(todaySummary.totalTokens, 1000);
  assert.equal(todaySummary.requests, 2);

  const yesterdaySummary = daily7[daily7.length - 2];
  assert.equal(yesterdaySummary.totalTokens, 1000);
  assert.equal(yesterdaySummary.requests, 1);
});

test("tokenUsageStore KPI calculation and clearing", () => {
  clearUsageRecords();

  recordUsage({
    promptTokens: 200,
    completionTokens: 300,
  });

  const kpis = getUsageKpis();
  assert.equal(kpis.totalTokens, 500);
  assert.equal(kpis.promptTokens, 200);
  assert.equal(kpis.completionTokens, 300);
  assert.equal(kpis.totalRequests, 1);
  assert.equal(kpis.todayTokens, 500);

  clearUsageRecords();
  const clearedKpis = getUsageKpis();
  assert.equal(clearedKpis.totalTokens, 0);
  assert.equal(clearedKpis.totalRequests, 0);
});

test("seedSampleUsageIfEmpty generates initial telemetry only when empty", () => {
  clearUsageRecords();
  assert.equal(getUsageRecords().length, 0);

  seedSampleUsageIfEmpty();
  const seeded = getUsageRecords();
  assert.ok(seeded.length > 0, "Expected sample records to be seeded");

  const countBefore = seeded.length;
  seedSampleUsageIfEmpty();
  assert.equal(
    getUsageRecords().length,
    countBefore,
    "Should not duplicate if not empty",
  );
});
