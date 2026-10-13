/**
 * Windows 不安全模式规则表（数据）。单独存放并排除出扫描范围：
 * 规则文本天然包含危险模式自身，混在扫描范围内会自匹配。
 * pattern 按行匹配；skip 抑制误报；globs 限定文件类型；fix 是修复指引，不是规则复述。
 */
export const RULES = [
  {
    id: "POSIX_TMP",
    title: "硬编码 POSIX 临时目录",
    globs: ["**/*.mjs", "**/*.ts", "**/*.tsx"],
    pattern: /["'`(\s]\/tmp\/|\/var\/tmp\//,
    fix: "用 node:os 的 os.tmpdir()，不要假设 /tmp 存在（Windows 没有）",
  },
  {
    id: "HARDCODED_USER_PATH",
    title: "硬编码用户目录",
    globs: ["**/*.mjs", "**/*.ts", "**/*.ps1"],
    pattern: /[A-Za-z]:\\Users\\|[A-Za-z]:\/Users\//i,
    fix: "用 %APPDATA%/%LOCALAPPDATA% 或进程环境解析；OneDrive 重定向路径用 SHGetKnownFolderPath 或注册表",
  },
  {
    id: "SHEBANG_NODE",
    title: "依赖 shebang 启动 node 脚本",
    globs: ["**/*.mjs"],
    pattern: /^#!.*\bnode\b/,
    fix: "Windows 不走 shebang；用 node script.mjs 调用，或提供 .cmd shim",
  },
  {
    id: "DESTRUCTIVE_DELETE",
    title: "无确认的递归/强制删除",
    globs: ["**/*.mjs", "**/*.ps1", "**/*.cmd", "**/*.bat"],
    pattern:
      /\brm\s+-[a-z]*[rf][a-z]*\s|\bdel\s+\/[fq]\b|\brd\s+\/s\b|Remove-Item\b[^\n]*-Recurse|-Recurse\s+-Force/i,
    fix: "删除前列出目标并要求确认；优先回收站语义，禁止对用户数据目录无确认递归删除",
  },
  {
    id: "CRLF_SCRIPT_WRITE",
    title: "生成 Windows 脚本未用 CRLF",
    globs: ["**/*.mjs", "**/*.ts"],
    pattern: /writeFileSync?\(|writeFile\(|appendFileSync?\(/,
    skip: /\\r\\n|newline\s*[:=]\s*["']\\r\\n["']|"\r\n"|'\r\n'/,
    fix: '生成 .ps1/.bat/.cmd 时显式 CRLF（newline: "\\r\\n" 或 join("\\r\\n")），否则 PowerShell 解析失败',
    needsScriptExt: true,
  },
  {
    id: "SCHTASKS_QUOTE",
    title: "schtasks /TR 引号转义",
    globs: ["**/*.ps1", "**/*.mjs", "**/*.cmd"],
    pattern: /schtasks[^\n]*\/TR\b/i,
    fix: "schtasks /TR 的嵌套双引号需要两套独立 helper 转义；改动前本地复现",
  },
  {
    id: "ONEDRIVE_KNOWN",
    title: "假设 Desktop/Documents 未被 OneDrive 重定向",
    globs: ["**/*.mjs", "**/*.ts", "**/*.ps1"],
    pattern: /OneDrive|["'\\/]Desktop["'\\/]|["'\\/]Documents["'\\/]/,
    fix: "已知文件夹路径必须经 SHGetKnownFolderPath/注册表/env 解析，不能假设本地磁盘位置",
  },
  {
    id: "SINGLE_BACKSLASH_PATH",
    title: "路径字面量使用单反斜杠",
    globs: ["**/*.mjs", "**/*.ts"],
    pattern: /["'][A-Za-z]:\\[^"'\n]*["']/,
    skip: /["'][A-Za-z]:\\[^"'\n]*(\\["'\\nrtbfv0xu`]|\\\\)[^"'\n]*["']/,
    fix: "反斜杠是转义符：用正斜杠、path.join 或双写反斜杠；单反斜杠路径在 Windows 上会静默错位",
  },
  {
    id: "CURL_PIPE_SHELL",
    title: "curl/irm 管道到 shell",
    globs: ["**/*.ps1", "**/*.cmd", "**/*.bat", "**/*.mjs", "**/*.yml"],
    pattern:
      /curl[^\n|]*\|\s*(ba|z|fi)?sh\b|\b(irm|iwr|Invoke-WebRequest|Invoke-RestMethod)\b[^\n|]*\|\s*iex\b/i,
    fix: "下载后校验（哈希/签名）再执行；不要把远程脚本直接管道进解释器",
  },
];
