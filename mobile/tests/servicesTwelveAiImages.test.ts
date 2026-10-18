import { test } from "node:test";
import assert from "node:assert/strict";
import { createProviderClient } from "../src/services/providerClient.ts";
import { ServiceError } from "../src/services/httpClient.ts";
import { userError } from "../src/application/errors.ts";
import type { ProviderConnection } from "../src/services/providerTypes.ts";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
const connection = (baseUrl: string): ProviderConnection => ({
  id: "fixture-12ai",
  baseUrl,
  credentialRef: "fixture-vault",
  protocol: "openai-compatible",
  capabilities: { text: true, image: true },
});
const input = (baseUrl: string) => ({
  submissionId: "fixture-image-submit",
  projectId: "fixture-project",
  connection: connection(baseUrl),
  model: "gpt-image-2",
  prompt: "Synthetic test only",
});
const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });

for (const origin of [
  "https://new.12ai.org",
  "https://cdn.12ai.org",
  "https://api.12ai.org",
]) {
  for (const path of ["", "/v1", "/v1/"]) {
    test(`12ai ${origin}${path} archives API bytes without cross-origin original fetch`, async () => {
      let posts = 0;
      let originalReads = 0;
      const service = createProviderClient({
        credentials: { read: async () => "fixture-secret-only" },
        fetch: async (url, init) => {
          if (init?.method === "POST") {
            assert.equal(new URL(String(url)).origin, origin);
            posts++;
            assert.equal(
              new URL(String(url)).pathname,
              "/v1/images/generations",
            );
            const body = JSON.parse(String(init.body));
            return json({
              data: [
                body.response_format === "b64_json"
                  ? { b64_json: png.toString("base64") }
                  : { url: "https://fileview.site/fixture-original.png" },
              ],
            });
          }
          originalReads++;
          throw new TypeError("Synthetic original CORS failure");
        },
      });
      const receipt = await service.generateImages(input(origin + path));
      assert.deepEqual(receipt.originals[0].bytes, new Uint8Array(png));
      assert.equal(receipt.originals[0].mime, "image/png");
      assert.equal(receipt.submissionState, "terminal");
      assert.equal(receipt.archivalState, "pending");
      assert.equal(posts, 1);
      assert.equal(originalReads, 0);
    });
  }
}

for (const baseUrl of [
  "https://api.openai.com/v1",
  "https://cdn.12ai.org.evil.invalid/v1",
  "https://evil-12ai.org/v1",
  "https://cdn.12ai.org:8443/v1",
  "https://cdn.12ai.org/custom/v1",
]) {
  test(`generic endpoint ${baseUrl} retains its image request contract`, async () => {
    let posts = 0;
    const service = createProviderClient({
      credentials: { read: async () => "fixture-secret-only" },
      fetch: async (_url, init) => {
        posts++;
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init.body)), {
          model: "gpt-image-2",
          prompt: "Synthetic test only",
          n: 1,
        });
        return json({ data: [{ b64_json: png.toString("base64") }] });
      },
    });
    const receipt = await service.generateImages(input(baseUrl));
    assert.deepEqual(receipt.originals[0].bytes, new Uint8Array(png));
    assert.equal(posts, 1);
  });
}

test("a connection edit during credential lookup cannot change the captured image format", async () => {
  const captured = input("https://new.12ai.org/v1");
  const service = createProviderClient({
    credentials: {
      read: async () => {
        captured.connection.baseUrl = "https://unrelated.invalid/v1";
        return "fixture-secret-only";
      },
    },
    fetch: async (url, init) => {
      assert.equal(String(url), "https://new.12ai.org/v1/images/generations");
      assert.equal(JSON.parse(String(init?.body)).response_format, "b64_json");
      return json({ data: [{ b64_json: png.toString("base64") }] });
    },
  });
  const receipt = await service.generateImages(captured);
  assert.deepEqual(receipt.originals[0].bytes, new Uint8Array(png));
});

test("failed original retrieval keeps acceptance unknown and explains archive failure without another POST", async () => {
  let posts = 0;
  let originals = 0;
  const service = createProviderClient({
    credentials: { read: async () => "fixture-secret-only" },
    fetch: async (url, init) => {
      if (init?.method === "POST") {
        posts++;
        return json({ data: [{ url: "https://fileview.site/fixture.png" }] });
      }
      originals++;
      assert.equal(new URL(String(url)).host, "fileview.site");
      assert.equal(new Headers(init?.headers).has("authorization"), false);
      throw new TypeError("Synthetic original CORS failure");
    },
  });
  await assert.rejects(
    service.generateImages(input("https://new.12ai.org")),
    (error) => {
      assert.ok(error instanceof ServiceError);
      assert.equal(error.code, "IMAGE_ORIGINAL_RETRIEVAL_FAILED");
      assert.equal(error.submissionState, "unknown");
      assert.equal(error.recoveryReceipt?.originals.length, 0);
      assert.match(userError(error), /原图/);
      return true;
    },
  );
  await assert.rejects(
    service.generateImages(input("https://new.12ai.org")),
    /SUBMISSION_ALREADY_STARTED/,
  );
  assert.equal(posts, 1);
  assert.equal(originals, 1);
});

for (const status of [401, 403, 404]) {
  test(`original HTTP ${status} is an archive failure rather than a rejected generation`, async () => {
    let posts = 0;
    const service = createProviderClient({
      credentials: { read: async () => "fixture-secret-only" },
      fetch: async (_url, init) => {
        if (init?.method === "POST") {
          posts++;
          return json({ data: [{ url: "https://fileview.site/fixture.png" }] });
        }
        return new Response(null, { status });
      },
    });
    await assert.rejects(
      service.generateImages(input("https://new.12ai.org")),
      (error) => {
        assert.ok(error instanceof ServiceError);
        assert.equal(error.code, "IMAGE_ORIGINAL_RETRIEVAL_FAILED");
        assert.equal(error.status, status);
        assert.equal(error.submissionState, "unknown");
        assert.equal(error.rejectedBeforeAcceptance, false);
        assert.match(userError(error), /尚未自动保存/);
        return true;
      },
    );
    assert.equal(posts, 1);
  });
}
