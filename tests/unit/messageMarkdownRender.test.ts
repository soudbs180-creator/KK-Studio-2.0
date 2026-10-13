import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Node strips .ts types but does not parse JSX. Compile only the real renderer in memory.
const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith("/src/components/MessageMarkdown.tsx"))
      return nextLoad(url, context);
    return {
      format: "module",
      shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
        },
      }).outputText,
    };
  },
});
const { default: MessageMarkdown } =
  await import("../../src/components/MessageMarkdown.tsx");
hooks.deregister();

test("the actual message renderer emits semantic GFM and full code rather than Markdown source", () => {
  const fence = String.fromCharCode(96).repeat(3);
  const html = renderToStaticMarkup(
    createElement(MessageMarkdown, {
      content:
        "# 标题\n\n> 引用\n\n- [x] 完成\n\n| 列 |\n| --- |\n| 值 |\n\n" +
        fence +
        "\n完整 <代码> 🌏\n" +
        fence,
    }),
  );
  assert.ok(html.includes("<h1>标题</h1>"));
  assert.ok(html.includes("<blockquote>"));
  assert.ok(html.includes("<table>"));
  assert.ok(html.includes("<th>列</th>"));
  assert.ok(html.includes('type="checkbox"'));
  assert.ok(html.includes("<pre><code>完整 &lt;代码&gt; 🌏</code></pre>"));
});

test("the actual renderer escapes HTML and refuses active unsafe links/images", () => {
  const html = renderToStaticMarkup(
    createElement(MessageMarkdown, {
      content:
        "<script>alert(1)</script>\n\n[危险](javascript:alert%281%29)\n\n![图片](data:image/svg+xml;base64,PHN2Zz4=)",
    }),
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.equal(html.includes("<script"), false);
  assert.equal(html.includes('href="javascript:'), false);
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes("危险"));
  assert.ok(html.includes("图片"));
});

test("safe images and links carry privacy and external-navigation guards", () => {
  const html = renderToStaticMarkup(
    createElement(MessageMarkdown, {
      content:
        '[文档](https://example.com/docs) ![示意](https://example.com/image.png "原图")',
    }),
  );
  assert.ok(html.includes('href="https://example.com/docs"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('src="https://example.com/image.png"'));
  assert.ok(html.includes('referrerPolicy="no-referrer"'));
  assert.ok(html.includes('alt="示意"'));
});
