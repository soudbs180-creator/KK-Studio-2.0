import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as modelCatalogWindow from "../../src/features/models/modelCatalogWindow.ts";
import * as creationModel from "../../src/features/creation/model.ts";
import type { UsageStatusBarProps } from "../../src/components/composer/UsageStatusBar.tsx";

interface UsageStatusBarExports {
  default: (props: UsageStatusBarProps) => React.ReactElement;
  estimateContextTokens: (
    text?: string,
    attachmentCount?: number,
    baseOverhead?: number,
  ) => number;
  resolveMaxTokens: (modelId?: string) => number;
  formatTokenCount: (n: number) => string;
  formatUsageProgress: (
    current: number,
    max: number,
  ) => {
    percentage: number;
    label: string;
    status: "normal" | "warning" | "danger";
  };
  isReasoningModel: (modelId?: string) => boolean;
}

async function loadUsageStatusBarModule(): Promise<UsageStatusBarExports> {
  const componentPath = new URL(
    "../../src/components/composer/UsageStatusBar.tsx",
    import.meta.url,
  );
  const source = await readFile(componentPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const exports: Partial<UsageStatusBarExports> = {};
  const modules: Record<string, unknown> = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
  };

  runInNewContext(compiled.outputText, {
    exports,
    module: { exports },
    require: (name: string) => {
      if (name in modules) return modules[name];
      if (name.endsWith("/models/index.ts")) return modelCatalogWindow;
      if (name.endsWith("/creation/index.ts")) return creationModel;
      throw new Error(`Unexpected dependency in UsageStatusBar: ${name}`);
    },
  });

  return exports as UsageStatusBarExports;
}

test("UsageStatusBar: estimateContextTokens 计算纯英文、纯中文与中英混排 Token", async () => {
  const { estimateContextTokens } = await loadUsageStatusBarModule();

  // 空字符串无附件
  assert.equal(estimateContextTokens("", 0), 0);

  // 纯英文：12 个 ASCII 字符 -> ceil(12 / 4) = 3
  assert.equal(estimateContextTokens("Hello world!", 0), 3);

  // 纯中文：4 个中文字符 -> 4 * 1.0 = 4
  assert.equal(estimateContextTokens("你好世界", 0), 4);

  // 中英混排："Hello 世界" -> 6 ASCII = 2 tokens, 2 CJK = 2 tokens -> 4 tokens
  assert.equal(estimateContextTokens("Hello 世界", 0), 4);

  // 表情符号 / 其它标点
  const emojiTokens = estimateContextTokens("🚀✨", 0);
  assert.ok(emojiTokens >= 1);
});

test("UsageStatusBar: estimateContextTokens 计算多模态图片附件开销与 Base Overhead", async () => {
  const { estimateContextTokens } = await loadUsageStatusBarModule();

  // 1 个附件 = 1,024 tokens
  assert.equal(estimateContextTokens("", 1), 1024);

  // 3 个附件 = 3,072 tokens
  assert.equal(estimateContextTokens("", 3), 3072);

  // 文本 + 附件 + Overhead (512)
  const total = estimateContextTokens("Hello world!", 1, 512);
  assert.equal(total, 3 + 1024 + 512);
});

test("UsageStatusBar: resolveMaxTokens 正确解析后缀或回落预设窗口", async () => {
  const { resolveMaxTokens } = await loadUsageStatusBarModule();

  // 显式后缀解析
  assert.equal(resolveMaxTokens("custom-model[200K]"), 200_000);
  assert.equal(resolveMaxTokens("large-model[1M]"), 1_000_000);
  assert.equal(resolveMaxTokens("mini-model[64k]"), 64_000);

  // 无后缀按模型系列回落
  assert.equal(resolveMaxTokens("deepseek-reasoner"), 64_000);
  assert.equal(resolveMaxTokens("gpt-4o"), 128_000);
  assert.equal(resolveMaxTokens("claude-3-7-sonnet"), 200_000);
  assert.equal(resolveMaxTokens("gemini-1.5-pro"), 1_000_000);

  // 未知模型兜底
  assert.equal(resolveMaxTokens("unknown-vendor-model"), 128_000);
  assert.equal(resolveMaxTokens(""), 128_000);
  assert.equal(resolveMaxTokens(undefined), 128_000);
});

test("UsageStatusBar: formatUsageProgress 进度与三档色标状态", async () => {
  const { formatUsageProgress } = await loadUsageStatusBarModule();

  // 30% -> normal (<70%)
  const normal = formatUsageProgress(38_400, 128_000);
  assert.equal(normal.percentage, 30);
  assert.equal(normal.status, "normal");
  assert.equal(normal.label, "38,400 / 128,000 (30%)");

  // 75% -> warning (70% - 89%)
  const warning = formatUsageProgress(96_000, 128_000);
  assert.equal(warning.percentage, 75);
  assert.equal(warning.status, "warning");

  // 95% -> danger (>=90%)
  const danger = formatUsageProgress(121_600, 128_000);
  assert.equal(danger.percentage, 95);
  assert.equal(danger.status, "danger");

  // 超限截断保护：150% -> 100%
  const overflow = formatUsageProgress(150_000, 128_000);
  assert.equal(overflow.percentage, 100);
  assert.equal(overflow.status, "danger");

  // 0 除保护
  const zeroMax = formatUsageProgress(100, 0);
  assert.equal(zeroMax.status, "danger");
  assert.ok(zeroMax.percentage <= 100);
});

test("UsageStatusBar: isReasoningModel 判定推理模型", async () => {
  const { isReasoningModel } = await loadUsageStatusBarModule();

  assert.equal(isReasoningModel("o1-preview"), true);
  assert.equal(isReasoningModel("o1-mini"), true);
  assert.equal(isReasoningModel("o3-mini"), true);
  assert.equal(isReasoningModel("deepseek-reasoner"), true);
  assert.equal(isReasoningModel("deepseek-r1"), true);
  assert.equal(isReasoningModel("claude-3-7-sonnet-thinking"), true);

  // 新增边界与对抗测试用例：qwq 系列推理模型与裸 o1 支持
  assert.equal(isReasoningModel("qwen-qwq-32b"), true);
  assert.equal(isReasoningModel("qwq"), true);
  assert.equal(isReasoningModel("qwq-32b"), true);
  assert.equal(isReasoningModel("o1"), true);
  assert.equal(isReasoningModel("openai/o1"), true);
  assert.equal(isReasoningModel("deepseek-ai/DeepSeek-R1"), true);
  assert.equal(isReasoningModel("deepseek-r1-distill-qwen-32b"), true);

  // 防误判：包含 o1 / r1 子串但非推理模型的普通模型
  assert.equal(isReasoningModel("solo1"), false);
  assert.equal(isReasoningModel("audio1"), false);
  assert.equal(isReasoningModel("turbo1"), false);
  assert.equal(isReasoningModel("auto1"), false);
  assert.equal(isReasoningModel("stereo1"), false);
  assert.equal(isReasoningModel("video1"), false);

  assert.equal(isReasoningModel("gpt-4o"), false);
  assert.equal(isReasoningModel("gpt-3.5-turbo"), false);
  assert.equal(isReasoningModel("claude-3-5-sonnet"), false);
  assert.equal(isReasoningModel(""), false);
  assert.equal(isReasoningModel(undefined), false);
});

test("UsageStatusBar: formatTokenCount 格式化千分位", async () => {
  const { formatTokenCount } = await loadUsageStatusBarModule();

  assert.equal(formatTokenCount(0), "0");
  assert.equal(formatTokenCount(1024), "1,024");
  assert.equal(formatTokenCount(38400), "38,400");
  assert.equal(formatTokenCount(1000000), "1,000,000");
});

test("UsageStatusBar: CreationDraft 支持 reasoningEffort 状态扩展与不可变合并", () => {
  const base = creationModel.emptyDraft();
  assert.equal(base.reasoningEffort, undefined);

  const updated: creationModel.CreationDraft = {
    ...base,
    reasoningEffort: "high",
    updatedAt: Date.now(),
  };

  assert.equal(updated.reasoningEffort, "high");

  const mediumDraft: creationModel.CreationDraft = {
    ...updated,
    reasoningEffort: "medium",
  };
  assert.equal(mediumDraft.reasoningEffort, "medium");

  const lowDraft: creationModel.CreationDraft = {
    ...updated,
    reasoningEffort: "low",
  };
  assert.equal(lowDraft.reasoningEffort, "low");
});

test("UsageStatusBar: 渲染静态 DOM 结构、进度条、缓存徽标与 TPS", async () => {
  const { default: UsageStatusBarComponent } = await loadUsageStatusBarModule();

  const element = UsageStatusBarComponent({
    currentTokens: 38_400,
    maxTokens: 128_000,
    cachedPercentage: 35,
    outputTps: 48,
    reasoningEffort: "high",
  });

  const html = renderToStaticMarkup(element);

  // 包含状态栏根类与 aria
  assert.ok(html.includes("composer-usage-status-bar"));
  assert.ok(html.includes("38,400 / 128,000 (30%)"));

  // 进度条与正常色标
  assert.ok(html.includes("composer-token-progress-bar status-normal"));
  assert.ok(html.includes("width:30%"));

  // 缓存徽标高亮
  assert.ok(html.includes("composer-cache-badge is-cached"));
  assert.ok(html.includes("⚡ Cached (35%)"));

  // 吞吐指示器
  assert.ok(html.includes("48 tps"));

  // 推理思考深度选择器激活 High
  assert.ok(html.includes("composer-reasoning-btn is-active"));
  assert.ok(html.includes("High"));
});

test("UsageStatusBar: 驱动 CreationDraft 自动计算 Token 与非推理模型置灰", async () => {
  const { default: UsageStatusBarComponent } = await loadUsageStatusBarModule();

  const draft: creationModel.CreationDraft = {
    ...creationModel.emptyDraft(),
    prompt: "这是一段用于测试上下文 Token 估算的创作提示词。",
    model: "gpt-4o",
    reasoningEffort: "medium",
  };

  const element = UsageStatusBarComponent({ draft });
  const html = renderToStaticMarkup(element);

  assert.ok(html.includes("composer-usage-status-bar"));
  // gpt-4o 非推理模型，推理选择器置灰
  assert.ok(html.includes("composer-reasoning-selector is-disabled"));
  // 未缓存时呈现 is-idle
  assert.ok(html.includes("composer-cache-badge is-idle"));
  assert.ok(html.includes("-- tps"));
});
