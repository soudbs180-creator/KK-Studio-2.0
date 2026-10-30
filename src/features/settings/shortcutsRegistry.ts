export type ShortcutScope = "global" | "canvas" | "composer";

export interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  scope: ShortcutScope;
  defaultKeys: string[];
  currentKeys: string[];
  allowInInput?: boolean;
  systemReserved?: boolean;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
  conflictingShortcut?: ShortcutDefinition;
}

export const SHORTCUTS_STORAGE_KEY = "kk:custom-shortcuts";

const MODIFIER_ORDER: Record<string, number> = {
  ctrl: 1,
  control: 1,
  alt: 2,
  option: 2,
  shift: 3,
  meta: 4,
  cmd: 4,
  command: 4,
};

const SYSTEM_RESERVED_COMBOS = new Set([
  "CTRL+C",
  "CTRL+V",
  "CTRL+X",
  "CTRL+A",
  "CTRL+Z",
  "CTRL+W",
  "CTRL+T",
  "CTRL+R",
  "CTRL+SHIFT+R",
  "CTRL+SHIFT+I",
  "CTRL+SHIFT+J",
  "ALT+F4",
  "CTRL+TAB",
  "CTRL+SHIFT+TAB",
  "F5",
  "F12",
  "META+C",
  "META+V",
  "META+X",
  "META+A",
  "META+Z",
  "META+W",
  "META+Q",
  "META+T",
  "META+R",
]);

export const DEFAULT_SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    id: "global.search",
    name: "全局搜索",
    description: "唤起全局资产与功能搜索框",
    scope: "global",
    defaultKeys: ["Ctrl", "K"],
    currentKeys: ["Ctrl", "K"],
  },
  {
    id: "global.newSession",
    name: "新建会话",
    description: "创建新的空白创作会话",
    scope: "global",
    defaultKeys: ["Ctrl", "N"],
    currentKeys: ["Ctrl", "N"],
  },
  {
    id: "global.openSettings",
    name: "打开设置",
    description: "快速打开系统设置面板",
    scope: "global",
    defaultKeys: ["Ctrl", ","],
    currentKeys: ["Ctrl", ","],
  },
  {
    id: "composer.submit",
    name: "提交生成 / 发送",
    description: "在输入框中提交当前任务",
    scope: "composer",
    defaultKeys: ["Ctrl", "Enter"],
    currentKeys: ["Ctrl", "Enter"],
    allowInInput: true,
  },
  {
    id: "canvas.undo",
    name: "撤销操作",
    description: "撤销画布上一步改动",
    scope: "canvas",
    defaultKeys: ["Ctrl", "Z"],
    currentKeys: ["Ctrl", "Z"],
  },
  {
    id: "canvas.redo",
    name: "重做操作",
    description: "恢复上一步撤销的改动",
    scope: "canvas",
    defaultKeys: ["Ctrl", "Shift", "Z"],
    currentKeys: ["Ctrl", "Shift", "Z"],
  },
  {
    id: "canvas.delete",
    name: "删除选中元素",
    description: "移除画布选中的节点元素",
    scope: "canvas",
    defaultKeys: ["Delete"],
    currentKeys: ["Delete"],
  },
  {
    id: "canvas.fitView",
    name: "适应画布",
    description: "重置画布缩放以适应屏幕",
    scope: "canvas",
    defaultKeys: ["Shift", "1"],
    currentKeys: ["Shift", "1"],
  },
];

const inMemoryStore: Map<string, string> = new Map();

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err) {
    console.debug("[shortcutsRegistry] storage get error", err);
  }
  return inMemoryStore.get(key) ?? null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    console.debug("[shortcutsRegistry] storage set error", err);
  }
  inMemoryStore.set(key, value);
}

function notifySubscribers(): void {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    try {
      window.dispatchEvent(new CustomEvent("kk:shortcuts-changed"));
    } catch (err) {
      console.debug("[shortcutsRegistry] notify error", err);
    }
  }
}

export function normalizeKey(key: string): string {
  const lower = key.trim().toLowerCase();
  if (lower === "ctrl" || lower === "control") return "Ctrl";
  if (lower === "alt" || lower === "option") return "Alt";
  if (lower === "shift") return "Shift";
  if (lower === "meta" || lower === "cmd" || lower === "command") return "Meta";
  if (lower === "esc" || lower === "escape") return "Escape";
  if (lower === "del" || lower === "delete") return "Delete";
  if (lower === "return" || lower === "enter") return "Enter";
  if (lower === "space" || lower === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function normalizeKeys(keys: readonly string[]): string[] {
  const filtered = keys.filter(
    (k) => typeof k === "string" && k.trim().length > 0,
  );
  const unique = Array.from(new Set(filtered.map(normalizeKey)));
  const modifiers: string[] = [];
  const primaryKeys: string[] = [];

  for (const k of unique) {
    const lower = k.toLowerCase();
    if (lower in MODIFIER_ORDER) {
      modifiers.push(k);
    } else {
      primaryKeys.push(k);
    }
  }

  modifiers.sort(
    (a, b) =>
      (MODIFIER_ORDER[a.toLowerCase()] ?? 99) -
      (MODIFIER_ORDER[b.toLowerCase()] ?? 99),
  );

  return [...modifiers, ...primaryKeys];
}

export function serializeKeyCombo(keys: readonly string[]): string {
  return normalizeKeys(keys).join("+").toUpperCase();
}

export function isModifierOnly(keys: readonly string[]): boolean {
  if (!keys || keys.length === 0) return true;
  return keys.every((k) => k.toLowerCase() in MODIFIER_ORDER);
}

export function checkConflict(
  candidate: readonly string[],
  scope: ShortcutScope,
  excludeId?: string,
): ConflictCheckResult {
  const normalized = normalizeKeys(candidate);
  if (normalized.length === 0) {
    return { hasConflict: true, reason: "按键组合不能为空" };
  }

  // Barrier 3: Modifier guards & bare keys
  if (isModifierOnly(normalized)) {
    return {
      hasConflict: true,
      reason: "必须包含至少一个实体主键（如字母、数字或功能键）",
    };
  }

  const hasModifier = normalized.some((k) => k.toLowerCase() in MODIFIER_ORDER);
  const isFunctionKey =
    normalized.length === 1 && /^F([1-9]|1[0-2])$/i.test(normalized[0]);
  const isAllowedSingleKey =
    normalized.length === 1 &&
    (isFunctionKey || normalized[0] === "Delete" || normalized[0] === "Escape");

  if (!hasModifier && !isAllowedSingleKey) {
    return {
      hasConflict: true,
      reason:
        "常规按键必须搭配修饰键（Ctrl、Alt、Shift）使用，单键仅支持功能键（F1-F12）",
    };
  }

  const comboString = serializeKeyCombo(normalized);

  // Barrier 1: System / Browser reserved keys
  // Exemption: canvas.undo is the legitimate owner of the application undo shortcut (Ctrl+Z / Meta+Z)
  const isUndoExempt =
    excludeId === "canvas.undo" &&
    (comboString === "CTRL+Z" || comboString === "META+Z");

  if (SYSTEM_RESERVED_COMBOS.has(comboString) && !isUndoExempt) {
    return {
      hasConflict: true,
      reason: "该组合键为系统/浏览器保留快捷键，无法使用",
    };
  }

  // Barrier 2: Intra-Scope or Global collision
  const allShortcuts = getShortcuts();
  for (const item of allShortcuts) {
    if (excludeId && item.id === excludeId) continue;

    const scopesOverlap =
      scope === "global" || item.scope === "global" || scope === item.scope;
    if (scopesOverlap) {
      const itemCombo = serializeKeyCombo(item.currentKeys);
      if (itemCombo === comboString) {
        return {
          hasConflict: true,
          reason: `与「${item.name}」快捷键冲突，请更换按键`,
          conflictingShortcut: item,
        };
      }
    }
  }

  return { hasConflict: false };
}

export function getShortcuts(): ShortcutDefinition[] {
  const raw = getStorageItem(SHORTCUTS_STORAGE_KEY);
  const overrides: Record<string, string[]> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.assign(overrides, parsed);
      }
    } catch (err) {
      console.debug("[shortcutsRegistry] parse overrides error", err);
    }
  }

  return DEFAULT_SHORTCUTS.map((item) => ({
    ...item,
    currentKeys: overrides[item.id]
      ? normalizeKeys(overrides[item.id])
      : [...item.defaultKeys],
  }));
}

export function getShortcut(id: string): ShortcutDefinition | undefined {
  return getShortcuts().find((item) => item.id === id);
}

export function updateShortcut(
  id: string,
  newKeys: readonly string[],
): { success: boolean; error?: string } {
  const shortcut = getShortcut(id);
  if (!shortcut) {
    return { success: false, error: "未找到指定的快捷键" };
  }

  const conflict = checkConflict(newKeys, shortcut.scope, id);
  if (conflict.hasConflict) {
    return { success: false, error: conflict.reason };
  }

  const raw = getStorageItem(SHORTCUTS_STORAGE_KEY);
  let overrides: Record<string, string[]> = {};
  if (raw) {
    try {
      overrides = JSON.parse(raw) ?? {};
    } catch (err) {
      console.debug("[shortcutsRegistry] read overrides error", err);
      overrides = {};
    }
  }

  overrides[id] = normalizeKeys(newKeys);
  setStorageItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(overrides));
  notifySubscribers();
  return { success: true };
}

export function resetShortcut(id: string): void {
  const raw = getStorageItem(SHORTCUTS_STORAGE_KEY);
  if (!raw) return;
  try {
    const overrides = JSON.parse(raw) ?? {};
    delete overrides[id];
    setStorageItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(overrides));
    notifySubscribers();
  } catch (err) {
    console.debug("[shortcutsRegistry] resetShortcut error", err);
  }
}

export function resetToDefaults(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    }
  } catch (err) {
    console.debug("[shortcutsRegistry] resetToDefaults error", err);
  }
  inMemoryStore.delete(SHORTCUTS_STORAGE_KEY);
  notifySubscribers();
}
