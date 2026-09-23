import { z } from "zod";
import { BROWSER_STORAGE_KEYS } from "../runtime/storage-contract.ts";

export const SETTINGS_STORAGE_KEY = BROWSER_STORAGE_KEYS.settings;
export const ACCENT_PRESETS = [
  { id: "default", label: "默认蓝紫" },
  { id: "blue", label: "蓝色" },
  { id: "green", label: "绿色" },
  { id: "yellow", label: "黄色" },
  { id: "pink", label: "粉色" },
  { id: "orange", label: "橙色" },
  { id: "purple", label: "紫色" },
  { id: "white", label: "白色" },
] as const;

export const settingsSchema = z.object({
  version: z.literal(1),
  language: z.literal("zh-CN"),
  theme: z.enum(["dark", "light", "system"]),
  // Additive v1 preference: old/unknown accents keep all other user choices.
  accent: z
    .enum(ACCENT_PRESETS.map(({ id }) => id))
    .default("default")
    .catch("default"),
  floatingLayout: z.boolean(),
  removeWatermark: z.boolean(),
});

export type SettingsPreferences = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: SettingsPreferences = {
  version: 1,
  language: "zh-CN",
  theme: "dark",
  accent: "default",
  floatingLayout: true,
  removeWatermark: true,
};

export function parseSettings(raw: string | null): {
  preferences: SettingsPreferences;
  recovered: boolean;
} {
  if (raw === null)
    return { preferences: { ...DEFAULT_SETTINGS }, recovered: false };
  try {
    const result = settingsSchema.safeParse(JSON.parse(raw));
    if (result.success) return { preferences: result.data, recovered: false };
  } catch {
    // Invalid JSON is recovered without deleting the original browser data.
  }
  return { preferences: { ...DEFAULT_SETTINGS }, recovered: true };
}

export function serializeSettings(
  preferences: z.input<typeof settingsSchema>,
): string {
  return JSON.stringify(settingsSchema.parse(preferences), null, 2);
}
