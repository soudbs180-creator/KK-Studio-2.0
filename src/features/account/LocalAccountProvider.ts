import type { AccountProvider } from "./AccountProvider.ts";
import type {
  AccountProfile,
  AccountProfilePatch,
  AccountSession,
  LocalUsageBudget,
} from "./accountTypes.ts";

export const LOCAL_ACCOUNT_STORAGE_KEY = "kk:local-account-profile";
export const LOCAL_BUDGET_STORAGE_KEY = "kk:local-account-budget";
export const LOCAL_ACCOUNT_CHANGED_EVENT = "kk:local-account-changed";

const inMemory = new Map<string, string>();

function browserStorage(): Storage | null {
  try {
    const candidate = (globalThis as { localStorage?: Storage }).localStorage;
    if (candidate && typeof candidate.getItem === "function") return candidate;
  } catch {
    // health: allow EMPTY_CATCH -- sandboxed storage falls back to memory
  }
  return null;
}

function readItem(key: string): string | null {
  try {
    const stored = browserStorage()?.getItem(key);
    if (stored != null) return stored;
  } catch {
    // health: allow EMPTY_CATCH -- sandboxed storage falls back to memory
  }
  return inMemory.get(key) ?? null;
}

function writeItem(key: string, value: string): void {
  try {
    browserStorage()?.setItem(key, value);
  } catch {
    // health: allow EMPTY_CATCH -- sandboxed storage falls back to memory
  }
  inMemory.set(key, value);
}

function notifyChanged(): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  )
    return;
  try {
    window.dispatchEvent(new CustomEvent(LOCAL_ACCOUNT_CHANGED_EVENT));
  } catch {
    // health: allow EMPTY_CATCH -- notify is best-effort
  }
}

export function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "本";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase() || "本";
  }
  const chars = Array.from(trimmed);
  if (chars.length >= 2 && /[A-Za-z]/.test(chars[0] ?? ""))
    return (chars[0]! + chars[1]!).toUpperCase();
  return (chars[0] ?? "本").toUpperCase();
}

export function detectOsUsername(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
): string | null {
  for (const key of ["USERNAME", "USER", "LOGNAME"]) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function newLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return `local-${crypto.randomUUID()}`;
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultProfile(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
): AccountProfile {
  const now = Date.now();
  const displayName = detectOsUsername(env) ?? "本地创作者";
  return {
    id: newLocalId(),
    displayName,
    avatarInitials: initialsFromName(displayName),
    bio: "",
    kind: "local",
    createdAt: now,
    updatedAt: now,
  };
}

function parseProfile(raw: string | null): AccountProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AccountProfile>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.id !== "string" ||
      typeof parsed.displayName !== "string"
    )
      return null;
    return {
      id: parsed.id,
      displayName: parsed.displayName.trim() || "本地创作者",
      avatarInitials:
        typeof parsed.avatarInitials === "string" && parsed.avatarInitials
          ? parsed.avatarInitials
          : initialsFromName(parsed.displayName),
      bio: typeof parsed.bio === "string" ? parsed.bio : "",
      kind: "local",
      createdAt:
        typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
      updatedAt:
        typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function parseBudget(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { tokenBudget?: unknown };
    if (parsed.tokenBudget === null) return null;
    if (
      typeof parsed.tokenBudget === "number" &&
      Number.isFinite(parsed.tokenBudget) &&
      parsed.tokenBudget >= 0
    )
      return Math.floor(parsed.tokenBudget);
  } catch {
    // ignore corrupt budget
  }
  return null;
}

export type LocalAccountDeps = {
  readTokensUsed?: () => number;
  env?: Record<string, string | undefined>;
};

export class LocalAccountProvider implements AccountProvider {
  private readonly readTokensUsed: () => number;
  private readonly env: Record<string, string | undefined>;

  constructor(deps: LocalAccountDeps = {}) {
    this.readTokensUsed = deps.readTokensUsed ?? (() => 0);
    this.env =
      deps.env ??
      (typeof process !== "undefined" ? process.env : {});
  }

  kind(): "local" {
    return "local";
  }

  authLabel(): string {
    return "本地登录";
  }

  getSession(): AccountSession {
    return {
      profile: this.getProfile(),
      signedIn: true,
      authLabel: this.authLabel(),
    };
  }

  getProfile(): AccountProfile {
    const existing = parseProfile(readItem(LOCAL_ACCOUNT_STORAGE_KEY));
    if (existing) return existing;
    const created = defaultProfile(this.env);
    writeItem(LOCAL_ACCOUNT_STORAGE_KEY, JSON.stringify(created));
    notifyChanged();
    return created;
  }

  updateProfile(patch: AccountProfilePatch): AccountProfile {
    const current = this.getProfile();
    const displayName =
      patch.displayName !== undefined
        ? patch.displayName.trim() || current.displayName
        : current.displayName;
    const next: AccountProfile = {
      ...current,
      displayName,
      bio:
        patch.bio !== undefined
          ? patch.bio.trim().slice(0, 280)
          : current.bio,
      avatarInitials:
        patch.avatarInitials !== undefined
          ? patch.avatarInitials.trim().slice(0, 2) ||
            initialsFromName(displayName)
          : patch.displayName !== undefined
            ? initialsFromName(displayName)
            : current.avatarInitials,
      kind: "local",
      updatedAt: Date.now(),
    };
    writeItem(LOCAL_ACCOUNT_STORAGE_KEY, JSON.stringify(next));
    notifyChanged();
    return next;
  }

  getUsageBudget(): LocalUsageBudget {
    const tokenBudget = parseBudget(readItem(LOCAL_BUDGET_STORAGE_KEY));
    const tokensUsed = Math.max(0, Math.floor(this.readTokensUsed()));
    return {
      mode: "local",
      tokensUsed,
      tokenBudget,
      budgetLabel:
        tokenBudget === null
          ? "本机无硬性额度（可自设预算提示）"
          : `本机预算 ${tokenBudget.toLocaleString()} Token`,
      note: "当前为本地模式：用量只记在本机，不扣平台积分、不上云计费。",
    };
  }

  setTokenBudget(budget: number | null): LocalUsageBudget {
    const tokenBudget =
      budget === null
        ? null
        : Number.isFinite(budget) && budget >= 0
          ? Math.floor(budget)
          : null;
    writeItem(
      LOCAL_BUDGET_STORAGE_KEY,
      JSON.stringify({ tokenBudget, updatedAt: Date.now() }),
    );
    notifyChanged();
    return this.getUsageBudget();
  }
}

let shared: LocalAccountProvider | null = null;

export function getLocalAccountProvider(
  deps?: LocalAccountDeps,
): LocalAccountProvider {
  if (deps) return new LocalAccountProvider(deps);
  if (!shared) shared = new LocalAccountProvider();
  return shared;
}

/** Test helper: clear in-memory fallback + singleton. */
export function resetLocalAccountStateForTests(): void {
  inMemory.clear();
  shared = null;
}
