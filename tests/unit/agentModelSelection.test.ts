import assert from "node:assert/strict";
import test from "node:test";
import { resolveCodexModel } from "../../src/features/agent/agentModelSelection.ts";

const models = [
  {
    id: "gpt-6-astra-id",
    model: "gpt-6-astra",
    displayName: "GPT-6-Astra",
  },
  {
    id: "gpt-6-sol",
    model: "gpt-6-sol",
    displayName: "GPT-6-Sol",
    isDefault: true,
  },
];

test("Codex 选择器保留当前账号支持的显式模型", () => {
  assert.equal(resolveCodexModel(models, "gpt-6-astra"), "gpt-6-astra");
  assert.equal(resolveCodexModel(models, "gpt-6-astra-id"), "gpt-6-astra");
});

test("旧配置或项目模型不在 Agent 列表时回退账号默认模型", () => {
  assert.equal(resolveCodexModel(models, "gpt-6.1-sol"), "gpt-6-sol");
  assert.equal(resolveCodexModel(models, "图片模型未报告"), "gpt-6-sol");
  assert.equal(resolveCodexModel(models), "gpt-6-sol");
});

test("Agent 未报告默认项时使用第一个可用模型，空列表不传未知模型", () => {
  const withoutDefault = models.map(
    ({ isDefault: _isDefault, ...model }) => model,
  );
  assert.equal(resolveCodexModel(withoutDefault), "gpt-6-astra");
  assert.equal(resolveCodexModel([]), undefined);
});
