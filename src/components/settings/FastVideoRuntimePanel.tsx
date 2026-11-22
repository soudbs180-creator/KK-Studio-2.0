import { useMemo, useState } from "react";
import type { LocalHardwareReport } from "../../domain/localModelRecommendations";
import {
  describeFastVideoRuntime,
  readFastVideoRuntimeSettings,
  writeFastVideoRuntimeSettings,
} from "../../features/models";

export default function FastVideoRuntimePanel({
  report,
}: {
  report: LocalHardwareReport | null;
}) {
  const [settings, setSettings] = useState(readFastVideoRuntimeSettings);
  const [message, setMessage] = useState("");
  const described = useMemo(() => {
    const platform = report?.platform ?? "unknown";
    return describeFastVideoRuntime({
      settings,
      platform,
      cudaReported:
        report?.gpus.some((gpu) => gpu.computeBackend === "cuda-reported") ??
        false,
      dedicatedVramBytes:
        report?.gpus.reduce<number | null>(
          (best, gpu) =>
            gpu.dedicatedBytes == null
              ? best
              : Math.max(best ?? 0, gpu.dedicatedBytes),
          null,
        ) ?? null,
    });
  }, [report, settings]);

  function save(next: typeof settings): void {
    if (!writeFastVideoRuntimeSettings(next)) {
      setMessage("无法保存 FastVideo 设置，请检查本地存储。");
      return;
    }
    setSettings(next);
    setMessage(
      next.runnerConfigured
        ? "已标记本机已配置 FastVideo 运行时（仍需实机出片验收）。"
        : "已清除 FastVideo 运行时配置标记。",
    );
  }

  return (
    <section aria-label="FastVideo 运行时" className="settings-detail-stack">
      <div className="settings-section-heading">
        <h3 className="settings-detail-label">FastVideo 运行时</h3>
      </div>
      <p className="settings-section-intro">
        可选本地视频引擎。不打进安装包；需你本机自行安装 Apache-2.0 的 FastVideo
        后再标记。实机文生视频仍为未验证。
      </p>
      <label className="settings-field">
        <span>输出目录（本机路径提示）</span>
        <input
          value={settings.outputDirectory}
          onChange={(event) =>
            setSettings({ ...settings, outputDirectory: event.target.value })
          }
        />
      </label>
      <label className="settings-field">
        <span>默认模型 ID</span>
        <input
          value={settings.modelId}
          onChange={(event) =>
            setSettings({ ...settings, modelId: event.target.value })
          }
        />
      </label>
      <p role="status">
        探测：
        {described.probe.available
          ? "硬件档位可候选"
          : described.probe.disableReason}
      </p>
      {message && <p role="status">{message}</p>}
      <div className="settings-action-group">
        <button
          type="button"
          className="settings-action secondary"
          onClick={() =>
            save({
              ...settings,
              runnerConfigured: true,
            })
          }
        >
          标记已配置运行时
        </button>
        <button
          type="button"
          className="settings-action secondary"
          onClick={() =>
            save({
              ...settings,
              runnerConfigured: false,
            })
          }
        >
          清除标记
        </button>
        <button
          type="button"
          className="settings-action secondary"
          onClick={() => save(settings)}
        >
          保存路径 / 模型
        </button>
      </div>
    </section>
  );
}
