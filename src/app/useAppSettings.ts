import { useEffect } from "react";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  SETTINGS_STORAGE_KEY,
  type SettingsPreferences,
} from "../domain/settings";

export function useAppSettings(
  setSettingsSection: (section: string) => void,
  setModal: (modal: string) => void,
) {
  useEffect(() => {
    const shortcut = (event: KeyboardEvent): void => {
      if (event.isComposing || event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        setSettingsSection("general");
        setModal("settings");
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setModal("search");
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    let preferences: SettingsPreferences = DEFAULT_SETTINGS;
    try {
      preferences = parseSettings(
        localStorage.getItem(SETTINGS_STORAGE_KEY),
      ).preferences;
    } catch (error) {
      console.warn("[App] Failed to read settings preferences:", error);
      preferences = DEFAULT_SETTINGS;
    }
    const apply = () => {
      document.documentElement.dataset.accent = preferences.accent;
      document.documentElement.dataset.theme =
        preferences.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : preferences.theme;
      document.documentElement.dataset.floatingLayout = String(
        preferences.floatingLayout,
      );
    };
    const listener = (event: Event) => {
      preferences = (event as CustomEvent<SettingsPreferences>).detail;
      apply();
    };
    apply();
    window.addEventListener("kk:settings-changed", listener);
    media.addEventListener("change", apply);
    return () => {
      window.removeEventListener("kk:settings-changed", listener);
      media.removeEventListener("change", apply);
    };
  }, []);
}
