import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = process.cwd();

export const TOKEN_DEFINITION_FILES = new Set([
  "src/styles/tokens.css",
  "src/styles/ui-tokens.css",
]);

export const LEGACY_PILL_FILES = new Set([
  "src/styles/canvas-actions.css",
  "src/styles/conversation-panel.css",
  "src/styles/global.css",
  "src/styles/model-picker.css",
]);

export const LEGACY_INLINE_RADIUS_FILES = new Set([
  "src/components/agent/AgentFoldbackCard.tsx",
  "src/components/ConversationChatTabs.tsx",
]);

export function lintBorderRadius(name, content, options = {}) {
  const issues = [];
  const normalized = name.replaceAll("\\", "/");
  if (!normalized.endsWith(".css")) return issues;
  if (TOKEN_DEFINITION_FILES.has(normalized)) return issues;
  if (!options.strict && LEGACY_PILL_FILES.has(normalized)) return issues;

  // Check for hardcoded 999px or 9999px border-radius
  const matches = [...content.matchAll(/border-radius:\s*([^;]+);/gi)];
  for (const match of matches) {
    const val = match[1].trim();
    if (/\b(?:999px|9999px)\b/i.test(val)) {
      issues.push(
        `${normalized}: 禁止未授权的硬编码 999px/9999px 圆角 (${val})；请使用语义令牌 var(--kk-radius-control) 或已授权微标令牌`,
      );
    }
  }
  return issues;
}

export function lintInlineStyles(name, content, options = {}) {
  const issues = [];
  const normalized = name.replaceAll("\\", "/");
  if (!normalized.endsWith(".tsx")) return issues;
  if (!options.strict && LEGACY_INLINE_RADIUS_FILES.has(normalized))
    return issues;

  try {
    const sourceFile = ts.createSourceFile(
      normalized,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    function visit(node) {
      if (
        ts.isJsxAttribute(node) &&
        node.name.text === "style" &&
        node.initializer &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        ts.isObjectLiteralExpression(node.initializer.expression)
      ) {
        for (const prop of node.initializer.expression.properties) {
          if (ts.isPropertyAssignment(prop) && prop.name) {
            const propName = prop.name.text ?? prop.name.escapedText;
            if (propName === "borderRadius") {
              const text = prop.initializer
                ? prop.initializer.getText(sourceFile)
                : "";
              issues.push(
                `${normalized}: 禁止在 JSX 中使用行内 borderRadius 样式 (${text})；请使用 CSS 类名或语义令牌`,
              );
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  } catch {
    if (/style\s*=\s*\{\{\s*[^}]*\bborderRadius\b/i.test(content)) {
      issues.push(
        `${normalized}: 禁止在 JSX 中使用行内 borderRadius 样式；请使用 CSS 类名或语义令牌`,
      );
    }
  }
  return issues;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function collectColorLiterals(content) {
  const colorLiterals = {};
  const matches =
    content.match(
      /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/gi,
    ) ?? [];
  for (const literal of matches) {
    const key = literal.toLowerCase().replaceAll(/\s+/g, " ");
    colorLiterals[key] = (colorLiterals[key] ?? 0) + 1;
  }
  return colorLiterals;
}

function extractLucideBindingNames(clause) {
  const bindings = clause?.namedBindings;
  const named =
    bindings && ts.isNamedImports(bindings)
      ? bindings.elements.map((el) => (el.propertyName ?? el.name).text)
      : bindings
        ? ["*"]
        : [];
  return [...(clause?.name ? ["default"] : []), ...named];
}

function extractLucideImports(name, content) {
  return ts
    .createSourceFile(name, content, ts.ScriptTarget.Latest)
    .statements.filter(ts.isImportDeclaration)
    .filter(
      (stmt) =>
        ts.isStringLiteral(stmt.moduleSpecifier) &&
        stmt.moduleSpecifier.text === "lucide-react",
    )
    .flatMap((stmt) => extractLucideBindingNames(stmt.importClause))
    .sort();
}

const COLOR_EXEMPT_FILES = new Set([
  "src/styles/global.css",
  "src/styles/ui-tokens.css",
  "src/styles/tokens.css",
]);

function checkFileStandardViolations({
  name,
  content,
  lines,
  declaredTokens,
  colorLiterals,
  lucideImports,
  allowed,
  options,
}) {
  const fileIssues = [
    ...lintBorderRadius(name, content, options),
    ...lintInlineStyles(name, content, options),
  ];

  for (const match of content.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
    if (!declaredTokens.has(match[1])) {
      fileIssues.push(`${name}: 未定义的 CSS 令牌 ${match[1]}`);
    }
  }

  const addedColors = Object.entries(colorLiterals).filter(
    ([value, count]) => count > (allowed.colors[value] ?? 0),
  );
  if (!COLOR_EXEMPT_FILES.has(name) && addedColors.length > 0) {
    fileIssues.push(
      `${name}: 新增颜色字面量 ${addedColors.map(([v]) => v).join(", ")}；请使用语义令牌`,
    );
  }

  if (
    name !== "src/components/UiIcon.tsx" &&
    lucideImports.some((symbol) => !allowed.lucide.includes(symbol))
  ) {
    fileIssues.push(`${name}: 新增 Lucide 导入；请复用 UiIcon 或 Figma 资源`);
  }

  const maxLines = allowed.maxLines ?? allowed.lines ?? 300;
  if (/^src\/components\/.+\.tsx$/.test(name) && lines > maxLines) {
    fileIssues.push(`${name}: ${lines} 行，超过 ${maxLines} 行组件边界`);
  }

  if (
    name !== "src/components/UiIcon.tsx" &&
    /from\s+["']iconsax-react["']/.test(content)
  ) {
    fileIssues.push(`${name}: Iconsax 必须通过 UiIcon 映射使用`);
  }

  return fileIssues;
}

export function runCheckUiStandards(customFiles, options = {}) {
  const baseline = JSON.parse(
    fs.readFileSync(path.join(root, "config/ui-legacy-baseline.json"), "utf8"),
  );
  const issues = [];
  const inventory = [];

  const sourceFiles =
    customFiles ??
    walk(path.join(root, "src")).filter((file) => /\.(css|tsx)$/.test(file));

  if (
    !fs
      .readFileSync(path.join(root, "src/main.tsx"), "utf8")
      .includes('"./styles/tokens.css"')
  ) {
    issues.push("src/main.tsx: 必须加载现行 Figma 语义 tokens.css");
  }

  const declaredTokens = new Set(
    sourceFiles.flatMap((file) =>
      [
        ...fs.readFileSync(file, "utf8").matchAll(/["']?(--[\w-]+)["']?\s*:/g),
      ].map((match) => match[1]),
    ),
  );

  for (const file of sourceFiles) {
    if (!/\.(css|tsx)$/.test(file)) continue;
    const name = path.relative(root, file).replaceAll("\\", "/");
    const content = fs.readFileSync(file, "utf8");
    const lines = content.trimEnd().split(/\r?\n/).length;
    const colorLiterals = collectColorLiterals(content);
    const lucideImports = extractLucideImports(name, content);
    const allowed = baseline[name] ?? { colors: {}, lucide: [] };

    issues.push(
      ...checkFileStandardViolations({
        name,
        content,
        lines,
        declaredTokens,
        colorLiterals,
        lucideImports,
        allowed,
        options,
      }),
    );

    inventory.push({
      file: name,
      colors: colorLiterals,
      lucide: lucideImports,
      lines,
    });
  }

  return { inventory, issues };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const { inventory, issues } = runCheckUiStandards();
  if (process.argv.includes("--inventory"))
    console.log(JSON.stringify({ inventory, issues }, null, 2));
  else
    console.log(
      `UI 标准检查：${inventory.length} 个文件，${issues.length} 项违规。`,
    );
  for (const issue of issues) console.error(issue);
  process.exitCode = issues.length ? 1 : 0;
}
