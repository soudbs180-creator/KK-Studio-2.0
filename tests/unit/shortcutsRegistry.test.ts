import assert from "node:assert/strict";
import test from "node:test";
import {
  checkConflict,
  getShortcut,
  getShortcuts,
  normalizeKeys,
  resetShortcut,
  resetToDefaults,
  updateShortcut,
} from "../../src/features/settings/shortcutsRegistry.ts";

test("shortcutsRegistry has standard default keybindings", () => {
  resetToDefaults();
  const shortcuts = getShortcuts();

  const search = shortcuts.find((s) => s.id === "global.search");
  assert.ok(search);
  assert.deepEqual(search.currentKeys, ["Ctrl", "K"]);

  const newSession = shortcuts.find((s) => s.id === "global.newSession");
  assert.ok(newSession);
  assert.deepEqual(newSession.currentKeys, ["Ctrl", "N"]);

  const settings = shortcuts.find((s) => s.id === "global.openSettings");
  assert.ok(settings);
  assert.deepEqual(settings.currentKeys, ["Ctrl", ","]);

  const submit = shortcuts.find((s) => s.id === "composer.submit");
  assert.ok(submit);
  assert.deepEqual(submit.currentKeys, ["Ctrl", "Enter"]);
});

test("normalization sorts modifiers first and deduplicates", () => {
  assert.deepEqual(normalizeKeys(["k", "ctrl"]), ["Ctrl", "K"]);
  assert.deepEqual(normalizeKeys(["Shift", "Alt", "Ctrl", "P"]), [
    "Ctrl",
    "Alt",
    "Shift",
    "P",
  ]);
  assert.deepEqual(normalizeKeys(["ctrl", "CTRL", "A"]), ["Ctrl", "A"]);
});

test("Barrier 1: blocks OS and browser reserved keybindings", () => {
  resetToDefaults();

  const res1 = checkConflict(["Ctrl", "W"], "global");
  assert.equal(res1.hasConflict, true);
  assert.match(res1.reason ?? "", /保留快捷键/);

  const res2 = checkConflict(["Ctrl", "T"], "composer");
  assert.equal(res2.hasConflict, true);

  const res3 = checkConflict(["Alt", "F4"], "canvas");
  assert.equal(res3.hasConflict, true);

  const res4 = checkConflict(["Ctrl", "Shift", "I"], "global");
  assert.equal(res4.hasConflict, true);
});

test("Barrier 2: blocks duplicate keybindings within overlapping scopes", () => {
  resetToDefaults();

  // Ctrl+K is used by global.search
  const res1 = checkConflict(["Ctrl", "K"], "global", "global.newSession");
  assert.equal(res1.hasConflict, true);
  assert.match(res1.reason ?? "", /全局搜索/);

  // Ctrl+K in canvas scope also collides with global scope
  const res2 = checkConflict(["Ctrl", "K"], "canvas", "canvas.undo");
  assert.equal(res2.hasConflict, true);
  assert.match(res2.reason ?? "", /全局搜索/);

  // Self-check should not conflict
  const res3 = checkConflict(["Ctrl", "K"], "global", "global.search");
  assert.equal(res3.hasConflict, false);
});

test("Barrier 3: blocks modifier-only inputs", () => {
  const res1 = checkConflict(["Ctrl"], "global");
  assert.equal(res1.hasConflict, true);
  assert.match(res1.reason ?? "", /实体主键/);

  const res2 = checkConflict(["Ctrl", "Shift"], "global");
  assert.equal(res2.hasConflict, true);

  const res3 = checkConflict(["Alt"], "canvas");
  assert.equal(res3.hasConflict, true);
});

test("updateShortcut and reset flow works correctly", () => {
  resetToDefaults();

  const updateRes = updateShortcut("global.search", ["Ctrl", "Alt", "F"]);
  assert.equal(updateRes.success, true);

  const updated = getShortcut("global.search");
  assert.ok(updated);
  assert.deepEqual(updated.currentKeys, ["Ctrl", "Alt", "F"]);

  // Conflict prevention on update
  const conflictUpdate = updateShortcut("global.newSession", [
    "Ctrl",
    "Alt",
    "F",
  ]);
  assert.equal(conflictUpdate.success, false);
  assert.match(conflictUpdate.error ?? "", /冲突/);

  resetShortcut("global.search");
  const restored = getShortcut("global.search");
  assert.deepEqual(restored?.currentKeys, ["Ctrl", "K"]);
});
