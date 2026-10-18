import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import { createProviderClient } from "../src/services/providerClient.ts";
import { validateDraft } from "../src/storage/creationValidation.ts";
import { composerUnavailable } from "../src/ui/policies.ts";
import type {
  ImageInput,
  ProviderConnection,
} from "../src/services/providerTypes.ts";

const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const attachment = {
  id: "reference",
  assetId: "asset-reference",
  name: "source.png",
  mime: "image/png",
  size: png.byteLength,
};
const connection: ProviderConnection = {
  id: "fixture",
  baseUrl: "https://cdn.12ai.org/v1",
  credentialRef: "fixture-key",
  protocol: "openai-compatible",
  capabilities: {
    text: true,
    image: true,
    maxOutputs: 2,
    imageSizes: ["1024x1024"],
  },
};
const input = (): ImageInput => ({
  submissionId: "fixture-image-edit",
  projectId: "fixture-project",
  connection,
  model: "gpt-image-2",
  prompt: "Change the background",
  count: 1,
  size: "1024x1024",
  attachments: [attachment],
  referenceImages: [
    { assetId: attachment.assetId, bytes: png, mime: "image/png" },
  ],
});
async function fixture(
  run: (
    client: ReturnType<typeof createProviderClient>,
    requests: {
      path: string;
      headers: IncomingMessage["headers"];
      body: Uint8Array;
    }[],
  ) => Promise<void>,
  invalidResult = false,
) {
  const requests: {
    path: string;
    headers: IncomingMessage["headers"];
    body: Uint8Array;
  }[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    requests.push({
      path: request.url!,
      headers: request.headers,
      body: Buffer.concat(chunks),
    });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        data: invalidResult
          ? []
          : [{ b64_json: Buffer.from(png).toString("base64") }],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run(
      createProviderClient({
        credentials: { read: async () => "fixture-only-key" },
        fetch: (url, init) => {
          const configured = new URL(String(url));
          assert.equal(configured.origin, "https://cdn.12ai.org");
          return fetch(
            `http://127.0.0.1:${address.port}${configured.pathname}`,
            init,
          );
        },
      }),
      requests,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
test("documented 12ai image edits send original files with multipart fields and no JSON content-type", async () => {
  await fixture(async (client, requests) => {
    const receipt = await client.generateImages(input());
    assert.equal(requests.length, 1);
    const request = requests[0];
    assert.equal(request.path, "/v1/images/edits");
    assert.match(
      request.headers["content-type"]!,
      /^multipart\/form-data; boundary=/,
    );
    assert.equal(request.headers.authorization, "Bearer fixture-only-key");
    const form = (await new Response(request.body.slice().buffer, {
      headers: { "content-type": request.headers["content-type"]! },
    }).formData()) as unknown as { get(name: string): string | File | null };
    assert.equal(form.get("model"), "gpt-image-2");
    assert.equal(form.get("prompt"), "Change the background");
    assert.equal(form.get("n"), "1");
    assert.equal(form.get("size"), "1024x1024");
    assert.equal(form.get("response_format"), "b64_json");
    const file = form.get("image[]");
    assert.ok(file instanceof File);
    assert.equal(file.type, "image/png");
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), png);
    assert.deepEqual(receipt.originals[0].bytes, png);
    assert.ok(!JSON.stringify(receipt.identity).includes("bytes"));
    await assert.rejects(
      client.generateImages(input()),
      /SUBMISSION_ALREADY_STARTED/,
    );
    assert.equal(requests.length, 1);
  });
});
test("accepted edit with invalid output stays unknown and cannot repeat its paid POST", async () => {
  await fixture(async (client, requests) => {
    await assert.rejects(
      client.generateImages(input()),
      (error) =>
        error instanceof Error &&
        "submissionState" in error &&
        error.submissionState === "unknown",
    );
    await assert.rejects(
      client.generateImages(input()),
      /SUBMISSION_ALREADY_STARTED/,
    );
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, "/v1/images/edits");
  }, true);
});
test("reference dispatch rejects unverified providers, models and mismatched originals before HTTP", async () => {
  await fixture(async (client, requests) => {
    const valid = input();
    for (const candidate of [
      {
        ...valid,
        connection: { ...connection, baseUrl: "https://generic.example/v1" },
      },
      {
        ...valid,
        connection: {
          ...connection,
          baseUrl: "https://cdn.12ai.org.evil.test/v1",
        },
      },
      {
        ...valid,
        connection: { ...connection, baseUrl: "https://cdn.12ai.org/proxy/v1" },
      },
      {
        ...valid,
        connection: {
          ...connection,
          baseUrl: "https://cdn.12ai.org/v1?route=other",
        },
      },
      { ...valid, model: "unknown-image-model" },
      { ...valid, referenceImages: undefined },
      {
        ...valid,
        referenceImages: [
          { assetId: "other", bytes: png, mime: "image/png" as const },
        ],
      },
      { ...valid, attachments: [{ ...attachment, mime: "image/jpeg" }] },
      {
        ...valid,
        referenceImages: [
          {
            assetId: attachment.assetId,
            bytes: new Uint8Array([1, 2]),
            mime: "image/png" as const,
          },
        ],
      },
      { ...valid, attachments: [] },
    ])
      await assert.rejects(
        client.generateImages(candidate),
        /REFERENCE|IMAGE_SIGNATURE/,
      );
    await assert.rejects(
      client.generateText(valid, () => undefined),
      /REFERENCE/,
    );
    assert.equal(requests.length, 0);
  });
});
test("the same documented image model without originals keeps generations JSON", async () => {
  await fixture(async (client, requests) => {
    await client.generateImages({
      ...input(),
      attachments: [],
      referenceImages: undefined,
    });
    assert.equal(requests[0].path, "/v1/images/generations");
    assert.equal(requests[0].headers["content-type"], "application/json");
    const body = JSON.parse(Buffer.from(requests[0].body).toString());
    assert.equal(body.size, "1024x1024");
    assert.equal(body.response_format, "b64_json");
    assert.equal(body.referenceImages, undefined);
  });
});
test("image size remains outside durable draft metadata so old readers can keep reading", () => {
  const draft = {
    prompt: "p",
    model: "m",
    kind: "image",
    attachments: [],
    approvalMode: "ask",
    privacyMode: "byok_local",
    outputCount: 1,
    updatedAt: 1,
  };
  assert.doesNotThrow(() => validateDraft(draft));
  assert.throws(() => validateDraft({ ...draft, imageSize: "1024x1024" }));
  assert.throws(() => validateDraft({ ...draft, imageSize: 1024 }));
  assert.throws(() => validateDraft({ ...draft, imageSize: "" }));
  assert.throws(() => validateDraft({ ...draft, imageSize: "x".repeat(101) }));
});
test("composer admits only documented local image references and declared image sizes", () => {
  const draft = {
    prompt: "p",
    model: "gpt-image-2",
    kind: "image" as const,
    attachments: [attachment],
    approvalMode: "ask" as const,
    privacyMode: "byok_local" as const,
    outputCount: 1,
    updatedAt: 1,
  };
  const metadata = {
    ...connection,
    name: "Fixture",
    provider: "openai-compatible",
  };
  assert.equal(composerUnavailable(draft, metadata), undefined);
  assert.match(
    composerUnavailable({ ...draft, kind: "text" }, metadata)!,
    /参考/,
  );
  assert.match(
    composerUnavailable({ ...draft, kind: "video" }, metadata)!,
    /参考/,
  );
  assert.match(
    composerUnavailable({ ...draft, model: "unknown" }, metadata)!,
    /参考/,
  );
  assert.match(composerUnavailable(draft, metadata, "unlisted")!, /尺寸/);
  assert.match(
    composerUnavailable(
      { ...draft, attachments: [{ ...attachment, mime: "video/mp4" }] },
      metadata,
    )!,
    /图片|参考/,
  );
});
