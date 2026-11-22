import { useEffect, useMemo, useRef, useState } from "react";
import {
  listLocalStorePresets,
  planPackageReplacement,
  type LocalStorePreset,
} from "../../domain/localModelStore";
import {
  localModelInstallation,
  runLocalModelInstallFlow,
} from "../../features/models";
import type {
  LocalInstallStatus,
  LocalInstallationSummary,
} from "../../domain/localModelInstallation";
import { confirmAction } from "../../runtime/confirmAction";
import { useSettingsNavigationBusy } from "./useSettingsBusy";
import SettingsExternalLink from "./SettingsExternalLink";

const gib = (value: number | null | undefined) =>
  value == null ? "未报告" : `${(value / 1024 ** 3).toFixed(1)} GiB`;

const sourceLabels: Record<LocalStorePreset["sourceKind"], string> = {
  official: "官方精选",
  community: "社区 / 魔改",
  "external-runtime": "外部运行时",
};

const modalityLabels: Record<LocalStorePreset["modality"], string> = {
  text: "文本",
  "vision-language": "图文理解",
  image: "图片",
  video: "视频",
  audio: "音频",
};

function backendFor(packageId: string): "cpu" | "cuda-13.4" | "none" {
  if (packageId.startsWith("minimax-h3")) return "none";
  return "cuda-13.4";
}

/**
 * Local model store: curated presets + ADR-023 Native install bridge.
 * First launch never auto-downloads; install requires explicit directory grant.
 */
export default function LocalModelStorePanel() {
  const presets = useMemo(() => listLocalStorePresets(), []);
  const [installed, setInstalled] = useState<LocalInstallationSummary[]>([]);
  const [status, setStatus] = useState<LocalInstallStatus | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const reportBusy = useSettingsNavigationBusy();

  useEffect(() => {
    mounted.current = true;
    void refreshInstalled();
    return () => {
      mounted.current = false;
    };
  }, []);

  async function refreshInstalled(): Promise<void> {
    try {
      const list = await localModelInstallation.listInstalled();
      if (mounted.current) setInstalled(list);
    } catch (cause) {
      if (!mounted.current) return;
      setInstalled([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "无法读取已安装本地模型（网页版不可用）。",
      );
    }
  }

  async function installPreset(preset: LocalStorePreset): Promise<void> {
    if (!preset.installable || !preset.catalogRevision) {
      setMessage(preset.notes);
      return;
    }
    const existing = installed.find(
      (item) => item.packageId === preset.packageId,
    );
    if (existing) {
      const plan = planPackageReplacement({
        packageId: existing.packageId,
        installedRevision: "0".repeat(40),
        catalogRevision: preset.catalogRevision,
        installedBytes: preset.declaredBytes,
      });
      const deleteOld = await confirmAction(
        `将重新安装 ${preset.name}。是否在成功后删除旧文件以节省约 ${gib(plan.bytesFreedIfDelete)} 空间？（以 Native receipt 为准）`,
      );
      if (!deleteOld) {
        const keep = await confirmAction("保留旧文件并继续安装新版本？");
        if (!keep) {
          setMessage("已取消更新。");
          return;
        }
      }
    }

    setBusy(true);
    reportBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await runLocalModelInstallFlow(
        {
          packageIds: [preset.packageId],
          runtimeBackend: backendFor(preset.packageId),
        },
        {
          confirmDownload: async (plan) =>
            confirmAction(
              `将下载约 ${gib(plan.downloadBytes)} 到 ${plan.destination}。确认开始安装？`,
            ),
          pollIntervalMs: 1000,
          maxPolls: 3600,
        },
      );
      if (mounted.current) {
        setStatus(result.status);
        setInstalled(result.installed);
      }
      if (result.status.state === "installed") {
        setMessage(`${preset.name} 已安装（验收仍为 unverified）。`);
      } else if (result.status.state === "cancelled") {
        setMessage("安装已取消；半包不会标为已安装。");
      } else {
        setError(result.status.error ?? "安装失败。");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "安装失败。");
    } finally {
      reportBusy(false);
      if (mounted.current) setBusy(false);
    }
  }

  async function cancelActive(): Promise<void> {
    if (!status) return;
    try {
      const next = await localModelInstallation.cancel(status.operationId);
      setStatus(next);
      setMessage("已请求取消安装。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "取消失败。");
    }
  }

  return (
    <section
      aria-label="本地模型商店"
      className="settings-detail-stack"
      aria-busy={busy}
    >
      <div className="settings-section-heading">
        <h3 className="settings-detail-label">本地模型商店</h3>
        <button
          type="button"
          className="settings-action secondary"
          disabled={busy}
          onClick={() => void refreshInstalled()}
        >
          刷新已安装
        </button>
      </div>
      <p className="settings-section-intro">
        首次安装不会自动下载。精选包可选手动安装；社区包未 pin
        摘要前不可一键安装。更新默认替换并确认是否删旧。
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {status && (
        <p role="status">
          安装进度：{status.state} · {gib(status.completedBytes)} /{" "}
          {gib(status.totalBytes)}
          {busy && status.state !== "installed" && (
            <>
              {" "}
              <button
                type="button"
                className="settings-action secondary"
                onClick={() => void cancelActive()}
              >
                取消
              </button>
            </>
          )}
        </p>
      )}
      {installed.length > 0 && (
        <ul className="settings-summary-list" aria-label="已安装本地模型">
          {installed.map((item) => (
            <li key={item.installationId}>
              {item.name} · {item.engine} · {item.backend}
              {item.associated ? " · 关联现有文件" : ""}
            </li>
          ))}
        </ul>
      )}
      <ul className="settings-model-candidates">
        {presets.map((preset) => {
          const current = installed.find(
            (item) => item.packageId === preset.packageId,
          );
          return (
            <li className="settings-model-candidate" key={preset.packageId}>
              <strong>{preset.name}</strong>
              <span>
                {modalityLabels[preset.modality]} ·{" "}
                {sourceLabels[preset.sourceKind]}
                {preset.installable ? "" : " · 暂不可一键安装"}
              </span>
              <p>{preset.notes}</p>
              <p>
                体积 {gib(preset.declaredBytes)}
                {current ? " · 已安装" : " · 未安装"}
              </p>
              <SettingsExternalLink href={preset.sourceUrl}>
                来源
              </SettingsExternalLink>
              <button
                type="button"
                className="settings-action secondary"
                disabled={busy || !preset.installable}
                title={
                  preset.installable ? "选择目录后下载并校验" : preset.notes
                }
                onClick={() => void installPreset(preset)}
              >
                {current ? "更新 / 重新安装" : "安装"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
