import assert from "node:assert/strict";
import test from "node:test";
import {
  geminiCliChat,
  geminiCliStatus,
  GeminiCliError,
  GEMINI_BRIDGE_DEFAULT_URL,
} from "../../src/features/agent/geminiCliAdapter.ts";

test("status parses installed and logged in bridge response", async () => {
  const calls: string[] = [];
  const status = await geminiCliStatus({
    baseUrl: "http://127.0.0.1:1424/",
    fetcher: async (url, init) => {
      calls.push(String(url));
      assert.equal(init?.method, "GET");
      return Response.json({ installed: true, version: "1.2.3", login: true });
    },
  });
  assert.deepEqual(calls, ["http://127.0.0.1:1424/status"]);
  assert.deepEqual(status, { installed: true, version: "1.2.3", login: true });
});

test("status reports unreachable when the bridge is down", async () => {
  await assert.rejects(
    geminiCliStatus({
      fetcher: async () => {
        throw new TypeError("fetch failed");
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof GeminiCliError);
      assert.equal(error.code, "unreachable");
      assert.ok(error.message.includes("gemini-bridge.mjs"));
      return true;
    },
  );
});

test("status maps bridge error payloads to codes", async () => {
  await assert.rejects(
    geminiCliStatus({
      fetcher: async () =>
        Response.json(
          { error: { code: "failed", message: "bridge broken" } },
          { status: 500 },
        ),
    }),
    (error: unknown) => {
      assert.ok(error instanceof GeminiCliError);
      assert.equal(error.code, "failed");
      return true;
    },
  );
});

test("chat sends prompt, resume session and model and parses text with sessionId", async () => {
  let sent: RequestInit | undefined;
  const result = await geminiCliChat(
    { prompt: "hello", resumeSessionId: "s-1", model: "gemini-2.5-pro" },
    new AbortController().signal,
    {
      fetcher: async (url, init) => {
        assert.equal(String(url), GEMINI_BRIDGE_DEFAULT_URL + "/chat");
        sent = init;
        return Response.json({ text: "hi back", sessionId: "s-2" });
      },
    },
  );
  assert.deepEqual(JSON.parse(String(sent?.body)), {
    prompt: "hello",
    resumeSessionId: "s-1",
    model: "gemini-2.5-pro",
  });
  assert.deepEqual(result, { text: "hi back", sessionId: "s-2" });
});

test("chat omits empty resume and model fields", async () => {
  let body: unknown;
  await geminiCliChat({ prompt: "plain" }, new AbortController().signal, {
    fetcher: async (url, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ text: "ok" });
    },
  });
  assert.deepEqual(body, { prompt: "plain" });
});

test("chat maps not-logged-in bridge errors", async () => {
  await assert.rejects(
    geminiCliChat({ prompt: "x" }, new AbortController().signal, {
      fetcher: async () =>
        Response.json(
          { error: { code: "not-logged-in", message: "请先登录" } },
          { status: 400 },
        ),
    }),
    (error: unknown) => {
      assert.ok(error instanceof GeminiCliError);
      assert.equal(error.code, "not-logged-in");
      return true;
    },
  );
});

test("chat rejects aborted signals as timeout", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    geminiCliChat({ prompt: "x" }, controller.signal, {
      fetcher: async () => {
        throw new TypeError("fetch failed");
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof GeminiCliError);
      assert.equal(error.code, "timeout");
      return true;
    },
  );
});

test("chat rejects empty and oversized prompts before any request", async () => {
  let called = false;
  const options = {
    fetcher: async () => {
      called = true;
      return Response.json({ text: "x" });
    },
  };
  await assert.rejects(
    geminiCliChat({ prompt: "   " }, new AbortController().signal, options),
    (error: unknown) => error instanceof GeminiCliError,
  );
  await assert.rejects(
    geminiCliChat(
      { prompt: "x".repeat(30001) },
      new AbortController().signal,
      options,
    ),
    (error: unknown) => error instanceof GeminiCliError,
  );
  assert.equal(called, false);
});
