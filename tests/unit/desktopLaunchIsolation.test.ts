import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { parseDesktopLaunchArguments } from "../../scripts/windows/desktop-release.mjs";

test("the official launcher keeps an explicit isolated data path as one argument", () => {
  const data = path.resolve("test-results", "启动恢复", "isolated data");
  assert.deepEqual(
    parseDesktopLaunchArguments(["--background", "--data-dir", data]),
    ["--data-dir", data],
  );
  assert.deepEqual(parseDesktopLaunchArguments(["--background"]), []);
});
test("invalid or ambiguous launch arguments fail before starting any application", () => {
  for (const args of [
    ["--data-dir"],
    ["--data-dir", "relative"],
    ["--data-dir", path.resolve("data"), "--data-dir", path.resolve("other")],
    ["--unknown"],
  ])
    assert.throws(() => parseDesktopLaunchArguments(args));
});
