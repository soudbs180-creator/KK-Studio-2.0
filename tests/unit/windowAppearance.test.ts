import assert from "node:assert/strict";
import test from "node:test";
import {
  getWindowAppearance,
  setWindowAppearance,
} from "../../src/integrations/windowAppearance.ts";
test("browser reports native transparency unavailable instead of faking opacity", async () => {
  assert.deepEqual(await getWindowAppearance(), {
    supported: false,
    enabled: false,
    reason: "透明窗口仅在支持的桌面宿主中可用。",
  });
  await assert.rejects(setWindowAppearance(true), /桌面/);
});
test("appearance only applies a verified native state and propagates refusal", async () => {
  const commands: string[] = [];
  const invoke = async (command: string) => {
    commands.push(command);
    return { supported: true, enabled: true };
  };
  assert.deepEqual(await setWindowAppearance(true, invoke), {
    supported: true,
    enabled: true,
  });
  assert.deepEqual(commands, ["window_appearance_set"]);
  await assert.rejects(
    setWindowAppearance(true, async () => ({
      supported: true,
      enabled: false,
    })),
    /确认|切换/,
  );
  await assert.rejects(
    setWindowAppearance(true, async () => {
      throw new Error("host rejected");
    }),
    /host rejected/,
  );
});
