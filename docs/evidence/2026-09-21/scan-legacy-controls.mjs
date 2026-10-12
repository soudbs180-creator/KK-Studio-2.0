import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const legacyRoot = 'D:/kk-studio';
const require = createRequire(path.join(legacyRoot, 'package.json'));
const ts = require('typescript');
const roots = ['src/components', 'src/views'];
const files = roots.flatMap((root) => fs.readdirSync(path.join(legacyRoot, root), { recursive: true })
  .filter((file) => file.endsWith('.tsx')).map((file) => `${root}/${file.replaceAll('\\', '/')}`));
const rows = [];
for (const file of files.sort()) {
  const content = fs.readFileSync(path.join(legacyRoot, file), 'utf8');
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      const properties = node.attributes.properties;
      const attrs = Object.fromEntries(properties.filter(ts.isJsxAttribute).map((attr) => [attr.name.getText(source), attr.initializer?.getText(source) ?? 'true']));
      if (['button', 'input', 'select', 'textarea'].includes(tag) || attrs.onClick || attrs.role === '"menuitem"') {
        const jsx = ts.isJsxOpeningElement(node) ? node.parent : node;
        const text = ts.isJsxElement(jsx) ? jsx.children.filter(ts.isJsxText).map((child) => child.text.trim()).filter(Boolean).join(' ') : '';
        rows.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, tag,
          label: attrs['aria-label'] ?? attrs.label ?? attrs.title ?? attrs.placeholder ?? text,
          text, handler: attrs.onClick ?? attrs.onChange ?? attrs.onSubmit ?? null,
          disabled: attrs.disabled ?? null, dynamic: !text && !attrs['aria-label'] && !attrs.label && !attrs.title });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const output = new URL('./legacy-controls.json', import.meta.url);
fs.writeFileSync(output, JSON.stringify({ capturedAt: new Date().toISOString(), legacyRoot, head: '0be7483c668ad5fd0f407b556fe26a85e2e36ba1', evidence: 'Static TSX declarations, including legacy and conditional UI. Not runtime button counts or functionality verification.', filesScanned: files.length, declarations: rows }, null, 2));
console.log(JSON.stringify({ filesScanned: files.length, controlDeclarations: rows.length, output: output.pathname }));
