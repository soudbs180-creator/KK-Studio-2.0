import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeSnapshot,
  parseSnapshot,
  storageError,
} from "../../src/features/creation/snapshotCodec.ts";
const basic = () => ({
  version: 2,
  revision: 3,
  activeProjectId: "p1",
  homeDraft: {},
  projects: [
    {
      id: "p1",
      items: [{ id: "image", title: "图片", description: "", kind: "image" }],
    },
  ],
});
test("原生素材缺失提示保留可操作原因且不泄露原始错误", () => {
  const error = storageError("missing: synthetic-private-path");
  assert.equal(error.code, "corrupt");
  assert.match(error.message, /素材.*缺失/);
  assert.match(error.message, /原件.*重新读取/);
  assert.doesNotMatch(error.message, /synthetic-private/);
});
test("malformed members, duplicated identities and unknown versions cannot become writable empty data", () => {
  const duplicate = basic();
  duplicate.projects[0].items.push({ ...duplicate.projects[0].items[0] });
  for (const value of [
    { ...basic(), version: 3 },
    { ...basic(), projects: [{ id: "broken" }] },
    duplicate,
    { ...basic(), activeProjectId: "missing" },
  ])
    assert.throws(() => decodeSnapshot(value));
  assert.throws(() => parseSnapshot("{broken"));
});
test("normalization may add defaults but cannot truncate existing content on read", () => {
  const value = basic();
  value.projects[0].items[0].description = "x".repeat(600);
  assert.throws(() => decodeSnapshot(value), /完整|截断|范围/);
  assert.equal(value.projects[0].items[0].description.length, 600);
});
test("secret fields are rejected at browser and draft-export boundaries", () => {
  assert.throws(
    () => decodeSnapshot({ ...basic(), apiKey: "synthetic-secret" }),
    /凭据|令牌|密钥/,
  );
});
