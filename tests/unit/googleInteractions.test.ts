import assert from "node:assert/strict";
import test from "node:test";
import {
  createGoogleInteractions,
  GoogleApiError,
  googleImageId,
} from "../../src/features/agent/googleInteractions.ts";

test("Google sends current Interactions fields with header credentials and exact normalized model", async () => {
  let sent: RequestInit | undefined;
  const client = createGoogleInteractions({
    apiKey: "test-private-key",
    fetcher: async (url, init) => {
      assert.equal(
        String(url),
        "https://generativelanguage.googleapis.com/v1beta/interactions",
      );
      sent = init;
      return Response.json({
        id: "turn-1",
        status: "completed",
        steps: [
          {
            type: "model_output",
            content: [
              { type: "text", text: "done" },
              { type: "image", mime_type: "image/png", data: "aGVsbG8=" },
            ],
          },
        ],
      });
    },
  });
  const result = await client.create(
    {
      model: "models/gemini-3.1-flash-image",
      input: "draw",
      mode: "image",
      aspectRatio: "1:1",
      imageSize: "2K",
      previousInteractionId: "previous",
      search: true,
    },
    new AbortController().signal,
  );
  const body = JSON.parse(String(sent?.body));
  assert.equal(body.model, "gemini-3.1-flash-image");
  assert.equal(body.previous_interaction_id, "previous");
  assert.deepEqual(body.response_format, [
    { type: "text" },
    { type: "image", aspect_ratio: "1:1", image_size: "2K" },
  ]);
  assert.deepEqual(body.tools, [{ type: "google_search" }]);
  assert.equal(sent?.redirect, "error");
  assert.equal(
    new Headers(sent?.headers).get("x-goog-api-key"),
    "test-private-key",
  );
  assert.ok(!String(sent?.body).includes("test-private-key"));
  assert.equal(result.text, "done");
  assert.equal(result.images.length, 1);
});

test("Google ignores thought images and exposes function calls for the KK tool loop", async () => {
  const client = createGoogleInteractions({
    apiKey: "key",
    fetcher: async () =>
      Response.json({
        id: "t1",
        status: "requires_action",
        steps: [
          {
            type: "thought",
            summary: [
              { type: "image", data: "aGVsbG8=", mime_type: "image/png" },
            ],
          },
          {
            type: "function_call",
            id: "call1",
            name: "canvas_get_state",
            arguments: {},
          },
        ],
      }),
  });
  const r = await client.create(
    { model: "gemini-3.8-flash", mode: "text", input: "read" },
    new AbortController().signal,
  );
  assert.equal(r.images.length, 0);
  assert.equal(r.calls[0].id, "call1");
  assert.equal(r.status, "requires_action");
});

test("Google rejects malformed outputs and never exposes an upstream credential echo", async () => {
  for (const status of [401, 429, 500]) {
    const client = createGoogleInteractions({
      apiKey: "private",
      fetcher: async () => new Response("private api key details", { status }),
    });
    await assert.rejects(
      client.create(
        { model: "gemini-3.8-flash", mode: "text", input: "hi" },
        new AbortController().signal,
      ),
      (err: unknown) =>
        err instanceof GoogleApiError &&
        !err.message.includes("private") &&
        err.status === status,
    );
  }
  const client = createGoogleInteractions({
    apiKey: "key",
    fetcher: async () => Response.json({ status: "completed", steps: [] }),
  });
  await assert.rejects(
    client.create(
      { model: "gemini-3.8-flash", mode: "text", input: "hi" },
      new AbortController().signal,
    ),
    /响应/,
  );
});

test("Google aborts before a request and stable image identity deduplicates output replay", async () => {
  let calls = 0;
  const client = createGoogleInteractions({
    apiKey: "key",
    fetcher: async () => {
      calls++;
      return Response.json({});
    },
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    client.create(
      { model: "gemini-3.8-flash", mode: "text", input: "hi" },
      controller.signal,
    ),
  );
  assert.equal(calls, 0);
  assert.equal(
    await googleImageId("interaction", 0),
    await googleImageId("interaction", 0),
  );
  assert.notEqual(
    await googleImageId("interaction", 0),
    await googleImageId("interaction", 1),
  );
});
