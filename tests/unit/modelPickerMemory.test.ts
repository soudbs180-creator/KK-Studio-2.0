import assert from "node:assert/strict";
import test from "node:test";
import {
  readPickerMemory,
  writePickerMemory,
  resolvePickerPins,
} from "../../src/features/models/modelSelection.ts";

test("home inherits old pins only before its own preference exists and never rewrites canvas memory", (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const legacy = JSON.stringify({
    page: "api",
    all: true,
    pins: { image: ["old-api-pin"] },
  });
  const data = new Map([["kk:model-picker:canvas-image", legacy]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  });
  assert.deepEqual(readPickerMemory("home").pins, { image: ["old-api-pin"] });
  const own = { page: "root", all: false, pins: { all: ["new-home-pin"] } };
  writePickerMemory("home", own);
  assert.deepEqual(readPickerMemory("home"), own);
  assert.equal(data.get("kk:model-picker:canvas-image"), legacy);
});

test("legacy family pins expand into exact version pins without losing hidden pins", () => {
  const result = resolvePickerPins(
    [
      { id: "exact-low", legacyPinId: "old-family" },
      { id: "exact-high", legacyPinId: "old-family" },
    ],
    ["old-family", "other-channel"],
  );
  assert.deepEqual(result, ["other-channel", "exact-low", "exact-high"]);
  assert.deepEqual(resolvePickerPins([], result), result);
});
