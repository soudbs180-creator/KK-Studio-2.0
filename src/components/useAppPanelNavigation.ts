import { useCallback, useEffect, useRef, useState } from "react";
import {
  SETTINGS_STORAGE_KEY,
  parseSettings,
  DEFAULT_SETTINGS,
  type SettingsPreferences,
} from "../domain/settings";

export function useAppPanelNavigation(active: string) {
  const currentPage = useRef(active);
  currentPage.current = active;
  const workspaceOrigin = useRef(false);
  const [modal, setModalState] = useState("");
  const modalRef = useRef(modal);
  modalRef.current = modal;
  const settingsBusy = useRef(false);
  const settingsOrigin = useRef<HTMLElement | null>(null);
  const onSettingsBusyChange = useCallback((busy: boolean) => {
    settingsBusy.current = busy;
  }, []);
  const setModal = useCallback((view: string) => {
    if (settingsBusy.current) return;
    if (view === "settings" && modalRef.current !== view) {
      const focused = document.activeElement;
      workspaceOrigin.current =
        currentPage.current === "workspace" &&
        matchMedia("(min-width: 1201px)").matches &&
        !document.querySelector("dialog[open]");
      settingsOrigin.current = focused instanceof HTMLElement ? focused : null;
    }
    setModalState(view);
  }, []);
  const workspaceSettings = modal === "settings" && workspaceOrigin.current;
  const [settingsSection, setSettingsSectionState] = useState("general");
  const setSettingsSection = useCallback((section: string) => {
    if (!settingsBusy.current) setSettingsSectionState(section);
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent): void => {
      if (event.isComposing || event.defaultPrevented || settingsBusy.current)
        return;
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
  }, [setModal, setSettingsSection]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    let preferences: SettingsPreferences = DEFAULT_SETTINGS;
    try {
      preferences = parseSettings(
        localStorage.getItem(SETTINGS_STORAGE_KEY),
      ).preferences;
    } catch {
      // Browser storage can be denied; retain the default theme preferences.
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
  const settingsNavigationLocked = () => settingsBusy.current;
  return {
    modal,
    setModal,
    settingsSection,
    setSettingsSection,
    workspaceSettings,
    settingsOrigin,
    onSettingsBusyChange,
    settingsNavigationLocked,
  };
}
