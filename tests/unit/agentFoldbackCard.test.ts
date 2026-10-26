import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement, Fragment, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { SubagentFoldbackResult } from "../../src/features/agent/delegation/foldbackContract.ts";
import type { AgentFoldbackCardProps } from "../../src/components/agent/AgentFoldbackCard.tsx";

type AgentFoldbackCardComponent = (
  props: AgentFoldbackCardProps,
) => ReactElement;

async function createFoldbackCardHarness() {
  const componentPath = new URL(
    "../../src/components/agent/AgentFoldbackCard.tsx",
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

  const exports: {
    default?: AgentFoldbackCardComponent;
    AgentFoldbackCard?: AgentFoldbackCardComponent;
  } = {};

  const modules: Record<string, unknown> = {
    react: {
      createElement,
      Fragment,
      useState: (initial: unknown) => [initial, () => {}],
      useId: () => "mock-id-1234",
    },
    "react/jsx-runtime": { jsx: createElement, jsxs: createElement, Fragment },
  };

  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      if (name in modules) return modules[name];
      if (name.includes("foldbackContract")) return {};
      throw new Error(`Unexpected dependency in AgentFoldbackCard: ${name}`);
    },
  });

  const Component = exports.AgentFoldbackCard || exports.default;
  if (!Component) {
    throw new Error("Failed to export AgentFoldbackCard component");
  }

  return (props: AgentFoldbackCardProps) => {
    const tree = Component(props);
    const html = renderToStaticMarkup(tree);
    return { tree, html };
  };
}

test("AgentFoldbackCard renders compact collapsed view with role, status, summary, and tokens", async () => {
  const render = await createFoldbackCardHarness();

  const successResult: SubagentFoldbackResult = {
    taskId: "task-fb-001",
    subagentRole: "scraper",
    status: "success",
    executiveSummary: "Scraped 25 items from target website.",
    tokensConsumed: 450,
    executionStats: {
      durationMs: 1250,
      intermediateTurns: 6,
      rawTokensEstimate: 12000,
      tokensSaved: 11550,
    },
  };

  const { html } = render({ result: successResult });

  // Outer region & accessibility
  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="子任务执行简报: scraper"/);
  assert.match(html, /data-task-id="task-fb-001"/);
  assert.match(html, /data-subagent-role="scraper"/);

  // Status & Role badges
  assert.match(html, /foldback-status-success/);
  assert.match(html, /已完成/);
  assert.match(html, /scraper/);
  assert.match(html, /#task-fb-001/);

  // Executive summary
  assert.match(html, /Scraped 25 items from target website\./);

  // Token anti-pollution badges
  assert.match(html, /消耗 450/);
  assert.match(html, /🛡️ 省略 ~11,550 tokens/);

  // Collapsed state: toggle button shows expand indicator
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /查看详情 ▼/);

  // Grid collapse keeps content mounted for a CSS 0fr → 1fr transition.
  assert.match(html, /class="kk-grid-collapse"/);
  assert.match(html, /aria-hidden="true"/);
});

test("AgentFoldbackCard renders partial and failed status badges accurately", async () => {
  const render = await createFoldbackCardHarness();

  // Partial status
  const partialResult: SubagentFoldbackResult = {
    taskId: "task-part-1",
    subagentRole: "analyst",
    status: "partial",
    executiveSummary: "Partial analysis due to turn cap.",
  };
  const { html: partialHtml } = render({ result: partialResult });
  assert.match(partialHtml, /foldback-status-partial/);
  assert.match(partialHtml, /部分完成/);

  // Failed status
  const failedResult: SubagentFoldbackResult = {
    taskId: "task-fail-1",
    subagentRole: "image_editor",
    status: "failed",
    executiveSummary: "Segmentation failed.",
    error: "GPU memory out of allocation",
  };
  const { html: failedHtml } = render({ result: failedResult });
  assert.match(failedHtml, /foldback-status-failed/);
  assert.match(failedHtml, /失败/);
});

test("AgentFoldbackCard renders artifact pills when artifactRefs are provided", async () => {
  const render = await createFoldbackCardHarness();

  const resultWithArtifacts: SubagentFoldbackResult = {
    taskId: "task-art-1",
    subagentRole: "scraper",
    status: "success",
    executiveSummary: "Extracted report and datasets.",
    artifactRefs: ["summary.csv", "deep_insights.pdf"],
  };

  const { html } = render({ result: resultWithArtifacts });
  assert.match(html, /data-testid="foldback-artifact-list"/);
  assert.match(html, /summary\.csv/);
  assert.match(html, /deep_insights\.pdf/);

  // Without artifacts
  const { html: noArtHtml } = render({
    result: {
      ...resultWithArtifacts,
      artifactRefs: undefined,
    },
  });
  assert.doesNotMatch(noArtHtml, /data-testid="foldback-artifact-list"/);
});

test("AgentFoldbackCard in expanded mode displays structured data, error box, and execution stats", async () => {
  const render = await createFoldbackCardHarness();

  const expandedResult: SubagentFoldbackResult = {
    taskId: "task-exp-1",
    subagentRole: "deep_analysis",
    status: "failed",
    executiveSummary: "Analysis finished with timeout error.",
    error: "Network socket timeout after 30000ms",
    structuredData: {
      scannedPages: 12,
      confidenceScore: 0.88,
    },
    executionStats: {
      durationMs: 31050,
      intermediateTurns: 15,
      rawTokensEstimate: 42000,
      tokensSaved: 41800,
    },
  };

  const { html } = render({ result: expandedResult, isExpanded: true });

  // Toggle button in expanded state
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /收起详情 ▲/);

  // Expanded drawer
  assert.match(html, /data-testid="foldback-expanded-content"/);
  assert.match(html, /沙箱上下文隔离保护.*已安全归档 15 轮内部工具调用/);

  // Structured data JSON
  assert.match(html, /data-testid="foldback-structured-data"/);
  assert.match(html, /(&quot;|")scannedPages(&quot;|"):\s*12/);
  assert.match(html, /(&quot;|")confidenceScore(&quot;|"):\s*0\.88/);

  // Error box
  assert.match(html, /data-testid="foldback-error-box"/);
  assert.match(html, /Network socket timeout after 30000ms/);

  // Execution stats
  assert.match(html, /耗时: 31050ms/);
  assert.match(html, /执行轮次: 15 轮/);
  assert.match(html, /原始文本体量: ~42,000 tokens/);
});
