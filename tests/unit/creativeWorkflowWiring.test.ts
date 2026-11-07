import test from "node:test";
import assert from "node:assert/strict";
import {
  compareVideoFrames,
  detectVideoShots,
} from "../../src/domain/videoShotBreakdown.ts";
import { compileDesignPrompt } from "../../src/features/creation/promptCompiler.ts";
import {
  runStoryboardPipeline,
  storyboardToCanvas,
} from "../../src/features/workflows/index.ts";
import {
  composerReferenceTokens,
  reconcileComposerReferences,
} from "../../src/features/prompts/index.ts";
import { readTokenUsage, sumTokenUsage } from "../../src/domain/tokenUsage.ts";
import { createConversationRewind } from "../../src/features/agent/conversationRewind.ts";
import { createProject, activeChat } from "../../src/domain/creationModel.ts";

const board = {
  title: "回家",
  shots: [
    {
      id: "1",
      scene: "门口",
      description: "小林穿红衣，手持银钥匙",
      dialogue: "我回来了",
      durationSeconds: 3,
      shotSize: "中景",
      cameraMovement: "固定",
      characters: ["小林"],
      props: ["银钥匙"],
      assetIds: ["hero"],
    },
  ],
};
const constraints = [
  {
    characterName: "小林",
    kind: "costume" as const,
    requiredAttributes: ["红衣"],
  },
];
test("actual pixel buffers distinguish identical frames, hard cuts and histogram-preserving motion", () => {
  const black = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]);
  const shifted = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
  assert.deepEqual(compareVideoFrames(black, shifted), {
    rgbDiff: 1,
    histDiff: 0,
  });
  const result = detectVideoShots([
    { pixels: black, timestampSeconds: 0 },
    { pixels: black, timestampSeconds: 0.04 },
    { pixels: shifted, timestampSeconds: 0.08 },
  ]);
  assert.deepEqual(
    result.map((s) => s.isCut),
    [false, false, true],
  );
  assert.equal(result[2].timestampSeconds, 0.08);
  assert.throws(
    () => compareVideoFrames(black, new Uint8ClampedArray(4)),
    /尺寸/,
  );
});
test("production prompt compiler combines validated optics with original reference identities", () => {
  const result = compileDesignPrompt("使用 @参考 1", {
    referenceIds: ["asset-original"],
    referenceCount: 1,
    optics: {
      lensMm: 85,
      aperture: "f/1.4",
      depthOfField: "shallow",
      cameraBody: "Cinema",
    },
  });
  assert.match(result, /asset-original/);
  assert.match(result, /85mm/);
  assert.match(result, /f\/1.4/);
  assert.match(result, /Cinema/);
  assert.throws(() =>
    compileDesignPrompt("portrait", {
      optics: { lensMm: 85, aperture: "f/0" },
    }),
  );
});
test("numbered aliases follow their original attachment when references reorder or change slots", () => {
  const refs = [
    { id: "a", name: "人物", slot: "主体" as const },
    { id: "b", name: "风格", slot: "风格" as const },
  ];
  const after = [refs[1], { ...refs[0], slot: "构图" as const }];
  const prompt = reconcileComposerReferences("@参考 1 {{ref 2}}", refs, after);
  const parsed = composerReferenceTokens(prompt, after);
  assert.deepEqual(
    parsed.tokens.map((t) => [t.targetId, t.slot]),
    [
      ["a", "构图"],
      ["b", "风格"],
    ],
  );
  assert.deepEqual(composerReferenceTokens("@参考 3", refs).missing, [3]);
});

test("each numbered reference creates one interactive token bound to the archived original", () => {
  const result = composerReferenceTokens("@参考 1 {{ref 2}}", [
    { id: "asset-a", name: "A", slot: "主体" },
    { id: "asset-b", name: "B", slot: "风格" },
  ]);
  assert.deepEqual(
    result.tokens.map((t) => t.targetId),
    ["asset-a", "asset-b"],
  );
});
test("storyboard model output is validated before materializing ordered canvas cards", async () => {
  let requested = "";
  const result = await runStoryboardPipeline({
    script: "小林：我回来了",
    constraints,
    assets: [{ id: "hero", name: "小林" }],
    signal: new AbortController().signal,
    generate: async (prompt) => {
      requested = prompt;
      return JSON.stringify(board);
    },
  });
  assert.match(requested, /hero/);
  assert.equal(result.compliant, true);
  const canvas = storyboardToCanvas(result.storyboard, "test");
  assert.equal(canvas.items.length, 1);
  assert.match(canvas.items[0].prompt!, /银钥匙/);
});
test("storyboard rejects invented assets, missing continuity and fabricated dialogue", async () => {
  const invalid = structuredClone(board);
  Object.assign(invalid.shots[0], {
    description: "小林穿蓝衣",
    dialogue: "新的对白",
    assetIds: ["invented"],
  });
  const result = await runStoryboardPipeline({
    script: "小林：我回来了",
    constraints,
    assets: [],
    signal: new AbortController().signal,
    generate: async () => JSON.stringify(invalid),
  });
  assert.equal(result.compliant, false);
  assert.match(result.violations.join("\n"), /红衣/);
  assert.match(result.violations.join("\n"), /未知资产/);
  assert.match(result.violations.join("\n"), /原文/);
});
test("long novels use bounded serial production tasks and preserve every source segment", async () => {
  const script = "小林：我回来了。\n".repeat(1500);
  const prompts: string[] = [];
  const result = await runStoryboardPipeline({
    script,
    constraints,
    assets: [{ id: "hero", name: "小林" }],
    signal: new AbortController().signal,
    generate: async (prompt) => {
      assert.ok(prompt.length <= 4000);
      prompts.push(prompt);
      return JSON.stringify(board);
    },
  });
  assert.ok(prompts.length > 1);
  assert.equal(
    prompts.map((p) => p.split("镜号在本段内唯一）：\n")[1]).join(""),
    script,
  );
  assert.equal(
    new Set(result.storyboard.shots.map((s) => s.id)).size,
    prompts.length,
  );
});
test("usage parser merges streamed provider metadata and retained totals", () => {
  const input = readTokenUsage({ usage: { input_tokens: 23 } });
  const output = readTokenUsage({ usage: { output_tokens: 7 } }, input);
  assert.deepEqual(output, {
    promptTokens: 23,
    completionTokens: 7,
    totalTokens: 30,
  });
  assert.deepEqual(
    sumTokenUsage([
      { tokenUsage: output },
      { tokenUsage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } },
    ]),
    { promptTokens: 24, completionTokens: 9, totalTokens: 33 },
  );
  assert.equal(
    readTokenUsage({ usage: { output_tokens: -1 } }, output),
    output,
  );
});
function rewindFixture() {
  let project = createProject({
    prompt: "",
    kind: "text",
    model: "test",
    attachments: [],
  });
  const chat = activeChat(project)!;
  chat.messages = [
    {
      id: "u1",
      role: "user",
      content: "one",
      tokenUsage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
    },
    { id: "a1", role: "assistant", content: "first" },
    {
      id: "u2",
      role: "user",
      content: "two",
      tokenUsage: { promptTokens: 4, completionTokens: 3, totalTokens: 7 },
    },
    { id: "a2", role: "assistant", content: "second" },
  ];
  chat.tokenUsage = { promptTokens: 7, completionTokens: 5, totalTokens: 12 };
  return {
    read: () => project,
    commit: (p: typeof project) => {
      project = p;
    },
  };
}
test("real API conversation rewind persists a backup, removes the selected round and recomputes usage", async () => {
  const f = rewindFixture();
  let flushes = 0;
  const rewind = createConversationRewind({
    getProject: f.read,
    getBlockReason: () => undefined,
    isBusy: () => false,
    commit: f.commit,
    flush: async () => {
      flushes++;
    },
  });
  const record = await rewind("a2");
  assert.equal(record.status, "complete");
  const chat = activeChat(f.read())!;
  assert.deepEqual(
    chat.messages.map((m) => m.id),
    ["u1", "a1"],
  );
  assert.deepEqual(chat.tokenUsage, {
    promptTokens: 3,
    completionTokens: 2,
    totalTokens: 5,
  });
  assert.equal((chat.rewindBackups as unknown[]).length, 1);
  assert.ok(flushes >= 3);
});
test("backup storage failure keeps the conversation and prevents truncation", async () => {
  const f = rewindFixture();
  const rewind = createConversationRewind({
    getProject: f.read,
    getBlockReason: () => undefined,
    isBusy: () => false,
    commit: f.commit,
    flush: async () => {
      throw new Error("disk full");
    },
  });
  await assert.rejects(rewind("u2"), /disk full/);
  assert.equal(activeChat(f.read())!.messages.length, 4);
});
