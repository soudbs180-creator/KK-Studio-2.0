import assert from "node:assert/strict";
import test from "node:test";
import { selectedModelLabel } from "../../src/features/models/modelPresentation.ts";

test("image selection labels preserve exact API ids and unknown Codex state", () => {
  assert.equal(
    selectedModelLabel(
      { source: "api", model: "doubao-seedream-4-5-250828", kind: "image" },
      "模型",
    ),
    "doubao-seedream-4-5-250828",
  );
  assert.equal(
    selectedModelLabel({ source: "codex", model: "", kind: "image" }),
    "图片模型未报告",
  );
});
