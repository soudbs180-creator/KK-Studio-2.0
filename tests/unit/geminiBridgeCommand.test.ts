import assert from "node:assert/strict";
import test from "node:test";
import {
  GEMINI_BRIDGE_DEVELOPMENT_COMMAND,
  packagedGeminiBridgePowerShellCommand,
} from "../../src/features/agent/geminiBridgeCommand.ts";

test("packaged bridge command quotes resource paths as one literal PowerShell argument", () => {
  const resource =
    "C:\\Apps\\KK #1's $profile`folder\\agent-runtime\\gemini-bridge.mjs";
  assert.equal(
    packagedGeminiBridgePowerShellCommand(resource),
    "node 'C:\\Apps\\KK #1''s $profile`folder\\agent-runtime\\gemini-bridge.mjs'",
  );
});

test("packaged bridge command rejects empty and multiline resource paths", () => {
  for (const resource of [
    "",
    " ",
    "C:\\bridge\0.mjs",
    "C:\\bridge\n.mjs",
    "C:\\bridge\r.mjs",
  ])
    assert.throws(
      () => packagedGeminiBridgePowerShellCommand(resource),
      /Invalid/,
    );
});

test("source development command still requires the repository script", () => {
  assert.equal(
    GEMINI_BRIDGE_DEVELOPMENT_COMMAND,
    "node scripts/gemini-bridge.mjs",
  );
});
