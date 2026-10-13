/**
 * 代码健康棘轮配置：指标目标、模式规则、度量范围与总开关的唯一来源。
 *
 * 移植自 NousResearch/hermes-agent 的 scripts/code_health（MIT License，见文件末引用）。
 * 语义：每个函数/文件有自己的上限——已超标的单元取其在 base 修订上的实测值为上限，只许变小；
 * 新单元必须达标。ENFORCEMENT 总开关从 origin/main 读取，分支不能自我放宽。
 */

/** 每单元指标目标。圈复杂度为经典 McCabe（与 ruff C901 同口径，非 ESLint complexity）。 */
export const TARGETS = {
  CC: 20,
  FUNC_LINES: 300,
  NESTING: 6,
  FILE_LINES: 2000,
};

/** 度量范围：include 为 glob，exclude 优先。度量缺口（解析失败）是失败，不是"无发现"。 */
export const SCOPE = {
  include: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "tests/**/*.ts",
    "tests/**/*.tsx",
    "tests/**/*.mjs",
    "scripts/**/*.mjs",
    "scripts/**/*.ts",
    "*.config.ts",
    "*.config.mjs",
  ],
  exclude: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.tmp/**",
    "**/tmp/**",
    "**/test-results/**",
    "**/vendor/**",
    "**/releases/**",
    "**/*.d.ts",
    "**/*.gen.ts",
  ],
};

/**
 * 模式规则：与 hermes 的 pattern 规则同构——按指纹（规则 + 作用域 + 归一化代码文本）比较，
 * 修复一个再新增一个仍然算新违规。scope 为 MODULE_SCOPE 或所属函数限定名。
 * srcOnly 规则只在 src/ 下生效（脚本与测试允许 console 输出）。
 */
export const PATTERN_RULES = [
  {
    id: "EMPTY_CATCH",
    title: "空 catch 吞掉错误",
    fix: "记录 logger.warning/error（含 exc_info 等价堆栈）或重新抛出；确需忽略时在行内写 health: allow EMPTY_CATCH -- 理由",
    srcOnly: false,
  },
  {
    id: "AS_ANY",
    title: "as any 绕过类型检查",
    fix: "改为具体类型、unknown 加窄化或 zod 校验；确需逃逸时写 health: allow AS_ANY -- 理由",
    srcOnly: false,
  },
  {
    id: "CONSOLE_LOG",
    title: "src/ 中的 console.log 遗留",
    fix: "改用项目日志通道或删除；脚本/测试目录不受此规则约束",
    srcOnly: true,
  },
];

/** 行内豁免指令，必须写在真实注释里（字符串字面量中的同文本不豁免）。 */
export const ALLOW_RE = /health:\s*allow\s+([A-Z][A-Z0-9_]+)(?:\s*--\s*(.*))?/;

export const MODULE_SCOPE = "<module>";

/**
 * 代码健康棘轮总开关：blocking（发现即失败）/ advisory（只打印）/ off（跳过）。
 * 从 origin/main 的版本读取，分支上的修改不生效；缺失或无法解析时按 blocking 失败关闭。
 */
export const ENFORCEMENT = "advisory";

/**
 * Windows 不安全模式扫描总开关，语义同 ENFORCEMENT。
 */
export const FOOTGUNS_ENFORCEMENT = "advisory";

/**
 * 参考实现（MIT License, Copyright (c) Nous Research）：
 * https://github.com/NousResearch/hermes-agent/tree/main/scripts/code_health
 * 本文件为其 ratchet 语义的 TypeScript/JavaScript 移植，并按本项目目录结构裁剪。
 */
