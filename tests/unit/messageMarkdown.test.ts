import assert from "node:assert/strict";
import test from "node:test";
import {
  parseMessageMarkdown,
  safeMarkdownUrl,
  type MessageMarkdownNode,
} from "../../src/features/conversation/markdown.ts";

function descendants(nodes: MessageMarkdownNode[]): MessageMarkdownNode[] {
  return nodes.flatMap((node) => [node, ...descendants(node.children ?? [])]);
}

function text(nodes: MessageMarkdownNode[]): string {
  return nodes.map((node) => node.value ?? text(node.children ?? [])).join("");
}

test("message Markdown renders headings, quotes, lists and GFM tables without losing text", () => {
  const nodes = descendants(
    parseMessageMarkdown(
      "# 研究 🧪\n\n> 引用\n\n1. 第一条\n2. 第二条\n\n| 项目 | 状态 |\n| --- | --- |\n| 图片 | 完整 |",
    ),
  );
  for (const tag of ["h1", "blockquote", "ol", "li", "table", "th", "td"])
    assert.ok(
      nodes.some((node) => node.tag === tag),
      tag,
    );
  assert.ok(text(nodes).includes("研究 🧪"));
  assert.ok(nodes.some((node) => node.value === "完整"));
});

test("GFM checklists, deletion and literal URLs have usable safe output", () => {
  const nodes = descendants(
    parseMessageMarkdown(
      "- [x] 已完成\n- [ ] 未完成\n\n~~旧内容~~ https://example.com/docs",
    ),
  );
  assert.deepEqual(
    nodes
      .filter((node) => node.type === "checkbox")
      .map((node) => node.checked),
    [true, false],
  );
  assert.ok(nodes.some((node) => node.tag === "del"));
  assert.ok(
    nodes.some(
      (node) => node.tag === "a" && node.url === "https://example.com/docs",
    ),
  );
});

test("code blocks retain complete Unicode and unclosed streaming fences", () => {
  const fence = String.fromCharCode(96).repeat(3);
  const value = "const 名称 = '🌏';\n" + "长".repeat(40000);
  const nodes = parseMessageMarkdown(fence + "typescript\n" + value);
  const code = descendants(nodes).find((node) => node.type === "code");
  assert.equal(code?.value, value);
  assert.equal(code?.language, "typescript");
  assert.equal(text(parseMessageMarkdown("**尚未闭合 🧩")), "**尚未闭合 🧩");
});

test("embedded HTML remains escaped text and unsafe links/images never receive URLs", () => {
  const nodes = descendants(
    parseMessageMarkdown(
      '<script>alert(1)</script>\n\n<img src=x onerror="alert(2)">\n\n[危险](javascript:alert%281%29) ![秘密](data:image/svg+xml;base64,PHN2Zz4=)',
    ),
  );
  assert.ok(nodes.some((node) => node.value?.includes("<script>")));
  assert.ok(nodes.some((node) => node.value?.includes("onerror")));
  assert.equal(
    nodes.some((node) => node.url?.startsWith("javascript:")),
    false,
  );
  assert.equal(
    nodes.some((node) => node.url?.startsWith("data:")),
    false,
  );
  assert.equal(
    nodes.some((node) => node.type === "image"),
    false,
  );
  assert.ok(nodes.some((node) => node.value === "秘密"));
});

test("safe URLs reject credential URLs and control-character protocol tricks", () => {
  for (const url of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,evil",
    "file:///private",
    "//evil.test/x",
    "https://user:password@example.com",
    "https://example.com/\u0000x",
  ])
    assert.equal(safeMarkdownUrl(url), undefined, url);
  assert.equal(
    safeMarkdownUrl("https://example.com/文档?q=1"),
    "https://example.com/文档?q=1",
  );
  assert.equal(
    safeMarkdownUrl("mailto:hello@example.com"),
    "mailto:hello@example.com",
  );
  assert.equal(safeMarkdownUrl("#part-1"), "#part-1");
  assert.equal(safeMarkdownUrl("mailto:hello@example.com", true), undefined);
});

test("reference links and images resolve definitions through the same URL guard", () => {
  const nodes = descendants(
    parseMessageMarkdown(
      "[资料][ref] ![示意][image]\n\n[ref]: https://example.com/report\n[image]: https://example.com/image.png",
    ),
  );
  assert.ok(
    nodes.some(
      (node) => node.tag === "a" && node.url === "https://example.com/report",
    ),
  );
  assert.ok(
    nodes.some(
      (node) =>
        node.type === "image" && node.url === "https://example.com/image.png",
    ),
  );
});
