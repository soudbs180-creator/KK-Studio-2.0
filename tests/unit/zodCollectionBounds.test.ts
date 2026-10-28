import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { createRequire } from "node:module";

const agentRequire = createRequire(
  new URL("../../vendor/canvas-agent/package.json", import.meta.url),
);

test("oversized bounded arrays reject before reading or validating elements", () => {
  let reads = 0;
  const oversized = new Array(4096);
  Object.defineProperty(oversized, 0, {
    get() {
      reads++;
      throw new Error(
        "Oversized input must be rejected before element parsing",
      );
    },
  });
  const result = z.array(z.string()).max(8).safeParse(oversized);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.code === "too_big"));
  }
  assert.equal(reads, 0);
});

test("bounded arrays still accept valid values and validate in-bounds elements", () => {
  const schema = z.array(z.string()).max(2);
  assert.deepEqual(schema.parse(["first", "second"]), ["first", "second"]);
  assert.equal(schema.safeParse(["first", 2]).success, false);
});

test("the bundled Agent Zod copy rejects oversized arrays before parsing elements", () => {
  const agentZod = agentRequire("zod").z;
  const oversized = new Array(4096);
  Object.defineProperty(oversized, 0, {
    get() {
      throw new Error(
        "Agent must reject oversized input before element parsing",
      );
    },
  });
  const result = agentZod.array(agentZod.string()).max(8).safeParse(oversized);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.code === "too_big"));
  }
});

test("Agent canvas metadata and patch records retain arbitrary string-keyed values", async () => {
  const { toolInputSchemas } =
    await import("../../vendor/canvas-agent/dist/canvas/schemas.js");
  const input = {
    id: "node-1",
    patch: { title: "updated", nested: { retained: true } },
    metadata: { references: ["asset-1"] },
  };
  assert.deepEqual(toolInputSchemas.canvas_update_node.parse(input), input);
  assert.equal(
    toolInputSchemas.canvas_update_node.safeParse({ id: "node-1", patch: [] })
      .success,
    false,
  );
});
