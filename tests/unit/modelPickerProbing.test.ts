import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyLatencyTier,
  getLatencyTierClass,
  recordProbe,
  getProbeMetric,
  getAllProbeMetrics,
  clearProbeMetrics,
  subscribeProbeMetrics,
  probeEndpoint,
} from "../../src/features/models/modelProbeStore.ts";

test("modelPickerProbing: classifyLatencyTier 三档色标与异常判定", () => {
  // Green (<100ms): fast
  assert.equal(classifyLatencyTier(15), "fast");
  assert.equal(classifyLatencyTier(99), "fast");

  // Yellow (100ms - 499ms): moderate
  assert.equal(classifyLatencyTier(100), "moderate");
  assert.equal(classifyLatencyTier(250), "moderate");
  assert.equal(classifyLatencyTier(499), "moderate");

  // Red (>=500ms): slow
  assert.equal(classifyLatencyTier(500), "slow");
  assert.equal(classifyLatencyTier(999), "slow");

  // Red (异常 / 超时 / 负值 / 标志位): error
  assert.equal(classifyLatencyTier(40, true), "error");
  assert.equal(classifyLatencyTier(-1), "error");
  assert.equal(classifyLatencyTier(Number.NaN), "error");
  assert.equal(classifyLatencyTier(Number.POSITIVE_INFINITY), "error");
});

test("modelPickerProbing: getLatencyTierClass 类名映射与别名兼容", () => {
  assert.equal(getLatencyTierClass("fast"), "is-fast");
  assert.equal(getLatencyTierClass("moderate"), "is-moderate");
  assert.equal(getLatencyTierClass("medium"), "is-moderate");
  assert.equal(getLatencyTierClass("slow"), "is-slow");
  assert.equal(getLatencyTierClass("error"), "is-error");
});

test("modelPickerProbing: recordProbe 与 getProbeMetric 存取及索引", () => {
  clearProbeMetrics();

  const metric = recordProbe("conn-openai-1", "gpt-4o", 45, { ttftMs: 120 });
  assert.equal(metric.providerId, "conn-openai-1");
  assert.equal(metric.modelId, "gpt-4o");
  assert.equal(metric.latencyMs, 45);
  assert.equal(metric.ttftMs, 120);
  assert.equal(metric.tier, "fast");

  // 通过完整组合键查找
  const foundByBoth = getProbeMetric("conn-openai-1", "gpt-4o");
  assert.deepEqual(foundByBoth, metric);

  // 通过 providerId 单独查找
  const foundByProvider = getProbeMetric("conn-openai-1");
  assert.deepEqual(foundByProvider, metric);

  // 通过 modelId 单独查找
  const foundByModel = getProbeMetric("", "gpt-4o");
  assert.deepEqual(foundByModel, metric);

  // 获取全量指标
  const all = getAllProbeMetrics();
  assert.equal(all.length, 1);

  // 清空
  clearProbeMetrics();
  assert.equal(getAllProbeMetrics().length, 0);
  assert.equal(getProbeMetric("conn-openai-1", "gpt-4o"), undefined);
});

test("modelPickerProbing: subscribeProbeMetrics 侦听变更与取消订阅", () => {
  clearProbeMetrics();
  let calls = 0;

  const unsubscribe = subscribeProbeMetrics(() => {
    calls++;
  });

  recordProbe("conn-1", "model-1", 60);
  assert.equal(calls, 1);

  recordProbe("conn-2", "model-2", 300);
  assert.equal(calls, 2);

  clearProbeMetrics();
  assert.equal(calls, 3);

  unsubscribe();
  recordProbe("conn-3", "model-3", 700);
  assert.equal(calls, 3); // 取消订阅后不再触发
});

test("modelPickerProbing: probeEndpoint TTL 缓存与并发防抖", async () => {
  clearProbeMetrics();
  let fetchCount = 0;

  const mockFetcher = (async () => {
    fetchCount++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return new Response(null, { status: 200 });
  }) as unknown as typeof fetch;

  // 第一次探活
  const p1 = probeEndpoint("conn-test", "https://api.example.com", "m1", {
    fetcher: mockFetcher,
  });

  // 并发同目标探活（防抖）
  const p2 = probeEndpoint("conn-test", "https://api.example.com", "m1", {
    fetcher: mockFetcher,
  });

  const [res1, res2] = await Promise.all([p1, p2]);
  assert.equal(fetchCount, 1); // 并发探活仅发出一次网络请求
  assert.equal(res1.providerId, "conn-test");
  assert.equal(res2.providerId, "conn-test");

  // 缓存期内再次调用（不加 force），复用缓存
  const cached = await probeEndpoint("conn-test", "https://api.example.com", "m1", {
    fetcher: mockFetcher,
  });
  assert.equal(fetchCount, 1);
  assert.equal(cached.providerId, "conn-test");

  // 显式 force: true 强制刷新
  await probeEndpoint("conn-test", "https://api.example.com", "m1", {
    fetcher: mockFetcher,
    force: true,
  });
  assert.equal(fetchCount, 2);
});

test("modelPickerProbing: probeEndpoint 网络故障归一化为 error 状态", async () => {
  clearProbeMetrics();

  const failingFetcher = (async () => {
    throw new Error("Connection refused");
  }) as unknown as typeof fetch;

  const res = await probeEndpoint("conn-fail", "https://invalid.local", "m-err", {
    fetcher: failingFetcher,
  });

  assert.equal(res.tier, "error");
  assert.ok(res.error?.includes("Connection refused"));
});

test("modelPickerProbing: probeEndpoint 遇到 HTTP 4xx/5xx 响应时归一化为 error 状态而非 is-fast", async () => {
  clearProbeMetrics();

  const errorCodes = [400, 401, 403, 404, 429, 500, 502, 503];
  for (const status of errorCodes) {
    const errorFetcher = (async () => {
      // 模拟极速返回的错误响应（15ms），防止因延迟低而被错误标记为 is-fast
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response("Error Payload", {
        status,
        statusText: `Status-${status}`,
      });
    }) as unknown as typeof fetch;

    const res = await probeEndpoint(
      `conn-http-${status}`,
      "https://api.example.com",
      `m-${status}`,
      { fetcher: errorFetcher, force: true },
    );

    assert.equal(res.tier, "error");
    assert.equal(getLatencyTierClass(res.tier), "is-error");
    assert.notEqual(res.tier, "fast");
    assert.notEqual(getLatencyTierClass(res.tier), "is-fast");
    assert.ok(res.error?.includes(`HTTP ${status}`));
  }
});

test("modelPickerProbing: recordProbe 兼容字符串形式与对象形式的 error 选项", () => {
  clearProbeMetrics();

  // 字符串选项传参
  const stringErrMetric = recordProbe("conn-str", "m-str", 30, "error");
  assert.equal(stringErrMetric.tier, "error");
  assert.equal(getLatencyTierClass(stringErrMetric.tier), "is-error");
  assert.equal(stringErrMetric.error, "error");

  // 对象选项传参
  const objErrMetric = recordProbe("conn-obj", "m-obj", 25, { error: "HTTP 500 Server Error" });
  assert.equal(objErrMetric.tier, "error");
  assert.equal(getLatencyTierClass(objErrMetric.tier), "is-error");
  assert.equal(objErrMetric.error, "HTTP 500 Server Error");
});
