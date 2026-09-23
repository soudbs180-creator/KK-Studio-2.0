import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkMarkdownLinks } from "../../scripts/governance/markdown-links.mjs";

test("current Markdown links detect missing files without treating examples as links", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-markdown-links-"));
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "target.md"), "# Target\n");
    fs.writeFileSync(
      path.join(root, "docs", "index.md"),
      [
        "[valid](target.md#section)",
        "[missing](lost.md)",
        "[escape](../../outside.md)",
        "[external](https://example.com/missing.md)",
        "`[inline example](ignored.md)`",
        "```md",
        "[fenced example](ignored-too.md)",
        "```",
        "[reference]: target.md",
      ].join("\n"),
    );
    assert.deepEqual(checkMarkdownLinks(root, ["docs/index.md"]), [
      "docs/index.md:2: missing link lost.md",
      "docs/index.md:3: link leaves repository ../../outside.md",
    ]);
  } finally {
    assert.ok(root.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("balanced links and fence boundaries retain real targets", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kk-markdown-syntax-"));
  try {
    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "target(1).md"), "# Target\n");
    fs.writeFileSync(
      path.join(root, "docs", "index.md"),
      [
        "[valid](target(1).md)",
        "[missing [nested] label](nested-lost.md)",
        "[multi-line",
        "label](multi-lost.md)",
        "```md",
        "```not-a-closing-fence",
        "[code example](ignored.md)",
        "```",
        "[after fence](after-lost.md)",
      ].join("\n"),
    );
    assert.deepEqual(checkMarkdownLinks(root, ["docs/index.md"]), [
      "docs/index.md:2: missing link nested-lost.md",
      "docs/index.md:3: missing link multi-lost.md",
      "docs/index.md:9: missing link after-lost.md",
    ]);
  } finally {
    assert.ok(root.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
