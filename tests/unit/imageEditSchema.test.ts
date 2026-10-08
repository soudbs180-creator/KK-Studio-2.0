import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { readMaskDocument } from "../../src/features/image-edit/mask.ts";
import {
  readImageEditSnapshot,
  readImageEditContext,
} from "../../src/features/image-edit/snapshot.ts";

const vectors = JSON.parse(
  readFileSync(
    new URL("../fixtures/image-edit-schema.json", import.meta.url),
    "utf8",
  ),
) as {
  base: Record<string, unknown>;
  cases: Array<{
    name: string;
    kind: "mask" | "context" | "edit";
    valid: boolean;
    changes: Array<{ path: string[]; value: unknown }>;
  }>;
};
const readers = {
  mask: readMaskDocument,
  context: readImageEditContext,
  edit: readImageEditSnapshot,
};
for (const vector of vectors.cases)
  test(`portable image schema: ${vector.name}`, () => {
    const input = structuredClone(vectors.base[vector.kind]);
    for (const change of vector.changes) {
      let target = input as Record<string, unknown>;
      for (const part of change.path.slice(0, -1))
        target = target[part] as Record<string, unknown>;
      target[change.path.at(-1)!] = change.value;
    }
    if (vector.valid) assert.ok(readers[vector.kind](input));
    else assert.throws(() => readers[vector.kind](input));
  });
