import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultHighWaterMark, setDefaultHighWaterMark } from "node:stream";
import type { ServerResponse } from "node:http";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import { extractNormalized } from "../../src/features/ai-gateway/scheduler.ts";
import {
  fixture,
  deferred,
  bounded,
  captureWire,
  canary,
  observeBackpressure,
} from "../support/gatewayStreamingFixture.ts";

const input = {
  model: "kk-default",
  operation: "chat" as const,
  prompt: "synthetic deadline prompt",
  attachments: [],
};
function isTimeout(error: unknown) {
  const normalized = extractNormalized(error);
  assert.equal(normalized.errorClass, "TIMEOUT");
  assert.equal(normalized.httpStatus, 504);
  assert.equal(normalized.retryable, true);
  return true;
}

for (const mode of ["hang", "heartbeat"] as const) {
  test(`Ark chat deadline bounds ${mode === "hang" ? "response headers" : "heartbeat-only SSE"} without external cancel`, async () => {
    const f = await fixture(mode, { timeoutMs: 200 });
    const controller = new AbortController();
    const pending = doubaoAdapter.submit(f.context, input, {
      idempotencyKey: `synthetic-deadline-${mode}`,
      signal: controller.signal,
      resolveSecret: async () => canary,
      ...(mode === "heartbeat" ? { onTextDelta: async () => undefined } : {}),
    });
    void pending.catch(() => undefined);
    try {
      await assert.rejects(
        bounded(pending, "chat ignored its context deadline"),
        isTimeout,
      );
      assert.equal(controller.signal.aborted, false);
      await bounded(f.upstreamAborted.promise, "deadline left upstream open");
      assert.equal(f.requests.length, 1);
    } finally {
      controller.abort();
      f.releaseFinish.resolve();
      await pending.catch(() => undefined);
      await f.close();
    }
  });
}

test("HTTP deadline before the first text falls back once with TIMEOUT account health", async () => {
  const f = await fixture("pre-timeout", { timeoutMs: { a: 200, b: 5000 } });
  const controller = new AbortController();
  const pending = f.request(controller.signal).then(captureWire);
  void pending.catch(() => undefined);
  try {
    const wire = await bounded(pending, "deadline did not permit fallback");
    assert.equal(wire.complete, true);
    assert(wire.text.includes("[DONE]"));
    assert.deepEqual(
      f.requests.map((request) => request.channel),
      ["a", "b"],
    );
    assert.deepEqual(f.secretRefs, ["synthetic-a", "synthetic-b"]);
    assert.equal(f.scheduler.health().state("a").consecutiveFailures, 1);
    assert.equal(f.scheduler.health().state("b").consecutiveFailures, 0);
  } finally {
    controller.abort();
    f.releaseFinish.resolve();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("HTTP deadline after text stops the stream without fallback, stop, or DONE", async () => {
  const f = await fixture("gate", { timeoutMs: 200 });
  const controller = new AbortController();
  const pending = f.request(controller.signal).then(captureWire);
  void pending.catch(() => undefined);
  try {
    const wire = await bounded(
      pending,
      "post-text stream ignored its deadline",
    );
    assert(wire.text.includes("你"));
    assert(wire.text.includes('"code":"TIMEOUT"'));
    assert(!wire.text.includes("[DONE]"));
    assert(!/"finish_reason"\s*:\s*"stop"/.test(wire.text));
    assert.equal(f.requests.length, 1);
    assert.deepEqual(f.secretRefs, ["synthetic-a"]);
    assert.equal(f.scheduler.health().state("a").consecutiveFailures, 1);
  } finally {
    controller.abort();
    f.releaseFinish.resolve();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("deadline releases an awaited delta callback with its attempt signal", async () => {
  const f = await fixture("gate", { timeoutMs: 200 });
  const controller = new AbortController(),
    entered = deferred(),
    releaseCallback = deferred();
  let attemptSignal: AbortSignal | undefined;
  const pending = doubaoAdapter.submit(f.context, input, {
    idempotencyKey: "synthetic-deadline-callback",
    signal: controller.signal,
    resolveSecret: async () => canary,
    onTextDelta: async (_delta: string, signal?: AbortSignal) => {
      attemptSignal = signal;
      entered.resolve();
      await releaseCallback.promise;
    },
  });
  void pending.catch(() => undefined);
  try {
    await bounded(entered.promise, "delta callback was not entered");
    await assert.rejects(
      bounded(pending, "deadline did not release awaited callback"),
      isTimeout,
    );
    assert.equal(attemptSignal?.aborted, true);
    assert.equal(controller.signal.aborted, false);
  } finally {
    controller.abort();
    releaseCallback.resolve();
    f.releaseFinish.resolve();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("deadline releases real write(false) drain listeners while the downstream remains corked", async (t) => {
  const highWaterMark = getDefaultHighWaterMark(false);
  t.after(() => setDefaultHighWaterMark(false, highWaterMark));
  setDefaultHighWaterMark(false, 1);
  const f = await fixture("gate", { timeoutMs: 200 });
  const controller = new AbortController();
  const observed = observeBackpressure(f);
  let response: ServerResponse | undefined;
  let observerDrainListeners = 0;
  f.gateway.on("request", (_req, res) => {
    response = res;
    observerDrainListeners = res.listenerCount("drain");
    res.cork();
  });
  const pending = f.request(controller.signal).then(captureWire);
  void pending.catch(() => undefined);
  try {
    await bounded(observed.firstFalse.promise, "no real false write");
    assert(response!.writableCorked > 0);
    assert.equal(observed.drains, 0);
    await bounded(
      observed.settled.promise,
      "deadline left dispatch awaiting drain",
    );
    assert.equal(response!.listenerCount("drain"), observerDrainListeners);
    const wire = await bounded(pending, "deadline left downstream open");
    assert(!wire.text.includes("[DONE]"));
    assert.equal(f.requests.length, 1);
  } finally {
    response?.uncork();
    controller.abort();
    f.releaseFinish.resolve();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("the final success-frame drain is bounded by the same attempt deadline", async (t) => {
  const highWaterMark = getDefaultHighWaterMark(false);
  t.after(() => setDefaultHighWaterMark(false, highWaterMark));
  setDefaultHighWaterMark(false, 1);
  const f = await fixture("json", { timeoutMs: 200 });
  const controller = new AbortController(),
    finalFalse = deferred(),
    closed = deferred();
  let response: ServerResponse | undefined;
  f.gateway.on("request", (_req, res) => {
    response = res;
    res.once("close", () => closed.resolve());
    const write = res.write;
    res.write = ((...args: Parameters<typeof res.write>) => {
      const final = String(args[0]).includes("[DONE]");
      if (final) res.cork();
      const accepted = Reflect.apply(write, res, args) as boolean;
      if (final && !accepted) finalFalse.resolve();
      return accepted;
    }) as typeof res.write;
  });
  const pending = f.request(controller.signal).then(captureWire);
  void pending.catch(() => undefined);
  try {
    await bounded(finalFalse.promise, "no real false final-frame write");
    await bounded(closed.promise, "final-frame drain ignored the deadline");
    const wire = await bounded(
      pending,
      "final-frame timeout did not close wire",
    );
    assert.equal(wire.complete, false);
    assert(!wire.text.includes("[DONE]"));
    assert(!/"finish_reason"\s*:\s*"stop"/.test(wire.text));
    assert.equal(response!.listenerCount("drain"), 0);
    assert.equal(f.requests.length, 1);
  } finally {
    response?.uncork();
    controller.abort();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("caller cancellation wins a simultaneous deadline without changing health or session pin", async () => {
  const f = await fixture("pre503", { timeoutMs: 200 });
  const sessionId = "synthetic-deadline-sticky",
    controller = new AbortController();
  const reason = new Error("synthetic caller cancellation");
  const releaseCallback = deferred();
  let pending: Promise<unknown> | undefined;
  try {
    assert.equal(
      (await f.dispatch(controller.signal, sessionId)).channelId,
      "b",
    );
    const before = structuredClone([...f.scheduler.health().snapshot()]);
    f.setMode("gate");
    pending = f.scheduler.dispatch({
      model: "kk-default",
      operation: "chat",
      input,
      idempotencyKey: "synthetic-caller-deadline",
      sessionId,
      signal: controller.signal,
      resolveSecret: f.resolveSecret,
      onTextDelta: async (_delta, _channelId, attemptSignal?: AbortSignal) => {
        assert(attemptSignal, "the attempt signal must reach the caller");
        attemptSignal.addEventListener(
          "abort",
          () => controller.abort(reason),
          {
            once: true,
          },
        );
        await releaseCallback.promise;
      },
    });
    void pending.catch(() => undefined);
    await assert.rejects(
      bounded(pending, "caller abort did not finish"),
      (error) => {
        assert.equal(error, reason);
        return true;
      },
    );
    assert.deepEqual([...f.scheduler.health().snapshot()], before);
    assert.deepEqual(f.secretRefs, [
      "synthetic-a",
      "synthetic-b",
      "synthetic-b",
    ]);
    f.scheduler.health().reset("a");
    f.setMode("json");
    assert.equal(
      (await f.dispatch(new AbortController().signal, sessionId)).channelId,
      "b",
    );
  } finally {
    releaseCallback.resolve();
    f.releaseFinish.resolve();
    controller.abort();
    await pending?.catch(() => undefined);
    await f.close();
  }
});
