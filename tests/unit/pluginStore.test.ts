import assert from "node:assert/strict";
import test from "node:test";
import { createPluginStore } from "../../src/features/plugins/pluginStore.ts";
import type { InstalledPlugin } from "../../src/features/plugins/pluginTypes.ts";

const record: InstalledPlugin = {
  id: "fixture",
  name: "Fixture",
  version: "1",
  url: "https://example.test/plugin.js",
  source: "fixture",
  enabled: true,
};

for (const operation of ["upsert", "setEnabled", "remove"] as const) {
  test(`failed plugin ${operation} preserves current and saved records`, () => {
    const raw = JSON.stringify([record]);
    const store = createPluginStore({
      getItem: () => raw,
      setItem: () => {
        throw new Error("fixture storage failure");
      },
      removeItem: () => undefined,
    });
    store.rehydrate();
    assert.throws(() => {
      if (operation === "upsert") store.upsert({ ...record, version: "2" });
      else if (operation === "setEnabled") store.setEnabled(record.id, false);
      else store.remove(record.id);
    }, /插件设置未保存/);
    assert.deepEqual(store.getState().plugins, [record]);
    assert.deepEqual(JSON.parse(raw), [record]);
    assert.match(store.getState().error ?? "", /原记录保留/);
  });
}

for (const raw of ["invalid-json", '{"old":"preserve"}']) {
  test(`unreadable plugin records block overwrite: ${raw}`, () => {
    let saved = raw;
    const store = createPluginStore({
      getItem: () => saved,
      setItem: (_key, value) => {
        saved = value;
      },
      removeItem: () => undefined,
    });
    store.rehydrate();
    assert.throws(() => store.upsert(record), /保存已暂停/);
    assert.equal(saved, raw);
    assert.match(store.getState().error ?? "", /原记录保留/);
  });
}

test("a transient plugin read failure retains original records until a successful reread", () => {
  let saved = JSON.stringify([record]);
  let blocked = true;
  const store = createPluginStore({
    getItem: () => {
      if (blocked) throw new Error("fixture read failure");
      return saved;
    },
    setItem: (_key, value) => {
      saved = value;
    },
    removeItem: () => undefined,
  });
  store.rehydrate();
  assert.throws(
    () => store.upsert({ ...record, id: "replacement" }),
    /保存已暂停/,
  );
  assert.deepEqual(JSON.parse(saved), [record]);
  blocked = false;
  assert.deepEqual(store.rehydrate(), [record]);
  store.setEnabled(record.id, false);
  assert.equal(store.getState().plugins[0].enabled, false);
  assert.equal(JSON.parse(saved)[0].enabled, false);
});

for (const broken of [
  null,
  { id: "fixture" },
  { ...record, enabled: "false" },
  { ...record, description: null },
  { ...record, local: 1 },
]) {
  test(`malformed plugin entry preserves the raw array: ${JSON.stringify(broken)}`, () => {
    let raw = JSON.stringify([broken]);
    const before = raw;
    const store = createPluginStore({
      getItem: () => raw,
      setItem: (_key, value) => {
        raw = value;
      },
      removeItem: () => undefined,
    });
    assert.deepEqual(store.rehydrate(), []);
    assert.match(store.getState().error ?? "", /原记录保留/);
    assert.throws(() => store.upsert(record), /保存已暂停/);
    assert.equal(raw, before);
  });
}

test("valid older plugin records preserve unknown fields and optional false values", () => {
  const saved = {
    ...record,
    official: false,
    local: false,
    futureMetadata: { retained: true },
  };
  let raw = JSON.stringify([saved]);
  const store = createPluginStore({
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
    removeItem: () => undefined,
  });
  assert.deepEqual(store.rehydrate(), [saved]);
  store.setEnabled(record.id, false);
  assert.deepEqual(JSON.parse(raw), [{ ...saved, enabled: false }]);
});
