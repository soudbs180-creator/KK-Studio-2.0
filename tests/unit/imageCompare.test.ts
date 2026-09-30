import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasCollectionItem } from "../../src/domain/canvasItems.ts";
import {
  compareImage,
  reconcileCompareSelection,
  toggleCompareSelection,
} from "../../src/features/compare/imageCompare.ts";

const image = (
  id: string,
  patch: Partial<CanvasCollectionItem> = {},
): CanvasCollectionItem => ({
  id,
  kind: "image",
  title: `图片 ${id}`,
  description: "",
  preview: `/images/${id}.png`,
  ...patch,
});

test("only a ready image with a readable source can enter comparison", () => {
  assert.deepEqual(compareImage(image("local")), {
    id: "local",
    title: "图片 local",
    src: "/images/local.png",
    source: "local",
    model: undefined,
  });
  assert.equal(
    compareImage(image("local-model", { model: "not-used" }))?.model,
    undefined,
  );
  assert.deepEqual(
    compareImage(
      image("generated", {
        model: "image-model",
        result: {
          id: "output",
          kind: "image",
          title: "输出",
          src: "/original.png",
          description: "",
          source: "provider",
        },
      }),
    ),
    {
      id: "generated",
      title: "图片 generated",
      src: "/original.png",
      source: "provider",
      model: "image-model",
    },
  );
  assert.equal(compareImage(image("blank", { preview: undefined })), null);
  assert.equal(
    compareImage(image("pending", { generationStatus: "pending" })),
    null,
  );
  assert.equal(
    compareImage(image("error", { generationStatus: "error" })),
    null,
  );
  assert.equal(compareImage({ ...image("video"), kind: "video" }), null);
});

test("comparison selection preserves click order, toggles and stops at four", () => {
  const items = ["a", "b", "c", "d", "e"].map((id) => image(id));
  let selected: string[] = [];
  for (const id of ["c", "a", "b", "d", "e"])
    selected = toggleCompareSelection(selected, id, items);
  assert.deepEqual(selected, ["c", "a", "b", "d"]);
  selected = toggleCompareSelection(selected, "a", items);
  assert.deepEqual(selected, ["c", "b", "d"]);
  selected = toggleCompareSelection(selected, "e", items);
  assert.deepEqual(selected, ["c", "b", "d", "e"]);
  assert.deepEqual(
    toggleCompareSelection(selected, "missing", items),
    selected,
  );
});

test("deleted, duplicate and invalid images cannot remain in comparison", () => {
  const items = [
    image("a"),
    image("b", { preview: undefined }),
    image("c", { generationStatus: "error" }),
  ];
  assert.deepEqual(
    reconcileCompareSelection(["a", "b", "a", "deleted", "c"], items),
    ["a"],
  );
});
