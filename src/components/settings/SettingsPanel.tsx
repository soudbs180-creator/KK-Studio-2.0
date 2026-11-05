import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  parseSettings,
  serializeSettings,
} from "../../domain/settings";
import type { SettingsPreferences } from "../../domain/settings";
import GeneralSettings from "./GeneralSettings";
import AppUpdatePage from "./AppUpdatePage";
import ProfileUsagePage from "./ProfileUsagePage";
import ShortcutsManagementPage from "./ShortcutsManagementPage";
import SettingsSections from "./SettingsSections";
import SettingsSidebar from "./SettingsSidebar";
import type { SettingsSection } from "./SettingsSectionData";
import { resolveSettingsRoute } from "./SettingsSectionData";
import {
  SettingsNavigationContext,
  useSettingsNavigationLock,
  updateSettingsBusyOwners,
} from "./SettingsNavigationContext";
import type { ExtensionsTab } from "./ExtensionsSettings";
import type { SaveState } from "../../features/creation/index.ts";
import type { CreationProject } from "../../features/creation/index.ts";
import type { SkillRegistry } from "../../features/skills/index.ts";
import type { LocalWorkflowAccess } from "./LocalWorkflowSettings";
import "./settings.css";
import { Button } from "../ui";

function readInitialSettings(): {
  preferences: SettingsPreferences;
  message: string;
  error: boolean;
} {
  try {
    const result = parseSettings(
      window.localStorage.getItem(SETTINGS_STORAGE_KEY),
    );
    return {
      preferences: result.preferences,
      message: result.recovered
        ? "保存的偏好无法读取，已暂用默认设置。原始记录保留，修改设置后将保存新偏好。"
        : "",
      error: result.recovered,
    };
  } catch {
    return {
      preferences: { ...DEFAULT_SETTINGS },
      message:
        "浏览器阻止了本地存储。设置可在本次打开期间使用，关闭后不会保留。",
      error: true,
    };
  }
}

export default function SettingsPanel({
  onClose,
  initialSection = "general",
  saveState = "loading",
  revision = 0,
  projects,
  activeProject,
  registry,
  workflows,
}: {
  onClose: () => void;
  initialSection?: string;
  saveState?: SaveState;
  revision?: number;
  projects: readonly CreationProject[];
  activeProject?: CreationProject;
  registry: SkillRegistry;
  workflows: LocalWorkflowAccess;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [navigation, setNavigation] = useState<"categories" | "detail">(
    "detail",
  );
  const [busyOwners, setBusyOwners] = useState<ReadonlySet<symbol>>(
    () => new Set(),
  );
  const busy = busyOwners.size > 0;
  const setBusy = useCallback((next: boolean, owner: symbol) => {
    setBusyOwners((current) => updateSettingsBusyOwners(current, next, owner));
  }, []);
  useSettingsNavigationLock(panelRef, busy);

  const [initial] = useState(readInitialSettings);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [resolved] = useState(() => resolveSettingsRoute(initialSection));
  const [section, setSection] = useState<SettingsSection>(resolved.section);
  const [modelsMounted, setModelsMounted] = useState(
    resolved.section === "providers",
  );
  const [extensionsTab, setExtensionsTab] = useState<ExtensionsTab | undefined>(
    resolved.extensionsTab,
  );
  const [feedback, setFeedback] = useState({
    message: initial.message,
    error: initial.error,
  });

  useLayoutEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const target =
      navigation === "categories"
        ? panelRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
        : panelRef.current?.querySelector<HTMLElement>(".settings-content");
    if (navigation === "categories")
      target?.scrollIntoView({ block: "nearest" });
    target?.focus({ preventScroll: true });
  }, [navigation]);

  function updatePreferences(
    patch: Partial<SettingsPreferences>,
    message = "偏好已保存在当前浏览器。",
  ): void {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    const systemIsDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.dataset.theme =
      next.theme === "system" ? (systemIsDark ? "dark" : "light") : next.theme;
    document.documentElement.dataset.floatingLayout = String(
      next.floatingLayout,
    );
    window.dispatchEvent(
      new CustomEvent<SettingsPreferences>("kk:settings-changed", {
        detail: next,
      }),
    );
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        serializeSettings(next),
      );
      setFeedback({ message, error: false });
    } catch {
      setFeedback({
        message:
          "更改已在当前页面生效，但浏览器无法保存。请允许本地存储后重试。",
        error: true,
      });
    }
  }

  return (
    <SettingsNavigationContext.Provider value={{ busy, setBusy }}>
      <div
        ref={panelRef}
        className="settings-panel"
        data-section={section}
        data-navigation={navigation}
        aria-busy={busy}
        data-figma-node="399:27506"
      >
        <div className="settings-phone-navigation">
          <Button
            heightTier="40px"
            type="button"
            className="settings-action secondary"
            disabled={busy}
            title={busy ? "连接操作进行中，完成后可返回" : undefined}
            onClick={() => {
              if (!busy) setNavigation("categories");
            }}
          >
            返回设置分类
          </Button>
        </div>
        <SettingsSidebar
          section={section}
          busy={busy}
          onSelect={(next) => {
            if (busy) return;
            setNavigation("detail");
            setSection(next);
            if (next === "providers") setModelsMounted(true);
            if (next !== "extensions") setExtensionsTab(undefined);
            setFeedback({ message: "", error: false });
          }}
        />

        <main
          className="settings-content"
          aria-labelledby="settings-section-title"
          tabIndex={0}
        >
          {section === "general" && (
            <GeneralSettings
              preferences={preferences}
              onChange={updatePreferences}
              generalDetail={resolved.generalDetail}
              onReset={() =>
                updatePreferences(
                  { ...DEFAULT_SETTINGS },
                  "已恢复默认偏好。项目和资产未改动。",
                )
              }
            />
          )}
          {section === "updates" && <AppUpdatePage />}
          {section === "shortcuts" && <ShortcutsManagementPage />}
          {section === "account" && <ProfileUsagePage />}
          {[
            ...(modelsMounted ? ["providers" as const] : []),
            ...(section !== "general" &&
            section !== "providers" &&
            section !== "updates" &&
            section !== "shortcuts" &&
            section !== "account"
              ? [section]
              : []),
          ].map((item) => (
            <SettingsSections
              key={item}
              section={item}
              active={item === section}
              saveState={saveState}
              revision={revision}
              projects={projects}
              activeProject={activeProject}
              preferences={preferences}
              registry={registry}
              workflows={workflows}
              initialModelMethod={resolved.modelMethod}
              extensionsTab={item === "extensions" ? extensionsTab : undefined}
              onFeedback={(message) => setFeedback({ message, error: false })}
            />
          ))}
        </main>

        <button
          type="button"
          className="settings-close kk-control-box"
          aria-label="关闭设置"
          disabled={busy}
          title={busy ? "连接操作进行中，完成后可关闭" : undefined}
          onClick={() => {
            if (!busy) onClose();
          }}
        >
          <img
            src="/design/figma/settings-close.svg"
            width="16"
            height="16"
            alt=""
          />
        </button>

        {feedback.message && (
          <div
            className={`settings-feedback${feedback.error ? " is-error" : ""}`}
            role={feedback.error ? "alert" : "status"}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              aria-label="收起设置提示"
              onClick={() => setFeedback({ message: "", error: false })}
            >
              <X size={16} strokeWidth={1} />
            </button>
          </div>
        )}
      </div>
    </SettingsNavigationContext.Provider>
  );
}
