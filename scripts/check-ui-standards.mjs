import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const baseline = JSON.parse(
  fs.readFileSync(path.join(root, "config/ui-legacy-baseline.json"), "utf8"),
);
const issues = [];
const inventory = [];
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const sourceFiles = walk(path.join(root, "src")).filter((file) =>
  /\.(css|tsx)$/.test(file),
);
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
  for (const match of content.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
    if (!declaredTokens.has(match[1]))
      issues.push(`${name}: 未定义的 CSS 令牌 ${match[1]}`);
  }
  const colorLiterals = {};
  for (const literal of content.match(
    /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/gi,
  ) ?? []) {
    const key = literal.toLowerCase().replaceAll(/\s+/g, " ");
    colorLiterals[key] = (colorLiterals[key] ?? 0) + 1;
  }
  const imports = ts
    .createSourceFile(name, content, ts.ScriptTarget.Latest)
    .statements.filter(ts.isImportDeclaration)
    .filter((statement) => ts.isStringLiteral(statement.moduleSpecifier));
  const lucideImports = imports
    .filter((statement) => statement.moduleSpecifier.text === "lucide-react")
    .flatMap((statement) => {
      const clause = statement.importClause;
      const bindings = clause?.namedBindings;
      return [
        ...(clause?.name ? ["default"] : []),
        ...(bindings && ts.isNamedImports(bindings)
          ? bindings.elements.map(
              (element) => (element.propertyName ?? element.name).text,
            )
          : bindings
            ? ["*"]
            : []),
      ];
    })
    .sort();
  const allowed = baseline[name] ?? { colors: {}, lucide: [] };
  const addedColors = Object.entries(colorLiterals).filter(
    ([value, count]) => count > (allowed.colors[value] ?? 0),
  );
  if (
    !["src/styles/global.css", "src/styles/ui-tokens.css"].includes(name) &&
    addedColors.length > 0
  )
    issues.push(
      `${name}: 新增颜色字面量 ${addedColors.map(([value]) => value).join(", ")}；请使用语义令牌`,
    );
  if (lucideImports.some((symbol) => !allowed.lucide.includes(symbol)))
    issues.push(`${name}: 新增 Lucide 导入；请复用 UiIcon 或 Figma 资源`);
  if (/^src\/components\/.+\.tsx$/.test(name) && lines > 300)
    issues.push(`${name}: ${lines} 行，超过 300 行组件边界`);
  if (
    name !== "src/components/UiIcon.tsx" &&
    /from\s+["']iconsax-react["']/.test(content)
  )
    issues.push(`${name}: Iconsax 必须通过 UiIcon 映射使用`);
  inventory.push({
    file: name,
    colors: colorLiterals,
    lucide: lucideImports,
    lines,
  });
}
if (process.argv.includes("--inventory"))
  console.log(JSON.stringify({ inventory, issues }, null, 2));
else
  console.log(
    `UI 标准检查：${inventory.length} 个文件，${issues.length} 项违规。`,
  );
for (const issue of issues) console.error(issue);
process.exitCode = issues.length ? 1 : 0;
