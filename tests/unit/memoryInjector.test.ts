import assert from "node:assert/strict";
import test from "node:test";
import {
  lexicalScore,
  selectMemoryRecords,
  formatInjectionBlock,
} from "../../src/features/memory/injector.ts";
import type { MemoryRecord } from "../../src/features/memory/types.ts";

function record(partial: Partial<MemoryRecord>): MemoryRecord {
  return {
    id: partial.id ?? "r1",
    namespace: "ns",
    content: partial.content ?? "用户偏好日系插画风格",
    memoryType: partial.memoryType ?? "user_preference",
    confidence: partial.confidence ?? 0.8,
    fingerprint: partial.fingerprint ?? "fp",
    source: partial.source ?? "auto_rule",
    createdAt: partial.createdAt ?? "2026-09-20T10:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-09-20T10:00:00.000Z",
    active: partial.active ?? true,
  };
}

test("lexicalScore is higher for related content", () => {
  const related = lexicalScore(
    "帮我生成日系插画风格的海报",
    "用户偏好日系插画风格",
  );
  const unrelated = lexicalScore(
    "帮我生成日系插画风格的海报",
    "用户偏好美式漫画风格",
  );
  assert.ok(related > 0);
  assert.ok(related > unrelated);
});

test("selectMemoryRecords filters inactive and low confidence", () => {
  const records = [
    record({ id: "a", confidence: 0.8, active: true }),
    record({ id: "b", confidence: 0.3, active: true }),
    record({ id: "c", confidence: 0.9, active: false }),
  ];
  const selected = selectMemoryRecords("日系插画", records);
  const ids = selected.map((item) => item.id);
  assert.deepEqual(ids, ["a"]);
});

test("selectMemoryRecords respects max count and total limit", () => {
  const records = [
    record({ id: "a", content: "用户偏好日系插画风格" }),
    record({ id: "b", content: "用户喜欢留白多一些的构图" }),
    record({ id: "c", content: "用户偏好暖色调的配色方案" }),
  ];
  const selected = selectMemoryRecords("日系插画 留白 暖色调", records, {
    max: 2,
  });
  assert.ok(selected.length <= 2);
  const limited = selectMemoryRecords("日系插画 留白 暖色调", records, {
    totalLimit: 10,
  });
  const total = limited.reduce((sum, item) => sum + item.content.length + 2, 0);
  assert.ok(total <= 10);
});

test("selectMemoryRecords returns empty when no lexical match", () => {
  const selected = selectMemoryRecords("量子计算", [record({ id: "a" })]);
  assert.equal(selected.length, 0);
});

test("formatInjectionBlock formats records with dates and conflict note", () => {
  const block = formatInjectionBlock([
    record({
      id: "a",
      content: "用户偏好日系插画风格",
      createdAt: "2026-09-20T08:00:00Z",
    }),
  ]);
  assert.ok(block.includes("[长期记忆]"));
  assert.ok(block.includes("[2026-09-20]"));
  assert.ok(block.includes("用户偏好日系插画风格"));
  assert.ok(block.includes("冲突时以本轮输入为准"));
});

test("formatInjectionBlock returns empty string for no records", () => {
  assert.equal(formatInjectionBlock([]), "");
});
