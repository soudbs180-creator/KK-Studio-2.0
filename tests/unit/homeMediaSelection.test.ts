import assert from "node:assert/strict";
import test from "node:test";
import { homeDraftForSelection } from "../../src/domain/modelSelection.ts";
import { emptyDraft } from "../../src/domain/creationModel.ts";
import { validateMediaTaskInput } from "../../src/features/creation/mediaTaskInput.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GenerationCount from "../../src/components/nodes/GenerationCount.tsx";
import CreationParameterControl from "../../src/components/nodes/CreationParameterControl.tsx";

test("home modality selection initializes valid media parameters and removes stale ones", () => {
  let draft = { ...emptyDraft(), prompt: "Create media" };
  for (const [kind, model] of [
    ["video", "veo-3.1-generate-preview"],
    ["audio", "tts-1"],
  ] as const) {
    draft = homeDraftForSelection(draft, {
      source: "api",
      model,
      kind,
      connectionId: "configured",
    });
    assert.equal(draft.media?.kind, kind);
    assert.doesNotThrow(() =>
      validateMediaTaskInput({
        ...draft,
        prompt: draft.prompt!,
        model,
        kind,
        attachments: [],
      }),
    );
  }
  const text = homeDraftForSelection(draft, {
    source: "api",
    model: "gpt-text",
    kind: "text",
    connectionId: "text",
  });
  assert.equal(text.media, undefined);
  assert.equal(text.providerConnectionId, "text");
});

test("home image size survives submission selection and resets only when routing changes", () => {
  const selection = {
    source: "api" as const,
    model: "image-test",
    kind: "image" as const,
    connectionId: "account-a",
  };
  const draft = {
    ...emptyDraft(),
    modelSelection: selection,
    providerConnectionId: selection.connectionId,
    model: selection.model,
    imageSize: "1536x1024",
    outputCount: 4,
  };
  assert.equal(homeDraftForSelection(draft, { ...selection }).imageSize, "1536x1024");
  for (const next of [
    { ...selection, connectionId: "account-b" },
    { ...selection, model: "image-other" },
    { ...selection, source: "codex" as const, connectionId: undefined },
    { ...selection, kind: "video" as const, model: "veo-3.1-generate-preview" },
  ]) {
    const updated = homeDraftForSelection(draft, next);
    assert.equal(updated.imageSize, undefined);
    assert.equal(updated.outputCount, 4);
  }
});

test("media parameter and count controls never become implicit form submit buttons", () => {
  for (const control of [
    createElement(GenerationCount, {
      value: "4", open: true, onToggle() {}, onChange() {},
    }),
    createElement(CreationParameterControl, {
      kind: "video", model: "veo-3.1-generate-preview", open: true,
      parameters: { ratio: "16:9", quality: "720p", duration: "4", count: "4", soundEnabled: false },
      onToggle() {}, onChange() {},
    }),
  ]) {
    const markup = renderToStaticMarkup(createElement("form", {}, control));
    const buttons = [...markup.matchAll(/<button\b[^>]*>/g)];
    assert.ok(buttons.length > 1);
    for (const [button] of buttons) assert.match(button, /\btype="button"/);
  }
});
