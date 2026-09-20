import { z } from "zod";
import { BROWSER_STORAGE_KEYS } from "../runtime/storage-contract.ts";

export const SETTINGS_STORAGE_KEY = BROWSER_STORAGE_KEYS.settings;

export const settingsSchema = z.object({
  version: z.literal(1),
  language: z.literal("zh-CN"),
  theme: z.enum(["dark", "light", "system"]),
  floatingLayout: z.boolean(),
  removeWatermark: z.boolean(),
});

export type SettingsPreferences = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: SettingsPreferences = {
  version: 1,
  language: "zh-CN",
  theme: "dark",
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

export function serializeSettings(preferences: SettingsPreferences): string {
  return JSON.stringify(settingsSchema.parse(preferences), null, 2);
}
