export interface TomlLine {
  code: string;
  statementStart: boolean;
  complete: boolean;
}
/** Lexical boundaries only; unsupported structures fail before any rewrite. */
export function scanTomlLines(lines: string[]): TomlLine[] {
  let quote = "", multiline = false;
  const brackets: string[] = [], result: TomlLine[] = [];
  for (const line of lines) {
    const statementStart = !quote && brackets.length === 0;
    let code = line;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (quote) {
        if (quote === '"' && char === "\\") {
          if (i + 1 === line.length && !multiline) throw new Error("config.toml 字符串未闭合，请修复原文件后重试。");
          i++;
          continue;
        }
        if (char !== quote) continue;
        if (!multiline) { quote = ""; continue; }
        let count = 1;
        while (line[i + count] === quote) count++;
        if (count > 5) throw new Error("config.toml 三引号边界无效，请修复原文件后重试。");
        if (count >= 3) { quote = ""; multiline = false; }
        i += count - 1;
        continue;
      }
      if (char === "#") { code = line.slice(0, i); break; }
      if (char === '"' || char === "'") {
        quote = char;
        multiline = line.slice(i, i + 3) === char.repeat(3);
        if (multiline) i += 2;
      } else if (char === "[" || char === "{") brackets.push(char);
      else if (char === "]" || char === "}") {
        if (brackets.pop() !== (char === "]" ? "[" : "{")) throw new Error("config.toml 括号不匹配，请修复原文件后重试。");
      }
    }
    if (quote && !multiline) throw new Error("config.toml 字符串未闭合，请修复原文件后重试。");
    result.push({ code: code.trimEnd(), statementStart, complete: !quote && brackets.length === 0 });
  }
  if (quote || brackets.length) throw new Error("config.toml 字符串或数组未闭合，请修复原文件后重试。");
  return result;
}

/** Root strings are replaced only after their entire single-line value is understood. */
export function isSingleLineTomlString(value: string): boolean {
  const controls = /[\u0000-\u0008\u000a-\u001f\u007f]/;
  if (controls.test(value)) return false;
  if (value.startsWith("'"))
    return value.length >= 2 && value.endsWith("'") && !value.slice(1, -1).includes("'");
  if (!value.startsWith('"')) return false;
  for (let i = 1; i < value.length; i++) {
    if (value[i] === '"') return i === value.length - 1;
    if (value[i] !== "\\") continue;
    const escape = value[++i];
    if (escape && 'btnfr"\\'.includes(escape)) continue;
    if (escape !== "u" && escape !== "U") return false;
    const count = escape === "u" ? 4 : 8, digits = value.slice(i + 1, i + 1 + count);
    if (digits.length !== count || !/^[0-9a-fA-F]+$/.test(digits)) return false;
    const point = Number.parseInt(digits, 16);
    if (point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return false;
    i += count;
  }
  return false;
}
/** Normalize only dotted keys whose entire table header has a known valid shape. */
export function normalizeTomlHeader(code: string): string {
  const array = code.startsWith("[["), width = array ? 2 : 1;
  const invalid = () => new Error("config.toml 表头格式无效或暂不支持，请修复普通表名后重试；原文件保留。");
  if (!code.endsWith(array ? "]]" : "]")) throw invalid();
  const inner = code.slice(width, -width), keys: string[] = [];
  const token = /\s*("[^"\\]*"|'[^']*'|[A-Za-z0-9_-]+)\s*/y;
  let cursor = 0;
  while (cursor < inner.length) {
    token.lastIndex = cursor;
    const match = token.exec(inner);
    if (!match) throw invalid();
    const key = match[1], quoted = key.startsWith('"') || key.startsWith("'");
    if (quoted && !isSingleLineTomlString(key)) throw invalid();
    keys.push(quoted ? key.slice(1, -1) : key);
    cursor = token.lastIndex;
    if (cursor === inner.length) break;
    if (inner[cursor++] !== "." || cursor === inner.length) throw invalid();
  }
  if (!keys.length) throw invalid();
  return keys.every((key) => /^[A-Za-z0-9_-]+$/.test(key))
    ? "[".repeat(width) + keys.join(".") + "]".repeat(width) : code;
}
