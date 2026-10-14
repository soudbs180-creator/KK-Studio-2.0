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
import SettingsSections from "./SettingsSections";
import type { SettingsSection } from "./SettingsSectionData";
import { SETTINGS_NAV_GROUPS, SETTINGS_SECTIONS } from "./SettingsSectionData";
import {
  SettingsNavigationContext,
  useSettingsNavigationLock,
  updateSettingsBusyOwners,
} from "./SettingsNavigationContext";
import type { SettingsSectionItem } from "./SettingsSectionData";
import type { ExtensionsTab } from "./ExtensionsSettings";
import type { SaveState } from "../../features/creation/useCreationStorage";
import type { CreationProject } from "../../features/creation/model";
import type { SkillRegistry } from "../../features/skills/skillRegistry";
import "./settings.css";

/** Keep old deep links working while exposing one consolidated extensions rail item. */
const LEGACY_EXTENSION_TAB: Record<string, ExtensionsTab> = {
  mcp: "plugins",
  plugins: "plugins",
  skill: "skills",
  skills: "skills",
};

function resolveInitialSection(initial: SettingsSection): {
  section: SettingsSection;
  extensionsTab?: ExtensionsTab;
} {
  if (initial === "partners") return { section: "providers" };
  const legacyTab = LEGACY_EXTENSION_TAB[initial];
  if (legacyTab) {
    return {
      section: "extensions",
      extensionsTab: legacyTab,
    };
  }
  if (initial === "extensions")
    return { section: "extensions", extensionsTab: "plugins" };
  return { section: initial };
}

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
  registry,
}: {
  onClose: () => void;
  initialSection?: SettingsSection;
  saveState?: SaveState;
  revision?: number;
  projects: readonly CreationProject[];
  registry: SkillRegistry;
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
  const [initial] = useState(readInitialSettings);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [resolved] = useState(() => resolveInitialSection(initialSection));
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
        data-navigation={navigation}
        aria-busy={busy}
        data-figma-node="399:27506"
      >
        <div className="settings-phone-navigation">
          <button
            type="button"
            className="settings-action secondary"
            disabled={busy}
            title={busy ? "连接操作进行中，完成后可返回" : undefined}
            onClick={() => {
              if (!busy) setNavigation("categories");
            }}
          >
            返回设置分类
          </button>
          <strong>
            {SETTINGS_SECTIONS.find((item) => item.id === section)?.label}
          </strong>
        </div>
        <aside className="settings-sidebar">
          <h1 id="settings-dialog-title">设置</h1>
          <nav className="settings-nav" aria-label="设置分类">
            {SETTINGS_NAV_GROUPS.map((group) => (
              <div key={group.label} className="settings-nav-group">
                <div className="settings-nav-group-label">{group.label}</div>
                {group.items.map((item: SettingsSectionItem) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`settings-nav-item${section === item.id ? " is-active" : ""}`}
                    aria-current={section === item.id ? "page" : undefined}
                    disabled={busy}
                    title={
                      busy ? "连接操作进行中，完成后可切换设置" : undefined
                    }
                    onClick={() => {
                      if (busy) return;
                      setNavigation("detail");
                      setSection(item.id);
                      if (item.id === "providers") setModelsMounted(true);
                      if (item.id !== "extensions") setExtensionsTab(undefined);
                      setFeedback({ message: "", error: false });
                    }}
                  >
                    <img
                      className="settings-nav-icon"
                      src={`/design/figma/settings-nav-${item.id === "usage" ? "account" : item.id === "skill" || item.id === "extensions" ? "mcp" : item.id}.svg`}
                      alt=""
                      width="20"
                      height="20"
                    />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main
          className="settings-content"
          aria-labelledby="settings-section-title"
          tabIndex={0}
        >
          {section === "general" && (
            <GeneralSettings
              preferences={preferences}
              onChange={updatePreferences}
            />
          )}
          {[
            ...(modelsMounted ? ["providers" as const] : []),
            ...(section !== "general" && section !== "providers"
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
              preferences={preferences}
              registry={registry}
              extensionsTab={item === "extensions" ? extensionsTab : undefined}
              onReset={() =>
                updatePreferences(
                  { ...DEFAULT_SETTINGS },
                  "已恢复默认偏好。项目和资产未改动。",
                )
              }
              onFeedback={(message) => setFeedback({ message, error: false })}
            />
          ))}
        </main>
        <button
          type="button"
          className="settings-close"
          aria-label="关闭设置"
          disabled={busy}
          title={busy ? "连接操作进行中，完成后可关闭" : undefined}
          onClick={() => {
            if (!busy) onClose();
          }}
        >
          <img
            src="/design/figma/settings-close.svg"
            width="14"
            height="14"
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
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </SettingsNavigationContext.Provider>
  );
}
