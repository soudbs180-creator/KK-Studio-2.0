import { useEffect, useRef, useState } from "react";
import { detectLocalHardware } from "../../features/models/index.ts";
import {
  recommendLocalModels,
  type LocalHardwareReport,
} from "../../domain/localModelRecommendations";
import { useSettingsNavigationBusy } from "./useSettingsBusy";
import SettingsExternalLink from "./SettingsExternalLink";
import LocalVideoPackages from "./LocalVideoPackages";

const gib = (value: number | null | undefined) =>
  value == null ? "未报告" : `${(value / 1024 ** 3).toFixed(1)} GiB`;
const reasonLabels: Record<string, string> = {
  "insufficient-free-ram": "当前可用内存不足",
  "insufficient-free-vram": "当前可用显存不足",
  "insufficient-disk": "当前磁盘空间不足",
  "unknown-ram": "内存未报告",
  "unknown-vram": "显存未报告",
  "unknown-disk": "请选择可用磁盘",
  "stale-report": "检测已过期，请重新检测",
  "runtime-architecture-unverified": "此系统架构尚未验证",
  "unsupported-platform": "需要桌面版的本机检测能力",
};

export default function LocalHardwareSettings() {
  const [report, setReport] = useState<LocalHardwareReport | null>(null);
  const [drive, setDrive] = useState("C:");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const pending = useRef(false);
  const reportBusy = useSettingsNavigationBusy();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const recommendations =
    report?.status === "supported"
      ? recommendLocalModels(report, { diskDrive: drive, nowMs: Date.now() })
      : null;
  async function detect(): Promise<void> {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    reportBusy(true);
    setError("");
    try {
      const next = await detectLocalHardware();
      if (!mounted.current) return;
      const nextDrive =
        next.disks.find((disk) => disk.drive === drive)?.drive ??
        next.disks[0]?.drive ??
        "C:";
      setReport(next);
      setDrive(nextDrive);
      if (next.status === "supported")
        setSelected(
          recommendLocalModels(next, {
            diskDrive: nextDrive,
            nowMs: Date.now(),
          }).preferredId ?? "",
        );
    } catch {
      if (mounted.current)
        setError("本机硬件检测不可用，请重试。现有连接与模型配置保留。");
    } finally {
      pending.current = false;
      reportBusy(false);
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section
      aria-label="电脑配置与本地模型推荐"
      className="settings-detail-stack"
      aria-busy={busy}
    >
      <div className="settings-section-heading">
        <h3 className="settings-detail-label">电脑配置与推荐</h3>
        <button
          type="button"
          className="settings-action secondary"
          disabled={busy}
          onClick={() => void detect()}
        >
          {busy ? "检测中…" : "检测电脑配置"}
        </button>
      </div>
      <p className="settings-section-intro">
        仅在点击后读取本机
        CPU、内存、显卡与磁盘容量；不保存、不上传，不安装或启动模型。
      </p>
      {error && <p role="alert">{error}</p>}
      {report?.status === "unsupported" && (
        <p role="status">
          当前网页无法直接检测电脑配置，请在桌面版使用本机检测。
        </p>
      )}
      {report?.status === "supported" && (
        <>
          <dl className="settings-summary-list">
            <div>
              <dt>处理器</dt>
              <dd>{report.cpu?.name ?? "未报告"}</dd>
            </div>
            <div>
              <dt>系统内存 / 当前可用</dt>
              <dd>
                {gib(report.memory?.usableBytes)} /{" "}
                {gib(report.memory?.availableBytes)}
              </dd>
            </div>
            {report.gpus.map((gpu, index) => (
              <div key={index}>
                <dt>{gpu.name}</dt>
                <dd>
                  专用 {gib(gpu.dedicatedBytes)} · 可用 {gib(gpu.freeBytes)}
                </dd>
              </div>
            ))}
          </dl>
          <label className="settings-field">
            <span>安装磁盘容量预检</span>
            <select
              value={drive}
              disabled={!report.disks.length}
              onChange={(event) => setDrive(event.target.value)}
            >
              {!report.disks.length && <option value="C:">磁盘未报告</option>}
              {report.disks.map((disk) => (
                <option key={disk.drive} value={disk.drive}>
                  {disk.drive} · 可用 {gib(disk.freeBytes)}
                </option>
              ))}
            </select>
          </label>
          <p className="settings-section-intro">
            这是检测时的资源快照与估计，驱动报告不等于 CUDA
            已验证。运行前需重新检查；推荐不代表已安装或能启动。
          </p>
        </>
      )}
      {recommendations && (
        <>
          <fieldset className="settings-model-candidates">
            <legend>Qwen 对话 / 看图候选</legend>
            {recommendations.profiles.map((item) => (
              <div
                className="settings-model-candidate"
                key={item.model.id}
                data-selected={selected === item.model.id}
              >
                <label className="settings-candidate-choice">
                  <input
                    type="radio"
                    name="local-model-candidate"
                    value={item.model.id}
                    checked={selected === item.model.id}
                    onChange={() => setSelected(item.model.id)}
                  />
                  <strong>{item.model.name}</strong>
                  <span>
                    {item.status === "recommended"
                      ? "推荐"
                      : item.status === "alternative"
                        ? "备选"
                        : item.status === "optional"
                          ? "更大型号"
                          : item.status === "insufficient"
                            ? "当前资源不足"
                            : "待确认"}
                  </span>
                </label>
                <p>
                  llama.cpp · 权重与视觉投影 {gib(item.downloadBytes)} · 上下文{" "}
                  {item.contextTokens} ·{" "}
                  {item.execution === "cpu-offload"
                    ? "CPU / GPU 混合估计"
                    : "GPU 加载估计"}
                </p>
                {item.reasons.length > 0 && (
                  <p>
                    {item.reasons
                      .map((reason) => reasonLabels[reason] ?? "尚需验证")
                      .join("；")}
                  </p>
                )}
                <SettingsExternalLink href={item.model.sourceUrl}>
                  来源与固定版本
                </SettingsExternalLink>
              </div>
            ))}
          </fieldset>
          <p className="settings-section-intro">
            可选择非推荐型号。下载 Qwen 不代表 Agent 工具调用已验证；Qwen-Agent
            是执行框架。自动安装、目录关联和推理引擎启动尚未接通。
          </p>
          <button
            type="button"
            className="settings-action secondary"
            disabled
            title="安装与完整性校验服务尚未接入"
          >
            安装服务未接入
          </button>
          <LocalVideoPackages packages={recommendations.videoPackages} />
        </>
      )}
    </section>
  );
}
