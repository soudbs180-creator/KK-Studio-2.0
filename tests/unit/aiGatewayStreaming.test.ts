import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultHighWaterMark, setDefaultHighWaterMark } from "node:stream";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import { extractNormalized } from "../../src/features/ai-gateway/scheduler.ts";
import { readTextStream } from "../../src/features/creation/textGeneration.ts";
import {
  fixture,
  deferred,
  bounded,
  captureWire,
  canary,
  observeBackpressure,
} from "../support/gatewayStreamingFixture.ts";

test("candidate Ark callback arrives before the finish barrier and retains usage after stop", async () => {
  const f = await fixture("gate");
  const first = deferred<string>();
  const deltas: string[] = [];
  const controller = new AbortController();
  const request = {
    idempotencyKey: "synthetic-adapter-stream",
    signal: controller.signal,
    resolveSecret: async () => canary,
    onTextDelta: async (delta: string) => {
      deltas.push(delta);
      first.resolve(delta);
    },
  };
  const pending = doubaoAdapter.submit(
    f.context,
    {
      model: "kk-default",
      operation: "chat",
      prompt: "synthetic",
      attachments: [],
    },
    request,
  );
  void pending.catch(() => undefined);
  try {
    await bounded(
      f.firstDelta.promise,
      "owned upstream never flushed first delta",
    );
    assert.equal(
      await bounded(
        first.promise,
        "Ark remained buffered behind the closed finish barrier",
      ),
      "你",
    );
    assert.equal(f.releaseFinish.released, false);
    f.releaseFinish.resolve();
    const result = await bounded(pending, "adapter did not finish");
    assert.equal(result.kind, "text");
    if (result.kind === "text") {
      assert.equal(result.text, "你好");
      assert.deepEqual(result.usage, {
        promptTokens: 2,
        completionTokens: 3,
        totalTokens: 5,
      });
    }
    assert.deepEqual(deltas, ["你", "好"]);
    assert.equal(f.requests[0].stream, true);
    assert.equal(f.requests[0].includeUsage, true);
  } finally {
    f.releaseFinish.resolve();
    controller.abort();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("candidate HTTP first chunk crosses the real upstream barrier and existing text consumer stays compatible", async () => {
  const f = await fixture("gate");
  const controller = new AbortController();
  const first = deferred<string>();
  const deltas: string[] = [];
  let raw = "";
  const pending = (async () => {
    const response = await f.request(controller.signal);
    assert.equal(response.status, 200);
    const rawPending = captureWire(response.clone());
    const result = await readTextStream(response, controller.signal, (text) => {
      deltas.push(text);
      first.resolve(text);
    });
    const wire = await rawPending;
    assert.equal(wire.complete, true);
    raw = wire.text;
    return result;
  })();
  void pending.catch(() => undefined);
  try {
    await bounded(
      f.firstDelta.promise,
      "owned upstream never flushed first delta",
    );
    assert.equal(
      await bounded(
        first.promise,
        "Gateway did not deliver a first chunk while finish was blocked",
      ),
      "你",
    );
    assert.equal(f.releaseFinish.released, false);
    f.releaseFinish.resolve();
    assert.equal(
      await bounded(pending, "HTTP stream did not complete"),
      "你好",
    );
    assert.deepEqual(deltas, ["你", "你好"]);
    assert.match(raw, /data: \[DONE\]/);
    assert(!raw.includes(canary));
    assert.equal(f.requests.length, 1);
  } finally {
    f.releaseFinish.resolve();
    controller.abort();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("candidate an already cancelled dispatch never resolves another credential or changes account health", async () => {
  const f = await fixture("json");
  const controller = new AbortController();
  controller.abort();
  const before = structuredClone([...f.scheduler.health().snapshot()]);
  try {
    await assert.rejects(f.dispatch(controller.signal));
    assert.deepEqual(f.secretRefs, []);
    assert.deepEqual([...f.scheduler.health().snapshot()], before);
    assert.equal(f.requests.length, 0);
  } finally {
    await f.close();
  }
});

test("candidate cancellation while waiting for the first chunk stops upstream without fallback or account failure", async () => {
  const f = await fixture("hang");
  const controller = new AbortController();
  const before = structuredClone([...f.scheduler.health().snapshot()]);
  const pending = f.dispatch(controller.signal);
  void pending.catch(() => undefined);
  try {
    await bounded(f.firstRequest.promise, "no upstream request");
    controller.abort();
    await assert.rejects(pending);
    await bounded(f.upstreamAborted.promise, "upstream did not observe cancel");
    assert.deepEqual(f.secretRefs, ["synthetic-a"]);
    assert.deepEqual([...f.scheduler.health().snapshot()], before);
    assert.equal(f.requests.length, 1);
  } finally {
    f.releaseFinish.resolve();
    controller.abort();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("candidate cancelling a pinned conversation preserves its account and health", async () => {
  const f = await fixture("pre503");
  const sessionId = "synthetic-sticky-session";
  const warm = new AbortController(),
    cancelled = new AbortController(),
    followup = new AbortController();
  let pending: Promise<unknown> | undefined;
  try {
    assert.equal((await f.dispatch(warm.signal, sessionId)).channelId, "b");
    f.setMode("hang");
    const before = structuredClone([...f.scheduler.health().snapshot()]);
    pending = f.dispatch(cancelled.signal, sessionId);
    void pending.catch(() => undefined);
    await bounded(
      f.requestCount(3),
      "pinned upstream never received cancel candidate",
    );
    cancelled.abort();
    await assert.rejects(pending);
    const afterCancel = structuredClone([...f.scheduler.health().snapshot()]);
    f.setMode("json");
    f.scheduler.health().reset("a");
    const next = await f.dispatch(followup.signal, sessionId);
    assert.equal(
      next.channelId,
      "b",
      "user cancellation must retain the successful session pin",
    );
    assert.deepEqual(
      afterCancel,
      before,
      "user cancellation must not change account health",
    );
  } finally {
    f.releaseFinish.resolve();
    warm.abort();
    cancelled.abort();
    followup.abort();
    await pending?.catch(() => undefined);
    await f.close();
  }
});

test("candidate a real HTTP disconnect before headers aborts its owned upstream", async () => {
  const f = await fixture("hang");
  const controller = new AbortController();
  const pending = f.request(controller.signal);
  void pending.catch(() => undefined);
  try {
    await bounded(f.firstRequest.promise, "no upstream request");
    controller.abort();
    await assert.rejects(pending);
    await bounded(
      f.upstreamAborted.promise,
      "HTTP disconnect was not propagated to the upstream",
    );
    assert.deepEqual(f.secretRefs, ["synthetic-a"]);
    assert.equal(f.requests.length, 1);
    assert.equal(f.scheduler.health().state("a").consecutiveFailures, 0);
  } finally {
    f.releaseFinish.resolve();
    controller.abort();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("candidate HTTP disconnect after first chunk aborts upstream without fallback", async () => {
  const f = await fixture("gate");
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const pending = f.request(controller.signal);
  void pending.catch(() => undefined);
  try {
    await bounded(f.firstDelta.promise, "no upstream first delta");
    const response = await bounded(
      pending,
      "HTTP first response stayed buffered",
    );
    reader = response.body!.getReader();
    await bounded(reader.read(), "no downstream first chunk");
    controller.abort();
    await reader.cancel().catch(() => undefined);
    await bounded(
      f.upstreamAborted.promise,
      "post-chunk disconnect did not stop upstream",
    );
    assert.equal(f.requests.length, 1);
    assert.deepEqual(f.secretRefs, ["synthetic-a"]);
    assert.equal(f.scheduler.health().state("a").consecutiveFailures, 0);
  } finally {
    f.releaseFinish.resolve();
    controller.abort();
    await reader?.cancel().catch(() => undefined);
    reader?.releaseLock();
    await pending.catch(() => undefined);
    await f.close();
  }
});

for (const mode of ["content_filter", "refusal"] as const) {
  test(`candidate ${mode} in SSE stays nonretryable and never switches account`, async () => {
    const f = await fixture(mode);
    const controller = new AbortController();
    try {
      await assert.rejects(f.dispatch(controller.signal), (error) => {
        const normalized = extractNormalized(error);
        assert.equal(normalized.errorClass, "CONTENT_BLOCKED");
        assert.equal(normalized.retryable, false);
        return true;
      });
      assert.equal(f.requests.length, 1);
      assert.deepEqual(f.secretRefs, ["synthetic-a"]);
    } finally {
      f.releaseFinish.resolve();
      controller.abort();
      await f.close();
    }
  });
}

for (const mode of ["post-error", "stop-truncate"] as const) {
  test(`candidate ${mode} after text never produces successful stop/DONE or fallback`, async () => {
    const f = await fixture(mode);
    const controller = new AbortController();
    const first = deferred();
    let raw = "";
    const pending = (async () => {
      const response = await f.request(controller.signal);
      const rawPending = captureWire(response.clone());
      try {
        return await readTextStream(response, controller.signal, () =>
          first.resolve(),
        );
      } finally {
        raw = (await rawPending).text;
      }
    })();
    void pending.catch(() => undefined);
    try {
      await bounded(f.firstDelta.promise, "no upstream first delta");
      await bounded(first.promise, "first HTTP delta was buffered");
      f.releaseFinish.resolve();
      await assert.rejects(bounded(pending, "incomplete stream did not end"));
      assert.equal(f.requests.length, 1);
      assert(!raw.includes("[DONE]"));
      assert(!/"finish_reason"\s*:\s*"stop"/.test(raw));
      assert(!raw.includes(canary));
      assert.deepEqual(f.secretRefs, ["synthetic-a"]);
    } finally {
      f.releaseFinish.resolve();
      controller.abort();
      await pending.catch(() => undefined);
      await f.close();
    }
  });
}

test("candidate a retryable error before output still falls back once to another account", async () => {
  const f = await fixture("pre503");
  const controller = new AbortController();
  try {
    const response = await f.request(controller.signal);
    assert.equal(response.status, 200);
    assert.equal(
      await readTextStream(response, controller.signal),
      "fallback success",
    );
    assert.deepEqual(
      f.requests.map((r) => r.channel),
      ["a", "b"],
    );
    assert.deepEqual(f.secretRefs, ["synthetic-a", "synthetic-b"]);
  } finally {
    controller.abort();
    await f.close();
  }
});

test("candidate nonstream JSON text and usage stay compatible", async () => {
  const f = await fixture("json");
  const controller = new AbortController();
  try {
    const response = await f.request(controller.signal, false);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.choices[0].message.content, "json success");
    assert.deepEqual(body.usage, {
      prompt_tokens: 2,
      completion_tokens: 3,
      total_tokens: 5,
    });
    assert(!JSON.stringify(body).includes(canary));
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].stream, false);
  } finally {
    controller.abort();
    await f.close();
  }
});

test("a stream error before headers preserves status without exposing upstream credentials", async () => {
  const f = await fixture("pre-error"),
    controller = new AbortController();
  try {
    const response = await f.request(controller.signal);
    assert.equal(response.status, 503);
    assert.match(
      response.headers.get("content-type") ?? "",
      /application\/json/,
    );
    const body = await response.text();
    assert(!body.includes(canary));
    assert.deepEqual(
      f.requests.map((request) => request.channel),
      ["a", "b"],
    );
  } finally {
    controller.abort();
    await f.close();
  }
});

test("stream usage forwards only supplied token fields", async () => {
  const f = await fixture("partial-usage"),
    controller = new AbortController();
  f.releaseFinish.resolve();
  try {
    const response = await f.request(controller.signal);
    assert.equal(response.status, 200);
    const frames = (await response.text())
      .split("\n")
      .filter((line) => line.startsWith("data: {"))
      .map((line) => JSON.parse(line.slice(6)));
    assert.deepEqual(frames.find((frame) => frame.usage)?.usage, {
      total_tokens: 5,
    });
  } finally {
    controller.abort();
    await f.close();
  }
});

test("real write(false) commits the retry fence and drains before a post-chunk error", async (t) => {
  const highWaterMark = getDefaultHighWaterMark(false);
  t.after(() => setDefaultHighWaterMark(false, highWaterMark));
  setDefaultHighWaterMark(false, 1);
  const f = await fixture("post-error");
  const observed = observeBackpressure(f),
    controller = new AbortController(),
    first = deferred();
  let raw = "";
  const pending = (async () => {
    const response = await f.request(controller.signal);
    const wire = captureWire(response.clone());
    try {
      return await readTextStream(response, controller.signal, () =>
        first.resolve(),
      );
    } finally {
      raw = (await wire).text;
    }
  })();
  void pending.catch(() => undefined);
  try {
    await bounded(
      observed.firstFalse.promise,
      "actual HTTP write never returned false",
    );
    assert(
      observed.fences.every(Boolean),
      "a false write is already committed before waiting for drain",
    );
    await bounded(
      first.promise,
      "backpressured first text never reached the client",
    );
    assert(observed.drains > 0);
    f.releaseFinish.resolve();
    await assert.rejects(pending);
    assert.deepEqual(
      f.requests.map((request) => request.channel),
      ["a"],
    );
    assert(!raw.includes("[DONE]"));
    assert(!/"finish_reason"\s*:\s*"stop"/.test(raw));
  } finally {
    f.releaseFinish.resolve();
    controller.abort();
    await pending.catch(() => undefined);
    await f.close();
  }
});

test("client cancel at a real false write releases drain and stops upstream without account failure", async (t) => {
  const highWaterMark = getDefaultHighWaterMark(false);
  t.after(() => setDefaultHighWaterMark(false, highWaterMark));
  setDefaultHighWaterMark(false, 1);
  const f = await fixture("gate"),
    controller = new AbortController();
  const observed = observeBackpressure(f, () => controller.abort());
  const pending = f.request(controller.signal);
  void pending.catch(() => undefined);
  try {
    await bounded(
      observed.firstFalse.promise,
      "actual HTTP write never returned false",
    );
    await assert.rejects(pending);
    await bounded(
      f.upstreamAborted.promise,
      "backpressure cancellation did not stop upstream",
    );
    await bounded(
      observed.settled.promise,
      "cancelled dispatch did not release its drain wait",
    );
    assert(observed.fences.every(Boolean));
    assert.equal(f.requests.length, 1);
    assert.deepEqual(f.secretRefs, ["synthetic-a"]);
    assert.equal(f.scheduler.health().state("a").consecutiveFailures, 0);
  } finally {
    f.releaseFinish.resolve();
    controller.abort();
    await pending.catch(() => undefined);
    await f.close();
  }
});
