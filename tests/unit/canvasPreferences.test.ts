import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CANVAS_PREFERENCES,
  parseCanvasPreferences,
  serializeCanvasPreferences,
} from "../../src/domain/canvasPreferences.ts";

test("canvas preferences fall back safely and preserve supported toggles", () => {
  assert.deepEqual(parseCanvasPreferences(null), DEFAULT_CANVAS_PREFERENCES);
  assert.deepEqual(
    parseCanvasPreferences("not-json"),
    DEFAULT_CANVAS_PREFERENCES,
  );
  assert.deepEqual(
    parseCanvasPreferences(
      JSON.stringify({
        version: 1,
        snapEnabled: false,
        showConnections: false,
        backgroundPattern: "grid",
        backgroundColor: "#253649",
      }),
    ),
    {
      version: 1,
      snapEnabled: false,
      showConnections: false,
      backgroundPattern: "grid",
      backgroundColor: "#253649",
    },
  );
});

test("canvas preferences serialization does not include unknown data", () => {
  const value = JSON.parse(
    serializeCanvasPreferences({
      ...DEFAULT_CANVAS_PREFERENCES,
      backgroundColor: undefined,
    }),
  );
  assert.deepEqual(value, DEFAULT_CANVAS_PREFERENCES);
  assert.equal("apiKey" in value, false);
});
