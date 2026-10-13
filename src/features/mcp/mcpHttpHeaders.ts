type HeaderPrimitive = "string" | "integer" | "boolean";

interface HeaderDeclaration {
  path: string[];
  name: string;
  type: HeaderPrimitive;
}

type HeaderSchema =
  | { valid: true; declarations: HeaderDeclaration[] }
  | { valid: false; declarations: [] };

const HTTP_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const MAX_SCHEMA_DEPTH = 64;
const MAX_SCHEMA_NODES = 4096;
const HEADER_TYPES = new Set(["string", "integer", "boolean"]);
const NON_PROPERTY_SCHEMAS = new Set([
  "items",
  "prefixItems",
  "contains",
  "additionalProperties",
  "unevaluatedProperties",
  "unevaluatedItems",
  "propertyNames",
  "patternProperties",
  "dependentSchemas",
  "dependencies",
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "if",
  "then",
  "else",
  "$defs",
  "definitions",
]);
const SCHEMA_MAPS = new Set([
  "patternProperties",
  "dependentSchemas",
  "dependencies",
  "$defs",
  "definitions",
]);

/** SEP-2243 uses a header-name string, not a boolean schema marker. */
export function scanMcpHeaderSchema(inputSchema: unknown): HeaderSchema {
  const declarations: HeaderDeclaration[] = [];
  const names = new Set<string>();
  const visited = new WeakSet<object>();
  let queuedNodes = 1;
  const pending = [
    { node: inputSchema, path: [] as string[], reachable: true, depth: 0 },
  ];
  while (pending.length) {
    const { node, path, reachable, depth } = pending.pop()!;
    if (!node || typeof node !== "object") continue;
    // Wire schemas are JSON trees; cycles cannot be a valid received schema.
    if (visited.has(node)) return { valid: false, declarations: [] };
    visited.add(node);
    const schema = node as Record<string, unknown>;
    if (Object.hasOwn(schema, "x-mcp-header")) {
      const declaration = readDeclaration(schema, path, reachable);
      if (!declaration || names.has(declaration.name.toLowerCase()))
        return { valid: false, declarations: [] };
      names.add(declaration.name.toLowerCase());
      declarations.push(declaration);
    }
    const properties = schema.properties;
    if (properties && typeof properties === "object") {
      for (const [key, child] of Object.entries(properties)) {
        // Bound untrusted work before copying a path or growing the queue.
        if (depth >= MAX_SCHEMA_DEPTH || ++queuedNodes > MAX_SCHEMA_NODES)
          return { valid: false, declarations: [] };
        pending.push({
          node: child,
          path: [...path, key],
          reachable: reachable && !Array.isArray(properties),
          depth: depth + 1,
        });
      }
    }
    for (const keyword of NON_PROPERTY_SCHEMAS) {
      for (const child of schemaChildren(keyword, schema[keyword])) {
        if (depth >= MAX_SCHEMA_DEPTH || ++queuedNodes > MAX_SCHEMA_NODES)
          return { valid: false, declarations: [] };
        pending.push({ node: child, path, reachable: false, depth: depth + 1 });
      }
    }
  }
  return { valid: true, declarations };
}

function readDeclaration(
  schema: Record<string, unknown>,
  path: string[],
  reachable: boolean,
): HeaderDeclaration | undefined {
  const name = schema["x-mcp-header"];
  const type = schema.type;
  if (
    !reachable ||
    !path.length ||
    typeof name !== "string" ||
    !HTTP_TOKEN.test(name) ||
    typeof type !== "string" ||
    !HEADER_TYPES.has(type)
  )
    return undefined;
  return { path, name, type: type as HeaderPrimitive };
}

function schemaChildren(keyword: string, value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value;
  return SCHEMA_MAPS.has(keyword) ? Object.values(value) : [value];
}

/** Preserve values exactly through HTTP field parsing, including Unicode. */
export function encodeMcpHeaderValue(value: string): string {
  const plain =
    value.length > 0 &&
    value === value.trim() &&
    !(value.startsWith("=?base64?") && value.endsWith("?=")) &&
    [...value].every((character) => {
      const code = character.codePointAt(0)!;
      return code === 9 || (code >= 32 && code <= 126);
    });
  if (plain) return value;
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `=?base64?${btoa(binary)}?=`;
}

export function mcpToolParameterHeaders(
  inputSchema: unknown,
  arguments_: Record<string, unknown>,
): Record<string, string> {
  const schema = scanMcpHeaderSchema(inputSchema);
  if (!schema.valid) throw new Error("MCP 工具的 HTTP 参数声明无效。");
  const headers: Record<string, string> = {};
  for (const declaration of schema.declarations) {
    const value = ownValueAtPath(arguments_, declaration.path);
    if (value === undefined || value === null) continue;
    if (!isDeclaredPrimitive(value, declaration.type))
      throw new Error(
        `MCP 工具参数 ${declaration.path.join(".")} 类型无效或整数超过安全范围。`,
      );
    // The fixed prefix prevents declarations from setting standard/auth headers.
    headers[`Mcp-Param-${declaration.name}`] = encodeMcpHeaderValue(
      String(value),
    );
  }
  return headers;
}

function ownValueAtPath(root: unknown, path: string[]): unknown {
  let value = root;
  for (const key of path) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
      return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function isDeclaredPrimitive(value: unknown, type: HeaderPrimitive): boolean {
  if (type === "integer")
    return typeof value === "number" && Number.isSafeInteger(value);
  return typeof value === type;
}
