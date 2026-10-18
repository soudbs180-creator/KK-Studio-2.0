import test from "node:test";
import assert from "node:assert/strict";
test("canvas overview presents finite coordinates even for retained legacy extremes", async () => {
  const { canvasPositions } = await import("../src/ui/canvasPositions.ts");
  const positions = canvasPositions(
    [
      { id: "a", x: -1e308, y: -1e308 },
      { id: "b", x: 1e308, y: 1e308 },
    ],
    320,
    260,
    48,
  );
  for (const point of positions.values()) {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(
      point.x >= 20 && point.x <= 272 && point.y >= 20 && point.y <= 212,
    );
  }
  assert.ok(positions.get("a")!.x < positions.get("b")!.x);
});
