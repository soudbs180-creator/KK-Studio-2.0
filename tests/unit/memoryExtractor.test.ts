import assert from "node:assert/strict";
import test from "node:test";
import {
  extractMemoryCandidates,
  normalizeContent,
  fingerprintFor,
} from "../../src/features/memory/extractor.ts";

test("extracts user preference sentence from user message", () => {
  const candidates = extractMemoryCandidates(
    "好的，以后请用日系插画风格来出图。",
    "user",
  );
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].memoryType, "user_preference");
  assert.ok(candidates[0].confidence >= 0.7);
  assert.ok(candidates[0].content.includes("日系插画风格"));
});

test("extracts user constraint with high confidence", () => {
  const candidates = extractMemoryCandidates(
    "记住，不要使用红色作为主色。",
    "user",
  );
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].memoryType, "user_constraint");
  assert.ok(candidates[0].confidence >= 0.85);
});

test("extracts habit type", () => {
  const candidates = extractMemoryCandidates(
    "我每次生成都用 4:5 竖版。",
    "user",
  );
  assert.equal(candidates[0].memoryType, "user_habit");
});

test("ignores low-value chit-chat even with trigger words", () => {
  const candidates = extractMemoryCandidates("好的，谢谢你，下次见！", "user");
  assert.equal(candidates.length, 0);
});

test("does not extract when no trigger word present", () => {
  const candidates = extractMemoryCandidates("帮我生成一张海报。", "user");
  assert.equal(candidates.length, 0);
});

test("does not save credentials even when a memory trigger is present", () => {
  assert.deepEqual(
    extractMemoryCandidates("记住我的密码是 123456", "user"),
    [],
  );
  assert.deepEqual(
    extractMemoryCandidates("以后请用这个 API key: sk-example-secret", "user"),
    [],
  );
});

test("does not treat assistant summary as a user preference", () => {
  const candidates = extractMemoryCandidates(
    "已记住：你的偏好是日系插画风格，我会在后续生成中遵循。",
    "assistant",
  );
  assert.equal(candidates.length, 0);
});

test("splits multiple sentences and filters too-short fragments", () => {
  const candidates = extractMemoryCandidates(
    "以后请用暖色调。另外我平时喜欢留白多一些。",
    "user",
  );
  assert.ok(candidates.length >= 2);
});

test("skips empty and too-short messages", () => {
  assert.equal(extractMemoryCandidates("", "user").length, 0);
  assert.equal(extractMemoryCandidates("好的", "user").length, 0);
});

test("normalizeContent strips whitespace, punctuation and case", () => {
  assert.equal(
    normalizeContent("以后请用 日系插画风格！"),
    "以后请用日系插画风格",
  );
});

test("fingerprint is stable and differs across contents", async () => {
  const a = await fingerprintFor("以后请用日系插画风格");
  const b = await fingerprintFor("以后请用日系插画风格");
  const c = await fingerprintFor("以后请用美式漫画风格");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{64}$/);
});
