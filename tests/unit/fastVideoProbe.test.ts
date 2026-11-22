import assert from "node:assert/strict";
import test from "node:test";
import { probeFastVideo } from "../../src/integrations/generation/fastVideoProbe.ts";

test("web and missing runner stay disabled with explicit reasons", () => {
  assert.match(
    probeFastVideo({ platform: "web", runnerConfigured: false }).disableReason,
    /网页版/,
  );
  assert.match(
    probeFastVideo({ platform: "windows", runnerConfigured: false })
      .disableReason,
    /FastVideo/,
  );
});

test("configured runner on 16GB-class CUDA can be available", () => {
  const probe = probeFastVideo({
    platform: "windows",
    runnerConfigured: true,
    cudaReported: true,
    dedicatedVramBytes: 16 * 1024 ** 3,
  });
  assert.equal(probe.available, true);
  assert.equal(probe.gpuHint, "ok");
  assert.equal(probe.disableReason, "");
});
