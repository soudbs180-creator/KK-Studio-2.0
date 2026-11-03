import test from "node:test";
import assert from "node:assert/strict";
import { normalizeComfyEndpoint } from "../../src/features/comfyui/comfyEndpoint.ts";
test("Comfy endpoint accepts only an explicit HTTP loopback origin", () => {
  assert.equal(
    normalizeComfyEndpoint("http://localhost:18188/"),
    "http://127.0.0.1:18188",
  );
  for (const url of [
    "https://127.0.0.1:8188",
    "http://remote.test",
    "http://user:pass@127.0.0.1",
    "http://127.0.0.1/path",
    "http://127.0.0.1?token=x",
    "http://127.0.0.1#x",
  ])
    assert.throws(() => normalizeComfyEndpoint(url));
});
