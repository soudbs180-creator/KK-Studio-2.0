import test from "node:test";
import assert from "node:assert/strict";
import { ServiceError } from "../src/services/httpClient.ts";
import {
  videoBytes,
  videoConnection,
  videoInput,
  videoJson,
} from "./videoFixture.ts";

const videoModule =
  await import("../src/services/twelveAiVideoClient.ts").catch(() => undefined);
function client(fetcher: typeof fetch, timeoutMs = 500) {
  assert.ok(videoModule, "12ai video client must be implemented");
  return videoModule.createTwelveAiVideoClient({
    fetch: fetcher,
    timeoutMs,
    credentials: { read: async () => "synthetic-video-secret" },
  });
}
test("documented text-video models submit the precise supported body once", async () => {
  for (const [model, path, body] of [
    [
      "seedance-2.0",
      "/v1/task/submit",
      {
        model: "seedance-2.0",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "seedance-2.0-fast",
      "/v1/task/submit",
      {
        model: "seedance-2.0-fast",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "seedance-2.5",
      "/v1/task/submit",
      {
        model: "seedance-2.5",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "veo-3.1-generate-preview",
      "/v1/task/submit",
      {
        model: "veo-3.1-generate-preview",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "veo-3.1-fast-generate-preview",
      "/v1/task/submit",
      {
        model: "veo-3.1-fast-generate-preview",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "happy-horse-1.1",
      "/v1/task/submit",
      {
        model: "happy-horse-1.1",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "gemini-omni-1.1-flash",
      "/v1/task/submit",
      {
        model: "gemini-omni-1.1-flash",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "gemini-omni-flash-preview",
      "/v1/task/submit",
      {
        model: "gemini-omni-flash-preview",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "MiniMax-H3",
      "/v1/task/submit",
      {
        model: "MiniMax-H3",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "768P",
        },
      },
    ],
    [
      "kling-3.0-turbo",
      "/v1/task/submit",
      {
        model: "kling-3.0-turbo",
        input: {
          prompt: videoInput.prompt,
          duration: 4,
          aspect_ratio: "16:9",
          resolution: "720p",
        },
      },
    ],
    [
      "sora-2",
      "/v1/videos",
      {
        model: "sora-2",
        prompt: videoInput.prompt,
        seconds: "4",
        size: "1280x720",
      },
    ],
  ] as const) {
    const requests: RequestInit[] = [];
    const service = client(async (url, init) => {
      assert.equal(String(url), `https://cdn.12ai.org${path}`);
      assert.equal(init?.method, "POST");
      assert.equal(
        new Headers(init.headers).get("authorization"),
        "Bearer synthetic-video-secret",
      );
      assert.equal(new Headers(init.headers).has("idempotency-key"), false);
      assert.equal(init.redirect, "error");
      assert.deepEqual(JSON.parse(String(init.body)), body);
      requests.push(init);
      return videoJson({ id: "task-known", status: "queued" });
    });
    assert.equal(
      (await service.submit({ ...videoInput, model })).id,
      "task-known",
    );
    await assert.rejects(
      service.submit({ ...videoInput, model }),
      /SUBMISSION_ALREADY_STARTED/,
    );
    assert.equal(requests.length, 1);
  }
});
test("GET rejection and missing credentials keep existing upstream job acceptance unknown", async () => {
  for (const status of [401, 404, 500]) {
    await assert.rejects(
      client(async () => videoJson({}, status)).get(
        videoConnection,
        "sora-2",
        "upstream-video",
      ),
      (error) =>
        error instanceof ServiceError && error.submissionState === "unknown",
    );
  }
});
test("unsafe original URLs and structural pseudo-MP4s never reach archive", async () => {
  let requests = 0;
  const service = client(async () => {
    requests++;
    return new Response(videoBytes);
  });
  for (const url of [
    "http://img.12ai.org/a.mp4",
    "https://127.0.0.1/a.mp4",
    "https://img.12ai.org.evil.example/a.mp4",
    "https://user:pass@img.12ai.org/a.mp4",
    "https://img.12ai.org/a.mp4#secret",
    "https://img.12ai.org:444/a.mp4",
  ]) {
    await assert.rejects(
      service.download(videoConnection, "seedance-2.0", {
        id: "upstream-video",
        status: "completed",
        outputs: [url],
      }),
    );
  }
  assert.equal(requests, 0);
  for (const bad of [
    videoBytes.slice(0, 20),
    videoBytes.slice(0, 36),
    new Uint8Array([
      0, 0, 0, 1, 102, 116, 121, 112, 255, 255, 255, 255, 255, 255, 255, 255,
    ]),
    new Uint8Array([
      ...videoBytes.slice(0, 20),
      0,
      0,
      0,
      255,
      109,
      111,
      111,
      118,
    ]),
  ]) {
    await assert.rejects(
      client(async () => new Response(bad)).download(
        videoConnection,
        "seedance-2.0",
        {
          id: "upstream-video",
          status: "completed",
          outputs: ["https://img.12ai.org/a.mp4"],
        },
      ),
      /INVALID_VIDEO_BYTES/,
    );
  }
});
test("streamed original bytes enforce actual 16 MiB without trusting Content-Length", async () => {
  const maximum = 16 * 1024 * 1024;
  const valid = new Uint8Array(maximum);
  valid.set(videoBytes);
  const trailingSize = maximum - videoBytes.length;
  new DataView(valid.buffer).setUint32(videoBytes.length, trailingSize);
  valid.set([102, 114, 101, 101], videoBytes.length + 4);
  const download = (response: Response) =>
    client(async () => response).download(videoConnection, "seedance-2.0", {
      id: "upstream-video",
      status: "completed" as const,
      outputs: ["https://img.12ai.org/a.mp4"],
    });
  assert.equal((await download(new Response(valid))).bytes.length, maximum);
  await assert.rejects(
    download(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(valid);
            controller.enqueue(new Uint8Array([0]));
            controller.close();
          },
        }),
        { headers: { "content-length": "1" } },
      ),
    ),
    /RESPONSE_TOO_LARGE/,
  );
});
test("unknown POST acceptance never becomes safe rejection or a second submission", async () => {
  for (const result of ["network", "json", "server", "abort"] as const) {
    let posts = 0;
    const service = client(async () => {
      posts++;
      if (result === "network") throw new TypeError("synthetic transport loss");
      if (result === "json") return videoJson({ accepted: true });
      if (result === "server") return videoJson({}, 503);
      return new Promise<Response>(() => undefined);
    }, 10);
    await assert.rejects(
      service.submit(videoInput),
      (error) =>
        error instanceof ServiceError && error.submissionState === "unknown",
    );
    await assert.rejects(
      service.submit(videoInput),
      /SUBMISSION_ALREADY_STARTED/,
    );
    assert.equal(posts, 1);
  }
});
test("abort after sending POST blocks another POST even when the original response arrives late", async () => {
  let sent!: () => void,
    respond!: (response: Response) => void,
    requests = 0;
  const started = new Promise<void>((resolve) => {
    sent = resolve;
  });
  const service = client(async () => {
    requests++;
    sent();
    return new Promise<Response>((resolve) => {
      respond = resolve;
    });
  });
  const controller = new AbortController();
  const request = service.submit(videoInput, controller.signal);
  await started;
  controller.abort();
  await assert.rejects(
    request,
    (error) =>
      error instanceof ServiceError && error.submissionState === "unknown",
  );
  respond(videoJson({ id: "late-job", status: "queued" }));
  await Promise.resolve();
  await assert.rejects(
    service.submit(videoInput),
    /SUBMISSION_ALREADY_STARTED/,
  );
  assert.equal(requests, 1);
});
test("a valid POST job ID remains observable before malformed outputs or a late response are rejected", async () => {
  let accepted: string | undefined;
  await assert.rejects(
    client(async () =>
      videoJson({ id: "known-malformed", status: "completed", outputs: [] }),
    ).submit(videoInput, undefined, async (id) => {
      accepted = id;
    }),
  );
  assert.equal(accepted, "known-malformed");
  let respond!: (response: Response) => void;
  const service = client(
    async () =>
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
    10,
  );
  const request = service.submit(videoInput, undefined, async (id) => {
    accepted = id;
  });
  await assert.rejects(
    request,
    (error) =>
      error instanceof ServiceError && error.submissionState === "unknown",
  );
  respond(videoJson({ id: "known-late", status: "queued" }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(accepted, "known-late");
});
test("valid 64-bit ftyp headers preserve their actual major-brand offset", async () => {
  const extended = new Uint8Array(videoBytes.length + 8);
  extended.set([0, 0, 0, 1, 102, 116, 121, 112]);
  new DataView(extended.buffer).setUint32(12, 28);
  extended.set(videoBytes.subarray(8), 16);
  const original = await client(async () => new Response(extended)).download(
    videoConnection,
    "seedance-2.0",
    {
      id: "upstream-video",
      status: "completed",
      outputs: ["https://img.12ai.org/a.mp4"],
    },
  );
  assert.deepEqual(original.bytes, extended);
});
test("cancellation before POST sends nothing and captured request cannot be changed while reading key", async () => {
  let requests = 0,
    keyReady!: (key: string) => void;
  assert.ok(videoModule);
  const controller = new AbortController();
  controller.abort();
  const service = videoModule.createTwelveAiVideoClient({
    credentials: {
      read: async () =>
        new Promise<string>((resolve) => {
          keyReady = resolve;
        }),
    },
    fetch: async (url, init) => {
      requests++;
      assert.equal(String(url), "https://cdn.12ai.org/v1/task/submit");
      assert.equal(
        JSON.parse(String(init?.body)).input.prompt,
        "Original prompt",
      );
      return videoJson({ id: "captured-job", status: "queued" });
    },
  });
  await assert.rejects(service.submit(videoInput, controller.signal));
  assert.equal(requests, 0);
  const mutable = {
    ...videoInput,
    prompt: "Original prompt",
    connection: { ...videoConnection },
  };
  const request = service.submit(mutable);
  mutable.prompt = "Changed prompt";
  mutable.connection.baseUrl = "https://evil.example/v1";
  keyReady("synthetic-key");
  await request;
  assert.equal(requests, 1);
});
test("only a proved submit rejection is terminal and unsupported routes send nothing", async () => {
  let requests = 0;
  const service = client(async () => {
    requests++;
    return videoJson({}, 401);
  });
  await assert.rejects(
    service.submit(videoInput),
    (error) =>
      error instanceof ServiceError &&
      error.submissionState === "terminal" &&
      error.rejectedBeforeAcceptance,
  );
  for (const input of [
    { ...videoInput, submissionId: "bad-model", model: "grok-imagine-1.5" },
    {
      ...videoInput,
      submissionId: "bad-host",
      connection: {
        ...videoConnection,
        baseUrl: "https://cdn.12ai.org.evil.example/v1",
      },
    },
    {
      ...videoInput,
      submissionId: "refs",
      attachments: [
        { id: "a", assetId: "b", mime: "image/png", size: 4, name: "ref" },
      ],
    },
  ])
    await assert.rejects(service.submit(input));
  assert.equal(requests, 1);
});
test("GET binds exact upstream job identity and rejects unknown status or malformed outputs", async () => {
  const service = client(async (url, init) => {
    assert.equal(String(url), "https://cdn.12ai.org/v1/task/task-known");
    assert.equal(init?.method, "GET");
    return videoJson({
      id: "task-known",
      status: "completed",
      outputs: ["https://img.12ai.org/video.mp4?signature=synthetic"],
    });
  });
  const job = await service.get(
    videoConnection,
    "seedance-2.0-fast",
    "task-known",
  );
  assert.equal(job.status, "completed");
  for (const body of [
    { id: "different", status: "queued" },
    { id: "task-known", status: "mystery" },
    { id: "task-known", status: "completed", outputs: [] },
    { id: "task-known", status: "completed", outputs: ["a", "b"] },
  ])
    await assert.rejects(
      client(async () => videoJson(body)).get(
        videoConnection,
        "seedance-2.0-fast",
        "task-known",
      ),
    );
});
test("cross-origin original retrieval never carries credentials and validates MP4 bytes", async () => {
  const service = client(async (url, init) => {
    assert.equal(
      String(url),
      "https://img.12ai.org/video.mp4?signature=synthetic",
    );
    assert.equal(new Headers(init?.headers).has("authorization"), false);
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "error");
    return new Response(videoBytes, {
      headers: { "content-type": "video/mp4" },
    });
  });
  const original = await service.download(
    videoConnection,
    "seedance-2.0-fast",
    {
      id: "task-known",
      status: "completed",
      outputs: ["https://img.12ai.org/video.mp4?signature=synthetic"],
    },
  );
  assert.equal(original.mime, "video/mp4");
  assert.deepEqual(original.bytes, videoBytes);
  for (const response of [
    new Response("<html>error</html>", {
      headers: { "content-type": "video/mp4" },
    }),
    new Response(videoBytes.slice(0, -1), {
      headers: { "content-type": "video/mp4" },
    }),
    new Response(videoBytes, { headers: { "content-type": "text/html" } }),
    new Response(videoBytes, {
      headers: { "content-length": String(16 * 1024 * 1024 + 1) },
    }),
  ])
    await assert.rejects(
      client(async () => response).download(
        videoConnection,
        "seedance-2.0-fast",
        {
          id: "task-known",
          status: "completed",
          outputs: ["https://img.12ai.org/video.mp4"],
        },
      ),
    );
});
test("Sora alone can recover original through its authenticated same-origin content endpoint", async () => {
  const urls: string[] = [];
  const service = client(async (url, init) => {
    urls.push(String(url));
    if (urls.length === 1) throw new TypeError("synthetic CORS");
    assert.equal(
      String(url),
      "https://cdn.12ai.org/v1/videos/task-known/content",
    );
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer synthetic-video-secret",
    );
    return new Response(videoBytes, {
      headers: { "content-type": "video/mp4" },
    });
  });
  await service.download(videoConnection, "sora-2", {
    id: "task-known",
    status: "completed",
    outputs: ["https://img.12ai.org/video.mp4"],
  });
  assert.equal(urls.length, 2);
  let asyncRequests = 0;
  await assert.rejects(
    client(async () => {
      asyncRequests++;
      throw new TypeError("synthetic CORS");
    }).download(videoConnection, "seedance-2.0", {
      id: "task-known",
      status: "completed",
      outputs: ["https://img.12ai.org/video.mp4"],
    }),
  );
  assert.equal(asyncRequests, 1);
});
