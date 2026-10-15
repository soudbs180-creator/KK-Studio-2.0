import { useEffect, useState } from "react";
import {
  getWindowAppearance,
  setWindowAppearance,
  type WindowAppearance,
} from "../../integrations/windowAppearance";
import { SettingRow, SettingsToggle } from "./SettingsControls";
export default function WindowTransparencySetting({
  onSaved,
}: {
  onSaved: (enabled: boolean) => void;
}) {
  const [state, setState] = useState<WindowAppearance>({
    supported: false,
    enabled: false,
    reason: "正在读取桌面窗口能力…",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    void getWindowAppearance()
      .then((value) => {
        if (current) setState(value);
      })
      .catch(() => {
        if (current)
          setState({
            supported: false,
            enabled: false,
            reason: "无法读取桌面窗口能力，请重试。",
          });
      });
    return () => {
      current = false;
    };
  }, []);
  async function change(enabled: boolean) {
    if (busy || !state.supported) return;
    setBusy(true);
    setError("");
    try {
      const actual = await setWindowAppearance(enabled);
      setState(actual);
      onSaved(actual.enabled);
    } catch (error) {
      setError(error instanceof Error ? error.message : "窗口切换失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SettingRow
      id="window-transparency"
      title="透明窗口"
      description={error || "让工作区背景透出桌面，消息与编辑控件保持清晰。"}
    >
      <SettingsToggle
        id="window-transparency"
        checked={state.enabled}
        disabledReason={
          !state.supported
            ? (state.reason ?? "当前桌面环境不支持透明窗口。")
            : busy
              ? "正在切换窗口背景…"
              : undefined
        }
        onChange={(enabled) => void change(enabled)}
      />
    </SettingRow>
  );
}
