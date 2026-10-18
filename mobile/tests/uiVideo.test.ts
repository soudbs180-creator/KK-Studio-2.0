import test from "node:test";
import assert from "node:assert/strict";
import { composerUnavailable } from "../src/ui/policies.ts";
import { videoConnection } from "./videoFixture.ts";
const draft = {
  prompt: "一只纸船缓慢漂过平静湖面",
  model: "seedance-2.0-fast",
  kind: "video" as const,
  attachments: [],
  approvalMode: "ask" as const,
  privacyMode: "byok_local" as const,
  outputCount: 1,
  updatedAt: 1,
};
test("video composer opens only a documented model on the explicit official connection", () => {
  const connection = {
    ...videoConnection,
    name: "12ai",
    provider: "openai-compatible",
  };
  assert.equal(composerUnavailable(draft, connection), undefined);
  assert.ok(
    composerUnavailable(draft, {
      ...connection,
      baseUrl: "https://relay.example/v1",
    }),
  );
  assert.ok(
    composerUnavailable({ ...draft, model: "grok-imagine-1.5" }, connection),
  );
  assert.ok(composerUnavailable({ ...draft, outputCount: 2 }, connection));
});
