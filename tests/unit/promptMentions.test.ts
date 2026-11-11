import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePromptMentions,
  extractNumberedReferences,
} from "../../src/domain/promptMentions.ts";
import { compileStructuredPrompt } from "../../src/features/prompts/structuredPromptCompiler.ts";
import { compileDesignPrompt } from "../../src/features/creation/promptCompiler.ts";
import { prepareImageTask } from "../../src/features/creation/imageTaskCommand.ts";

test("numbered references preserve order, repeated identity and actual asset bindings", () => {
  const result = parsePromptMentions(
    "主体 @参考1 和风格 {{ref 2}} 再用 @参考 1",
    { "1": "archived-hero", "2": "archived-style" },
  );
  assert.equal(
    result.compiledPrompt,
    "主体 [RefAsset: archived-hero] 和风格 [RefAsset: archived-style] 再用 [RefAsset: archived-hero]",
  );
  assert.deepEqual(
    result.mentions.map((item) => item.assetId),
    ["archived-hero", "archived-style", "archived-hero"],
  );
  for (const index of ["0", "99", "9999999999999999999999"])
    assert.throws(() => parsePromptMentions(`@参考${index}`, {}), /不存在/);
  assert.deepEqual(extractNumberedReferences("nothing"), []);
});

test("canonical attachment identities resolve to their distinct archived originals", () => {
  const result = parsePromptMentions(
    "@{mention:attachment-123|人物|主体}",
    { "1": "asset-abc" },
    { "attachment-123": "asset-abc" },
  );
  assert.equal(result.compiledPrompt, "[RefAsset: asset-abc]");
  assert.throws(
    () =>
      parsePromptMentions(
        "@{mention:missing|人物|主体}",
        { "1": "asset-abc" },
        {},
      ),
    /已移除/,
  );
});

test("real API and Agent compilers map numeric syntax to the same selected originals", () => {
  const attachments = [
    {
      id: "style",
      name: "风格图",
      assetId: "asset-style",
      mime: "image/png",
      size: 1,
      dataUrl: "data:image/png;base64,AA==",
      role: "风格" as const,
    },
    {
      id: "hero",
      name: "主体图",
      assetId: "asset-hero",
      mime: "image/png",
      size: 1,
      dataUrl: "data:image/png;base64,AA==",
      role: "主体" as const,
    },
  ];
  const prompt = "让 @参考 2 采用 {{ref 1}} 的风格";
  const agent = compileStructuredPrompt({ prompt, attachments });
  assert.deepEqual(
    agent.alignedAttachments.map((item) => item.assetId),
    ["asset-hero", "asset-style"],
  );
  assert.deepEqual(
    agent.references.map((item) => item.slot),
    ["主体", "风格"],
  );
  assert.match(agent.cleanPrompt, /\[Ref_1\].*\[Ref_2\]/);
  const api = compileDesignPrompt(prompt, {
    referenceCount: 2,
    referenceIds: attachments.map((item) => item.assetId),
  });
  assert.match(api, /\[RefAsset: asset-hero\].*\[RefAsset: asset-style\]/);
  assert.throws(
    () => compileStructuredPrompt({ prompt, attachments: [] }),
    /不存在/,
  );
});

test("missing numeric originals fail before provider lookup or task acceptance", async () => {
  await assert.rejects(
    prepareImageTask({
      prompt: "@参考1",
      kind: "image",
      model: "missing",
      attachments: [],
    }),
    /参考 1 不存在/,
  );
  const result = compileStructuredPrompt({
    prompt: "@{mention:real|@参考1 label|主体}",
  });
  assert.equal(result.references.length, 1);
  assert.equal(result.references[0].targetId, "real");
});
