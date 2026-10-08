import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCreationSnapshot } from "../../src/features/creation/model.ts";
import {
  decodeSnapshot,
  parseSnapshot,
  SnapshotStorageError,
} from "../../src/features/creation/snapshotCodec.ts";

function fixture(plugin: unknown) {
  return {
    version: 2,
    revision: 3,
    activeProjectId: "plugin-project",
    homeDraft: {},
    projects: [
      {
        id: "plugin-project",
        items: [
          {
            id: "plugin-item",
            title: "插件",
            description: "",
            kind: "text",
            plugin,
          },
        ],
      },
    ],
  };
}

test("all bundled plugin payloads survive repeated snapshot reads without truncation", () => {
  for (const type of [
    "html:render",
    "markdown:doc",
    "sticky-note:note",
    "svg:vector",
  ]) {
    const plugin = {
      type,
      version: "1.0.0",
      width: 380,
      height: 300,
      metadata: {
        content: "完整插件内容\n".repeat(2000),
        options: { enabled: true, values: [0, "中文", null, { zoom: 1.5 }] },
      },
      futureField: { retained: [true, 42] },
    };
    const input = fixture(plugin);
    const original = JSON.stringify(input);
    const restored = parseSnapshot(original);
    assert.ok(restored.projects[0].items[0].plugin);
    assert.deepEqual(restored.projects[0].items[0].plugin, plugin);
    assert.deepEqual(
      parseSnapshot(JSON.stringify(restored)).projects[0].items[0].plugin,
      plugin,
    );
    assert.equal(JSON.stringify(input), original);
  }
});

test("normalization copies plugin metadata independently of the source snapshot", () => {
  const plugin = {
    type: "sticky-note:note",
    metadata: { content: "原始便签" },
  };
  const input = fixture(plugin);
  const normalized = normalizeCreationSnapshot(input);
  assert.ok(normalized);
  const restored = normalized.projects[0].items[0].plugin;
  assert.ok(restored?.metadata);
  assert.notEqual(restored, plugin);
  assert.notEqual(restored.metadata, plugin.metadata);
  restored.metadata.content = "编辑后的便签";
  assert.equal(plugin.metadata.content, "原始便签");
});

test("invalid plugin payloads are rejected before normalization preserves the original", () => {
  for (const plugin of [
    null,
    [],
    "sticky-note:note",
    {},
    { type: "" },
    { type: 1 },
    { type: "svg:vector", version: 1 },
    { type: "svg:vector", width: 0 },
    { type: "svg:vector", height: -1 },
    { type: "svg:vector", metadata: [] },
    { type: "svg:vector", metadata: { content: 1 } },
  ]) {
    const input = fixture(plugin);
    const original = JSON.stringify(input);
    assert.throws(
      () => decodeSnapshot(input),
      (error: unknown) =>
        error instanceof SnapshotStorageError && error.code === "corrupt",
    );
    assert.equal(JSON.stringify(input), original);
  }
});

test("non-JSON plugin metadata, extensions and nonfinite dimensions cannot be saved", () => {
  const invalid = [undefined, NaN, Infinity, 1n, () => "callback", new Date()];
  for (const value of invalid) {
    for (const plugin of [
      { type: "html:render", metadata: { nested: { value } } },
      { type: "html:render", extension: value },
    ]) {
      assert.throws(
        () => decodeSnapshot(fixture(plugin)),
        (error: unknown) =>
          error instanceof SnapshotStorageError && error.code === "corrupt",
      );
    }
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() =>
      decodeSnapshot(fixture({ type: "svg:vector", width: value })),
    );
    assert.throws(() =>
      decodeSnapshot(fixture({ type: "svg:vector", height: value })),
    );
  }
});

test("nested plugin secrets are rejected without altering the input", () => {
  for (const key of ["apiKey", "access_token", "oauthToken", "refresh_token"]) {
    const input = fixture({
      type: "markdown:doc",
      metadata: { nested: [{ [key]: "synthetic-secret" }] },
    });
    const original = JSON.stringify(input);
    assert.throws(() => parseSnapshot(original), /令牌|密钥/);
    assert.equal(JSON.stringify(input), original);
  }
});

test("plain legacy canvas items remain readable without acquiring a plugin", () => {
  const input = fixture(undefined);
  const restored = parseSnapshot(JSON.stringify(input));
  assert.equal(restored.projects[0].items[0].plugin, undefined);
  assert.equal(restored.projects[0].items[0].kind, "text");
});
