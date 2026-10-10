import assert from "node:assert/strict";
import test from "node:test";
import { providerError } from "../../src/features/creation/imageGeneration.ts";

function response(status: number, headers?: Record<string, string>): Response {
  return new Response(null, { status, headers });
}

test("429：保留上游原始错误且 Retry-After 驱动重试窗口", () => {
  const error = providerError(
    response(429, { "Retry-After": "30" }),
    "Selected model is at capacity",
  );
  assert.equal(error.failureClass, "rate_limited");
  assert.equal(error.status, 429);
  assert.ok(error.message.includes("Selected model is at capacity"));
  assert.ok(error.message.includes("30 秒"));
  assert.equal(error.retryable, true);
  assert.equal(error.retryAfterSeconds, 30);
});

test("429：无 Retry-After 时不标记可重试且提示冷却后手动重试", () => {
  const error = providerError(response(429), "Selected model is at capacity");
  assert.equal(error.failureClass, "rate_limited");
  assert.equal(error.retryable, false, "没有 retry-after 不得盲目重试");
  assert.equal(error.retryAfterSeconds, undefined);
  assert.ok(error.message.includes("Selected model is at capacity"));
  assert.ok(error.message.includes("手动重试"));
});

test("401：保留原始错误并分类为 unauthorized 不可重试", () => {
  const error = providerError(response(401), "Incorrect API key provided");
  assert.equal(error.failureClass, "unauthorized");
  assert.equal(error.retryable, false);
  assert.ok(error.message.includes("Incorrect API key provided"));
});

test("500：保留原始错误并分类为 provider_unavailable", () => {
  const error = providerError(response(503), "The server is overloaded");
  assert.equal(error.failureClass, "provider_unavailable");
  assert.ok(error.message.includes("The server is overloaded"));
});

test("无上游 body 时回退到状态分类文案", () => {
  const error = providerError(response(400));
  assert.equal(error.failureClass, "invalid_request");
  assert.ok(error.message.includes("HTTP 400"));
});
