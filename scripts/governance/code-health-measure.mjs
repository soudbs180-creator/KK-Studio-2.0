/**
 * TypeScript 结构度量：每函数的圈复杂度、自有行数、嵌套深度，以及模式规则命中。
 * 只解析不做类型检查，仅依赖 typescript 包，因此快且无需 tsconfig。
 *
 * 移植自 hermes-agent 的 scripts/code_health/ts_units.mjs（MIT License）。
 * 口径：CC 为经典 McCabe（1 + if/?:/case/循环/catch/&&/||/??），与 ruff C901 可比；
 * 不把可选链、逻辑赋值和默认参数值计入（与 hermes 一致，棘轮只与自身比较）。
 * 身份：单元名是类/对象/函数限定名（Cls.method、outer.inner）；重名加 #N，
 * 比较时重名按函数体配对，不按序号。函数体哈希覆盖 token 流（注释与空白除外），
 * 因此改名或改注释仍是同一份代码。嵌套函数是独立单元，父函数只算自己的行。
 */
import { createHash } from "node:crypto";
import ts from "typescript";
import {
  ALLOW_RE,
  MODULE_SCOPE,
  PATTERN_RULES,
} from "./code-health.config.mjs";

const K = ts.SyntaxKind;

const FUNCTION_KINDS = new Set([
  K.FunctionDeclaration,
  K.MethodDeclaration,
  K.ArrowFunction,
  K.FunctionExpression,
  K.Constructor,
  K.GetAccessor,
  K.SetAccessor,
]);
const BRANCH_KINDS = new Set([
  K.IfStatement,
  K.ConditionalExpression,
  K.ForStatement,
  K.ForInStatement,
  K.ForOfStatement,
  K.WhileStatement,
  K.DoStatement,
  K.CatchClause,
]);
const BLOCK_KINDS = new Set([
  K.IfStatement,
  K.ForStatement,
  K.ForInStatement,
  K.ForOfStatement,
  K.WhileStatement,
  K.DoStatement,
  K.SwitchStatement,
  K.TryStatement,
]);
const LOGICAL_OPS = new Set([
  K.AmpersandAmpersandToken,
  K.BarBarToken,
  K.QuestionQuestionToken,
]);

function complexity(fn) {
  let cc = 1;
  const visit = (node) => {
    if (node !== fn && FUNCTION_KINDS.has(node.kind)) return;
    if (BRANCH_KINDS.has(node.kind)) cc += 1;
    else if (node.kind === K.CaseClause) cc += 1;
    else if (
      node.kind === K.BinaryExpression &&
      LOGICAL_OPS.has(node.operatorToken.kind)
    )
      cc += 1;
    ts.forEachChild(node, visit);
  };
  visit(fn);
  return cc;
}

function nesting(fn) {
  let deepest = 0;
  const visit = (node, depth) => {
    if (node !== fn && FUNCTION_KINDS.has(node.kind)) return;
    let next = depth;
    // else if 保持其 if 的深度，不逐层叠加。
    const isElseIf =
      node.kind === K.IfStatement &&
      node.parent?.kind === K.IfStatement &&
      node.parent.elseStatement === node;
    if (BLOCK_KINDS.has(node.kind) && !isElseIf) {
      next = depth + 1;
      deepest = Math.max(deepest, next);
    }
    ts.forEachChild(node, (child) => visit(child, next));
  };
  visit(fn, 0);
  return deepest;
}

function propertyName(name) {
  if (!name) return null;
  if (
    ts.isIdentifier(name) ||
    ts.isPrivateIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  return null;
}

/** 匿名函数从绑定处取名：const x = () => {}、x: () => {}、const x = useCallback(() => {})。 */
function bindingName(node) {
  let current = node.parent;
  while (
    current &&
    (ts.isCallExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current))
  ) {
    if (
      ts.isCallExpression(current) &&
      current.parent &&
      ts.isExpressionStatement(current.parent)
    ) {
      return null;
    }
    current = current.parent;
  }
  if (!current) return null;
  if (
    ts.isVariableDeclaration(current) ||
    ts.isPropertyAssignment(current) ||
    ts.isPropertyDeclaration(current)
  ) {
    return propertyName(current.name);
  }
  return null;
}

function ownName(node) {
  if (node.kind === K.Constructor) return "constructor";
  const named = propertyName(node.name);
  if (named) {
    if (node.kind === K.GetAccessor) return `get ${named}`;
    if (node.kind === K.SetAccessor) return `set ${named}`;
    return named;
  }
  return bindingName(node);
}

/** 全文件代码 token（注释、空白、JSDoc 除外）按序收集一次，函数哈希取其切片。 */
function fileTokens(sf) {
  const starts = [];
  const texts = [];
  const visit = (node) => {
    if (node.kind >= K.FirstJSDocNode && node.kind <= K.LastJSDocNode) return;
    const children = node.getChildren(sf);
    if (children.length === 0) {
      const text = ts.isJsxText(node)
        ? node.getText(sf).replace(/\s+/g, " ").trim()
        : node.getText(sf);
      if (text) {
        starts.push(node.getStart(sf));
        texts.push(text);
      }
      return;
    }
    for (const child of children) visit(child);
  };
  visit(sf);
  return { starts, texts };
}

function lowerBound(sorted, value) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** node 的 token 文本，跳过起点在 cuts 中的 token。 */
function tokenText(tokens, node, sf, cuts) {
  const out = [];
  const end = lowerBound(tokens.starts, node.getEnd());
  for (let i = lowerBound(tokens.starts, node.getStart(sf)); i < end; i += 1) {
    if (!cuts.has(tokens.starts[i])) out.push(tokens.texts[i]);
  }
  return out.join(" ");
}

function declaresName(node, name) {
  const declares =
    ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node);
  return Boolean(
    declares &&
    node.name &&
    ts.isIdentifier(node.name) &&
    node.name.text === name,
  );
}

/** 函数自身作用域是否绑定 name：参数、命名函数表达式的自有名、或函数体里（嵌套函数/类外）的声明。 */
function bindsOwn(fn, name) {
  if (fn.parameters?.some((p) => declaresName(p, name))) return true;
  if (ts.isFunctionExpression(fn) && fn.name?.text === name) return true;
  let found = false;
  const walk = (node) => {
    if (found) return;
    if (declaresName(node, name)) found = true;
    else if (!ts.isFunctionLike(node) && !ts.isClassLike(node))
      ts.forEachChild(node, walk);
  };
  if (fn.body) walk(fn.body);
  return found;
}

/**
 * 函数体 token 去掉其对自有名的引用（name(...)、this.name(...)）——除非自身作用域重绑定了该名。
 * 这样递归函数连同自调用一起改名仍是同一份代码；嵌套函数若绑定同名则保留自己的读取。
 */
function bodyWithoutSelf(tokens, node, sf, name) {
  if (!node.body) return "";
  const cuts = new Set();
  if (!name || bindsOwn(node, name))
    return tokenText(tokens, node.body, sf, cuts);
  const visit = (n) => {
    if (n !== node.body && ts.isFunctionLike(n) && bindsOwn(n, name)) return;
    if (ts.isIdentifier(n) && n.text === name) {
      const parent = n.parent;
      const member =
        parent && ts.isPropertyAccessExpression(parent) && parent.name === n;
      const key =
        parent &&
        (ts.isPropertyAssignment(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isPropertyDeclaration(parent)) &&
        parent.name === n;
      if (
        (!member && !key) ||
        (member && parent.expression.kind === K.ThisKeyword)
      ) {
        cuts.add(n.getStart(sf));
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(node.body);
  return tokenText(tokens, node.body, sf, cuts);
}

/** 对象字面量绑定名（const a = {...}、a: {...}），使其方法为 a.f 而不是按位置配对的 f#2。 */
function objectName(node) {
  let current = node.parent;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isTypeAssertionExpression(current))
  ) {
    current = current.parent;
  }
  if (
    current &&
    (ts.isVariableDeclaration(current) ||
      ts.isPropertyAssignment(current) ||
      ts.isPropertyDeclaration(current))
  ) {
    return propertyName(current.name);
  }
  return null;
}

function parseError(sf) {
  const diag = sf.parseDiagnostics?.[0];
  if (!diag) return null;
  const line = sf.getLineAndCharacterOfPosition(diag.start ?? 0).line + 1;
  return `does not parse: ${ts.flattenDiagnosticMessageText(diag.messageText, " ")} (line ${line})`;
}

/** 携带 health: allow 指令的注释 trivia（不含字符串/模板文本），返回 [行号, 文本]。 */
function allowComments(sf, text) {
  const found = new Map();
  const collect = (ranges) => {
    for (const range of ranges ?? []) {
      const body = text.slice(range.pos, range.end);
      if (body.includes("health:")) {
        found.set(range.pos, [
          sf.getLineAndCharacterOfPosition(range.pos).line + 1,
          body,
        ]);
      }
    }
  };
  const visit = (node) => {
    collect(ts.getLeadingCommentRanges(text, node.pos));
    collect(ts.getTrailingCommentRanges(text, node.end));
    ts.forEachChild(node, visit);
  };
  visit(sf);
  collect(ts.getLeadingCommentRanges(text, sf.endOfFileToken.pos));
  return [...found.values()];
}

/** 源码行去掉注释与多余空白后的归一化文本：违规的身份，改注释不产生新违规。 */
function codeLine(lines, comments, lineNo) {
  const raw = lines[lineNo - 1] ?? "";
  const comment = comments.get(lineNo);
  const stripped =
    comment && raw.includes(comment)
      ? raw.slice(0, raw.lastIndexOf(comment))
      : raw;
  return stripped.split(/\s+/).join(" ").trim();
}

/** 模式规则命中收集：返回 [{ rule, line, text }]，text 为归一化代码行。 */
function patternHits(sf, relPath, lines, comments) {
  const hits = [];
  const push = (ruleId, node) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    hits.push({ rule: ruleId, line, text: codeLine(lines, comments, line) });
  };
  const visit = (node) => {
    if (node.kind === K.CatchClause && node.block.statements.length === 0)
      push("EMPTY_CATCH", node);
    if (ts.isAsExpression(node) && node.type.kind === K.AnyKeyword)
      push("AS_ANY", node);
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "console" &&
      node.expression.name.text === "log"
    ) {
      push("CONSOLE_LOG", node);
    }
    ts.forEachChild(node, visit);
  };
  const active = PATTERN_RULES.filter(
    (rule) => !rule.srcOnly || relPath.startsWith("src/"),
  );
  visit(sf);
  return hits.filter((hit) => active.some((rule) => rule.id === hit.rule));
}

/**
 * 度量一个文件。返回 { units, hits, lines, comments, error }：
 * units 为 [{ qualname, line, endLine, cc, funcLines, nesting, hash }]；
 * hits 为 [{ rule, line, scope, text }]；解析失败时 error 非空（度量缺口，按失败处理）。
 */
export function measureText(relPath, text) {
  const kind = relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(
    relPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const error = parseError(sf);
  // 以结尾换行收尾的文件不把末尾空串算作一行，保证行数与编辑器统计一致。
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const comments = new Map(allowComments(sf, text));
  if (error) return { units: [], hits: [], lines, comments, error };
  const tokens = fileTokens(sf);
  const units = [];
  const seen = new Map();
  const unique = (qual) => {
    const n = (seen.get(qual) ?? 0) + 1;
    seen.set(qual, n);
    return n === 1 ? qual : `${qual}#${n}`;
  };
  // 行归属：每行归最内层覆盖它的函数，兄弟函数共享一行时只计一次。
  const owner = new Map();
  const walk = (node, stack) => {
    let next = stack;
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      next = [...stack, propertyName(node.name) ?? "<class>"];
    } else if (ts.isObjectLiteralExpression(node)) {
      const name = objectName(node);
      if (name) next = [...stack, name];
    } else if (FUNCTION_KINDS.has(node.kind) && node.body) {
      const qual = unique([...stack, ownName(node) ?? "<anon>"].join("."));
      const start =
        sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      // 与名无关：参数 + 函数体，改名或移动都保留上限。
      const params = node.parameters
        .map((p) => tokenText(tokens, p, sf, new Set()))
        .join(" , ");
      const selfName = propertyName(node.name) ?? bindingName(node);
      const body = `${params} => ${bodyWithoutSelf(tokens, node, sf, selfName)}`;
      const unit = {
        qualname: qual,
        line: start,
        endLine: end,
        cc: complexity(node),
        funcLines: end - start + 1,
        nesting: nesting(node),
        hash: createHash("sha1").update(body).digest("hex").slice(0, 16),
      };
      for (let line = start; line <= end; line += 1) owner.set(line, unit);
      units.push(unit);
      next = [...stack, qual.split(".").pop()];
    }
    ts.forEachChild(node, (child) => walk(child, next));
  };
  walk(sf, []);
  for (const unit of units) unit.funcLines = 0;
  for (const unit of owner.values()) unit.funcLines += 1;
  const scopeOf = (line) => owner.get(line)?.qualname ?? MODULE_SCOPE;
  const hits = patternHits(sf, relPath, lines, comments).map((hit) => ({
    rule: hit.rule,
    line: hit.line,
    scope: scopeOf(hit.line),
    text: hit.text,
  }));
  return { units, hits, lines, comments, error: null };
}

/** 行内豁免：返回 Map<规则ID, 理由[]>，从真实注释中解析。 */
export function parseAllows(comments) {
  const allows = new Map();
  for (const [line, body] of comments) {
    const match = ALLOW_RE.exec(body);
    if (match) {
      const list = allows.get(match[1]) ?? [];
      list.push({ line, reason: match[2]?.trim() ?? "" });
      allows.set(match[1], list);
    }
  }
  return allows;
}
