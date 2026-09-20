import path from "node:path";
import { isBuiltin } from "node:module";
import ts from "typescript";

export function checkImportBoundaries(file, content, root = process.cwd()) {
  const relative = file.replaceAll("\\", "/");
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const issues = [];
  const within = (target, directory) =>
    target === directory || target.startsWith(directory + "/");
  function inspect(node) {
    const target =
      ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
          ? node.argument.literal
          : ts.isCallExpression(node) &&
              (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                node.expression.getText(source) === "require")
            ? node.arguments[0]
            : undefined;
    if (
      target &&
      (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target))
    ) {
      const specifier = target.text;
      const resolved = specifier.startsWith(".")
        ? path
            .relative(root, path.resolve(root, path.dirname(file), specifier))
            .replaceAll("\\", "/")
        : specifier.startsWith("@/")
          ? "src/" + specifier.slice(2)
          : specifier;
      if (
        within(relative, "src/domain") &&
        (["components", "features", "integrations", "styles"].some((layer) =>
          within(resolved, "src/" + layer),
        ) ||
          within(resolved, "react") ||
          within(resolved, "react-dom") ||
          within(resolved, "@tauri-apps") ||
          isBuiltin(specifier))
      )
        issues.push(`${relative}: domain cannot depend on ${specifier}`);
      if (
        !within(relative, "src/features/generation-server") &&
        (isBuiltin(specifier) ||
          within(resolved, "src/features/generation-server"))
      )
        issues.push(
          `${relative}: browser/shared source cannot import server-only ${specifier}`,
        );
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  return issues;
}
