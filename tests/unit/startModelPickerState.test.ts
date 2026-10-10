import assert from "node:assert/strict";
import test from "node:test";
import { getStartModelSetupMessage } from "../../src/components/startModelPickerState.ts";

test("connected Codex explains that the home composer still uses providers", () => {
  assert.deepEqual(
    getStartModelSetupMessage({ providerModelCount: 0, agentConnected: true }),
    {
      message:
        "Codex 主 Agent 已连接。首页生成使用供应商图片模型；请在右侧 Agent 面板使用 Codex 内置生图。",
      actionLabel: "打开 Agent 面板",
    },
  );
});

test("disconnected Codex keeps the provider setup guidance", () => {
  assert.deepEqual(
    getStartModelSetupMessage({ providerModelCount: 0, agentConnected: false }),
    {
      message:
        "Codex 主 Agent 尚未连接。首页生成需要供应商图片模型；也可先打开右侧 Agent 面板连接 Codex。",
      actionLabel: "打开 Agent 面板",
    },
  );
});

test("a provider model does not show setup guidance", () => {
  assert.equal(
    getStartModelSetupMessage({ providerModelCount: 1, agentConnected: true }),
    null,
  );
});
