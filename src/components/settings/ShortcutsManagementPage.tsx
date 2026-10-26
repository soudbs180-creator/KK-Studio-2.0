import { useEffect, useState } from "react";
import type { ShortcutDefinition } from "../../features/settings/shortcutsRegistry";
import {
  getShortcuts,
  resetShortcut,
  resetToDefaults,
  updateShortcut,
} from "../../features/settings/shortcutsRegistry";
import KeystrokeRecorder from "./KeystrokeRecorder";

const SCOPE_TITLES: Record<string, { title: string; desc: string }> = {
  global: {
    title: "全局快捷键",
    desc: "在应用任何界面或面板均可触发的最高优先级快捷键",
  },
  composer: {
    title: "输入与创作",
    desc: "在底部输入框与创作工作台中生效的快捷操作",
  },
  canvas: {
    title: "画布操作",
    desc: "在主创作画布上移动、编辑节点与撤销历史的快捷键",
  },
};

export default function ShortcutsManagementPage() {
  const [shortcuts, setShortcuts] =
    useState<ShortcutDefinition[]>(getShortcuts);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    function refresh() {
      setShortcuts(getShortcuts());
    }
    window.addEventListener("kk:shortcuts-changed", refresh);
    return () => window.removeEventListener("kk:shortcuts-changed", refresh);
  }, []);

  function handleSave(id: string, newKeys: string[]) {
    const res = updateShortcut(id, newKeys);
    if (res.success) {
      setShortcuts(getShortcuts());
      setFeedback("快捷键已更新生效");
      setTimeout(() => setFeedback(null), 2500);
    }
  }

  function handleResetOne(id: string) {
    resetShortcut(id);
    setShortcuts(getShortcuts());
    setFeedback("已恢复默认快捷键");
    setTimeout(() => setFeedback(null), 2500);
  }

  function handleResetAll() {
    resetToDefaults();
    setShortcuts(getShortcuts());
    setFeedback("已恢复所有快捷键至官方默认配置");
    setTimeout(() => setFeedback(null), 2500);
  }

  const filtered = shortcuts.filter(
    (s) =>
      s.name.includes(search) ||
      s.description.includes(search) ||
      s.currentKeys.join("+").toLowerCase().includes(search.toLowerCase()),
  );

  const scopes = ["global", "composer", "canvas"] as const;

  return (
    <div className="settings-detail-stack" style={{ gap: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 className="settings-page-title" id="settings-section-title">
            快捷键管理
          </h2>
          <p className="settings-section-intro" style={{ margin: "6px 0 0" }}>
            自定义常用操作的组合按键。系统内置 3 重防冲突屏障，杜绝按键冲突。
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="search"
            placeholder="搜索快捷键..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="settings-search-input kk-control-box"
            style={{
              height: "var(--kk-control-h-md)",
              padding: "0 12px",
              border: "1px solid var(--kk-border-control)",
              backgroundColor: "var(--kk-bg-input)",
              color: "var(--kk-text-primary)",
              fontSize: "13px",
              width: "160px",
            }}
          />
          <button
            type="button"
            className="settings-action secondary"
            style={{ height: "var(--kk-control-h-md)", whiteSpace: "nowrap" }}
            onClick={handleResetAll}
          >
            恢复默认
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className="kk-control-box"
          style={{
            padding: "8px 14px",
            backgroundColor: "var(--kk-bg-soft)",
            color: "var(--kk-text-accent)",
            fontSize: "13px",
            border: "1px solid var(--kk-border-subtle)",
          }}
          role="status"
        >
          {feedback}
        </div>
      )}

      {scopes.map((scope) => {
        const items = filtered.filter((s) => s.scope === scope);
        if (items.length === 0) return null;
        const meta = SCOPE_TITLES[scope];

        return (
          <div
            key={scope}
            className="settings-group-section"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--kk-text-primary)",
                  margin: 0,
                }}
              >
                {meta.title}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--kk-text-secondary)",
                  margin: "4px 0 0",
                }}
              >
                {meta.desc}
              </p>
            </div>

            <div
              className="settings-card-group kk-card-box"
              style={{
                backgroundColor: "var(--kk-bg-card)",
                border: "1px solid var(--kk-border-subtle)",
                overflow: "hidden",
              }}
            >
              {items.map((shortcut, index) => {
                const isModified =
                  shortcut.currentKeys.join("+") !==
                  shortcut.defaultKeys.join("+");

                return (
                  <div
                    key={shortcut.id}
                    className="settings-card-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderTop:
                        index > 0
                          ? "1px solid var(--kk-border-subtle)"
                          : "none",
                      gap: "16px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--kk-text-primary)",
                          }}
                        >
                          {shortcut.name}
                        </span>
                        {isModified && (
                          <span
                            className="kk-pill-box"
                            style={{
                              fontSize: "11px",
                              padding: "1px 6px",
                              backgroundColor: "var(--kk-bg-soft)",
                              color: "var(--kk-text-accent)",
                            }}
                          >
                            已自定义
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--kk-text-secondary)",
                          margin: "2px 0 0",
                        }}
                      >
                        {shortcut.description}
                      </p>
                    </div>

                    <KeystrokeRecorder
                      shortcutId={shortcut.id}
                      scope={shortcut.scope}
                      currentKeys={shortcut.currentKeys}
                      onSave={(newKeys) => handleSave(shortcut.id, newKeys)}
                      onReset={
                        isModified
                          ? () => handleResetOne(shortcut.id)
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
