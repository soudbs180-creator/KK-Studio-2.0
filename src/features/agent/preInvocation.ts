import type {
  PreInvocationHook,
  PreInvocationDecision,
  PreInvocationContext,
} from "../../domain/agentWorkflow.ts";

/**
 * PreInvocation Security Hook Engine.
 * Intercepts tool calls before invocation to enforce security invariants.
 */
export class SecurityHookEngine {
  readonly #hooks: PreInvocationHook[] = [];

  addHook(hook: PreInvocationHook): void {
    this.#hooks.push(hook);
  }

  evaluate(
    tool: string,
    args: Record<string, unknown>,
    context?: PreInvocationContext,
  ): PreInvocationDecision {
    for (const hook of this.#hooks) {
      const decision = hook(tool, args, context);
      if (!decision.allow) {
        return {
          allow: false,
          reason: decision.reason ?? "Execution rejected by security hook",
        };
      }
    }
    return { allow: true };
  }
}

export interface WorkspaceGuardOptions {
  workspaceRoot: string;
  allowedExtraRoots?: readonly string[];
}

const SENSITIVE_PATH_PATTERNS = [
  /\/\.ssh\b/i,
  /\/etc\/passwd\b/i,
  /\/etc\/shadow\b/i,
  /\/var\/run\b/i,
  /\/\.kube\b/i,
  /\/\.docker\b/i,
  /\/\.aws\b/i,
  /\/\.gitconfig\b/i,
  /\\\.ssh\b/i,
  /\\\.aws\b/i,
  /\\\.kube\b/i,
  /\\Windows\\System32/i,
  /%SYSTEMROOT%/i,
  /%APPDATA%/i,
];

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();
}

function extractStringValues(obj: unknown, depth = 0): string[] {
  if (depth > 5 || obj === null || obj === undefined) return [];
  if (typeof obj === "string") return [obj];
  if (Array.isArray(obj)) {
    return obj.flatMap((item) => extractStringValues(item, depth + 1));
  }
  if (typeof obj === "object") {
    return Object.values(obj as Record<string, unknown>).flatMap((v) =>
      extractStringValues(v, depth + 1),
    );
  }
  return [];
}

/**
 * Creates a security hook to prevent directory traversal escapes and sensitive OS file access.
 */
export function createWorkspaceEscapeGuard(
  options: WorkspaceGuardOptions,
): PreInvocationHook {
  const normRoot = normalizePath(options.workspaceRoot).replace(/\/$/, "");
  const extraRoots = (options.allowedExtraRoots ?? []).map((r) =>
    normalizePath(r).replace(/\/$/, ""),
  );

  return (
    _tool: string,
    args: Record<string, unknown>,
  ): PreInvocationDecision => {
    const candidateStrings = extractStringValues(args);

    for (const raw of candidateStrings) {
      for (const pattern of SENSITIVE_PATH_PATTERNS) {
        if (pattern.test(raw)) {
          return {
            allow: false,
            reason: `Access to sensitive system path blocked: "${raw}"`,
          };
        }
      }

      // Check for path traversal markers
      let decoded: string;
      try {
        decoded = decodeURIComponent(raw);
      } catch {
        decoded = raw;
      }
      const rawLower = raw.toLowerCase();
      const decodedLower = decoded.toLowerCase();

      if (
        raw.includes("..") ||
        decodedLower.includes("..") ||
        rawLower.includes("%2e%2e") ||
        raw.includes("\0") ||
        rawLower.includes("%00") ||
        decodedLower.includes("\0")
      ) {
        return {
          allow: false,
          reason: `Path traversal sequence detected: "${raw}"`,
        };
      }

      // If it looks like an absolute path (starts with / or [A-Za-z]:/)
      const norm = normalizePath(raw);
      const isAbsolute = /^[a-z]:\//.test(norm) || norm.startsWith("/");
      if (isAbsolute) {
        const inWorkspace =
          norm === normRoot || norm.startsWith(normRoot + "/");
        const inExtra = extraRoots.some(
          (root) => norm === root || norm.startsWith(root + "/"),
        );
        if (!inWorkspace && !inExtra) {
          return {
            allow: false,
            reason: `Path escapes workspace root boundaries: "${raw}"`,
          };
        }
      }
    }

    return { allow: true };
  };
}

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Bearer Token / JWT", pattern: /\bBearer\s+[A-Za-z0-9_\-.]{20,}\b/i },
  {
    name: "AWS Secret Access Key",
    pattern:
      /(?:AWS_SECRET|aws_secret_access_key)[\s:=]+['"]?([A-Za-z0-9/+=]{40})['"]?/i,
  },
  { name: "AWS Access Key ID", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "API Key",
    pattern: /\b(?:sk-[a-zA-Z0-9_-]{20,}|sk-ant-[a-zA-Z0-9_-]{32,})\b/,
  },
  {
    name: "GitHub Token",
    pattern:
      /\b(?:gh[pousr]_[a-zA-Z0-9_]{36,255}|github_pat_[a-zA-Z0-9_]{22,255})\b/,
  },
  {
    name: "Private Key / Certificate",
    pattern: /-----BEGIN\s+[A-Z0-9_\s]*(?:KEY|CERTIFICATE)-----/i,
  },
  {
    name: "Generic Secret Keyword",
    pattern: /\b(?:AWS_SECRET|PRIVATE_KEY|CLIENT_SECRET)\b/i,
  },
];

/**
 * Creates a security hook to prevent leaking credentials and API keys in tool payloads.
 */
export function createSecretLeakGuard(): PreInvocationHook {
  return (
    _tool: string,
    args: Record<string, unknown>,
  ): PreInvocationDecision => {
    let serialized: string;
    try {
      serialized = JSON.stringify(args);
    } catch {
      serialized = String(args);
    }

    for (const { name, pattern } of SECRET_PATTERNS) {
      if (pattern.test(serialized)) {
        return {
          allow: false,
          reason: `Potential credential leakage detected: ${name}`,
        };
      }
    }

    return { allow: true };
  };
}

const DESTRUCTIVE_COMMAND_PATTERNS: Array<{ pattern: RegExp; reason: string }> =
  [
    {
      pattern:
        /\brm\s+(?:-[a-zA-Z0-9-]+\s+)*(?:-[a-zA-Z]*(?:rf|fr)[a-zA-Z]*|-[a-zA-Z]*r[a-zA-Z]*(?:\s+-[a-zA-Z0-9-]+)*\s+-[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*(?:\s+-[a-zA-Z0-9-]+)*\s+-[a-zA-Z]*r[a-zA-Z]*)(?:\s+-[a-zA-Z0-9-]+)*\s+[/~*]/i,
      reason: "Destructive root/wildcard file deletion prohibited (rm -rf)",
    },
    {
      pattern:
        /\brmdir\s+(?:\/[a-zA-Z]+\s+)*(?:\/s|\/q)\s+(?:\/[a-zA-Z]+\s+)*(?:\/s|\/q)(?:\s+\/[a-zA-Z]+)*\s+[c-zC-Z]:\\?/i,
      reason: "Destructive drive deletion prohibited (rmdir /s /q)",
    },
    {
      pattern: /\bdel\s+(?:\/[a-zA-Z]+\s+)+[c-zC-Z]:\\?/i,
      reason: "Destructive drive deletion prohibited (del /f /s /q)",
    },
    {
      pattern:
        /\bRemove-Item\b.*?(?:-Recurse\b.*?-Force\b|-Force\b.*?-Recurse\b)/i,
      reason: "Destructive PowerShell wipe prohibited",
    },
    {
      pattern: /\bmkfs(?:\.[a-z0-9]+)?\s+/i,
      reason: "Filesystem formatting prohibited",
    },
    { pattern: /\bformat\s+[a-zA-Z]:/i, reason: "Drive formatting prohibited" },
    {
      pattern: /\bdd\s+if=.*of=\/dev\/(?:sd[a-z]|nvme|hd[a-z]|disk)/i,
      reason: "Raw block device overwriting prohibited",
    },
    {
      pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
      reason: "Fork bomb prohibited",
    },
    { pattern: /%0\s*\|\s*%0/, reason: "Batch fork bomb prohibited" },
    {
      pattern: /\b(?:shutdown|reboot|init\s+0|poweroff)\b/i,
      reason: "System shutdown/reboot prohibited",
    },
  ];

/**
 * Creates a security hook to intercept destructive terminal commands.
 */
export function createDestructiveCommandGuard(): PreInvocationHook {
  return (
    tool: string,
    args: Record<string, unknown>,
  ): PreInvocationDecision => {
    const isCommandTool = [
      "system_exec",
      "terminal_exec",
      "run_command",
      "bash",
      "powershell",
      "cmd",
      "exec",
    ].includes(tool.toLowerCase());

    if (!isCommandTool) {
      return { allow: true };
    }

    const commandText =
      typeof args.cmd === "string"
        ? args.cmd
        : typeof args.command === "string"
          ? args.command
          : typeof args.script === "string"
            ? args.script
            : "";

    if (!commandText) return { allow: true };

    for (const { pattern, reason } of DESTRUCTIVE_COMMAND_PATTERNS) {
      if (pattern.test(commandText)) {
        return {
          allow: false,
          reason,
        };
      }
    }

    return { allow: true };
  };
}
