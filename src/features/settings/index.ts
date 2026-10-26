// Public contract entry for feature: settings
export { SHORTCUTS_STORAGE_KEY, DEFAULT_SHORTCUTS, normalizeKey, normalizeKeys, serializeKeyCombo, isModifierOnly, checkConflict, getShortcuts, getShortcut, updateShortcut, resetShortcut, resetToDefaults } from "./shortcutsRegistry.ts";
export type { ShortcutScope, ShortcutDefinition, ConflictCheckResult } from "./shortcutsRegistry.ts";
