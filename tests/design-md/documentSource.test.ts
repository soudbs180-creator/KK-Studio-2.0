import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentSource } from "../../design/preview/documentSource.ts";

test("design source displays untrusted Markdown and HTML as literal text", () => {
  const source =
    '# DESIGN.md\n<img src=x onerror="alert(1)">\n<script>bad()</script>';
  const rendered = renderToStaticMarkup(
    createElement(DocumentSource, { source }),
  );
  assert.match(rendered, /# DESIGN\.md/);
  assert.match(rendered, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(rendered, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(rendered, /<(?:img|script)\b/);
});
