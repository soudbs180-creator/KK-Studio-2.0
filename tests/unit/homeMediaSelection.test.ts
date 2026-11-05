import assert from "node:assert/strict";
import test from "node:test";
import { homeDraftForSelection } from "../../src/domain/modelSelection.ts";
import { emptyDraft } from "../../src/domain/creationModel.ts";
import { validateMediaTaskInput } from "../../src/features/creation/mediaTaskInput.ts";

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
