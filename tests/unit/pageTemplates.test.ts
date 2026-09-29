import assert from "node:assert/strict";
import test from "node:test";
import {
  PAGE_TEMPLATE_KEYS,
  PAGE_TEMPLATES,
  canComposePageTemplates,
  selectPageTemplate,
  type ContentProfile,
  type PageTemplateKey,
} from "../../src/domain/pageTemplates.ts";

test("the runtime registry exposes exactly the five Figma page templates", () => {
  assert.deepEqual(PAGE_TEMPLATE_KEYS, ["list", "grid", "detail", "timeline", "gallery"]);
  for (const key of PAGE_TEMPLATE_KEYS) {
    const definition = PAGE_TEMPLATES[key];
    assert.equal(definition.id, key);
    assert.ok(definition.layout.structure.length > 0);
    assert.ok(definition.components.length > 0);
    assert.ok(definition.interactions.length > 0);
    assert.ok(definition.visual.gapToken.startsWith("--kk-"));
  }
});

test("work display resolves to grid and selection is deterministic", () => {
  assert.equal(selectPageTemplate({ workDisplay: true }), "grid");
  const cases: Array<[ContentProfile, PageTemplateKey]> = [
    [{ ordered: true, process: true }, "timeline"],
    [{ singleObject: true }, "detail"],
    [{ sortable: true }, "list"],
    [{ media: true, batchSelect: true }, "gallery"],
    [{ fields: 3 }, "grid"],
  ];
  for (const [profile, expected] of cases) assert.equal(selectPageTemplate(profile), expected);
});

test("mixed pages have one primary template and only detail may be nested", () => {
  assert.equal(canComposePageTemplates("grid", ["detail"]), true);
  assert.equal(canComposePageTemplates("gallery", ["detail"]), true);
  assert.equal(canComposePageTemplates("grid", ["list"]), false);
  assert.equal(canComposePageTemplates("timeline", ["detail"]), false);
  assert.equal(canComposePageTemplates("detail", ["detail"]), false);
});

