import test from "node:test";
import assert from "node:assert/strict";
import {
  groupCatalogModels,
  modelDisplay,
  modelSearchTerms,
} from "../../src/features/models/modelFamilies.ts";
import { searchModels } from "../../src/features/models/modelSearch.ts";
test("suffixes group display only, preserve versions/namespaces/exact available routes", () => {
  const models = [
    "vendor/art-v1.5-2k-low",
    "vendor/art-v1.5-2k-high",
    "vendor/art-v1.5-4k-high",
    "vendor/art-v1.6-high",
  ].map((id) => ({ id, kind: "image" as const }));
  const groups = groupCatalogModels(models);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].name, "vendor/art-v1.5");
  assert.deepEqual(
    groups[0].models.map((model) => model.id),
    models.slice(0, 3).map((model) => model.id),
  );
  assert.equal(modelDisplay(models[2]).variant, "4K · High");
  assert.ok(!groups[0].models.some((model) => model.id.endsWith("4k-low")));
  assert.equal(
    modelDisplay({
      id: "custom-official",
      kind: "image",
      family: "Custom",
      variant: "官方渠道",
    }).family,
    "Custom",
  );
});
test("searches provider, exact suffix, declared sizes/ratio; fuzzy words never change numbers or ratio orientation", () => {
  const models = [
    {
      id: "a",
      label: "Gemini 3 Pro",
      terms: [
        "谷歌",
        "Provider A",
        ...modelSearchTerms({
          id: "gemini-3-pro-4k-high",
          kind: "image",
          sizes: ["1920x1080"],
        }),
      ],
    },
    { id: "b", label: "Gemini 3 Pro", terms: ["Provider B", "2k", "9:16"] },
  ];
  assert.deepEqual(
    searchModels(models, "４Ｋ １６：９").map((x) => x.item.id),
    ["a"],
  );
  assert.deepEqual(
    searchModels(models, "1920×1080").map((x) => x.item.id),
    ["a"],
  );
  assert.deepEqual(
    searchModels(models, "Provider B").map((x) => x.item.id),
    ["b"],
  );
  assert.ok(searchModels(models, "Gemni")[0].fuzzy);
  assert.equal(searchModels(models, "8k").length, 0);
  assert.equal(searchModels(models, "3.1").length, 0);
  assert.deepEqual(
    searchModels(models, "9:16").map((x) => x.item.id),
    ["b"],
  );
  assert.deepEqual(
    searchModels(models, "gmn").map((x) => x.item.id),
    ["a", "b"],
  );
});
