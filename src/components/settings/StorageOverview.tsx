import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usesNativeAssets } from "../../features/creation/nativeAssetAdapter";
import { readCompanionConnection } from "../../features/local-service/connection";
import type { CreationProject } from "../../features/creation/model";
import type { SaveState } from "../../features/creation/useCreationStorage";

export default function StorageOverview({
  projects,
  saveState,
}: {
  projects: readonly CreationProject[];
  saveState: SaveState;
}) {
  const [revision, refresh] = useState(0);
  const [info, setInfo] = useState({
    location: "读取中…",
    usage: "未报告",
    quota: "未报告",
    error: "",
  });
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    setBusy(true);
    const companion = readCompanionConnection();
    const bytes = (value?: number) =>
      value !== undefined && Number.isFinite(value) && value >= 0
        ? `${(value / 1024 / 1024).toFixed(1)} MiB`
        : "未报告";
    void (async () => {
      if (usesNativeAssets())
        return {
          location: await invoke<string>("get_storage_root"),
          usage: "未报告",
          quota: "未报告",
          error: "",
        };
      if (companion?.enabled)
        return {
          location: `本机伴随服务 · ${companion.endpoint}`,
          usage: "未报告",
          quota: "未报告",
          error: "",
        };
      const estimate = await navigator.storage?.estimate?.();
      return {
        location: `当前浏览器 · ${location.origin}`,
        usage: bytes(estimate?.usage),
        quota: bytes(estimate?.quota),
        error: "",
      };
    })()
      .then((result) => {
        if (active) setInfo(result);
      })
      .catch(() => {
        if (active)
          setInfo({
            location: "读取失败",
            usage: "未报告",
            quota: "未报告",
            error: "保存位置未能读取，请重试；现有项目与原件保留。",
          });
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const readable = saveState !== "loading" && saveState !== "read_error";
  const originals = new Set(
    projects.flatMap((project) =>
      project.items.flatMap((item) => (item.assetId ? [item.assetId] : [])),
    ),
  );
  return (
    <section
      className="settings-detail-stack"
      aria-label="数据保存与资源管理"
      aria-busy={busy}
    >
      <h3 className="settings-detail-label">数据保存</h3>
      <p className="settings-section-intro">
        资源库按类型、来源和标签整理原件；喜欢记录偏好，标签管理分类，它们都不会移动或复制原件。
      </p>
      <div className="settings-detail-card">
        <div>
          <span>保存位置</span>
          <strong>{info.location}</strong>
        </div>
        <div>
          <span>当前项目记录</span>
          <strong>{readable ? `${projects.length} 个` : "未读取"}</strong>
        </div>
        <div>
          <span>项目引用原件</span>
          <strong>{readable ? `${originals.size} 个` : "未读取"}</strong>
        </div>
        <div>
          <span>浏览器估算占用</span>
          <strong>{info.usage}</strong>
        </div>
        <div>
          <span>浏览器估算配额</span>
          <strong>{info.quota}</strong>
        </div>
      </div>
      <p className="settings-section-intro">
        项目引用数量不代表完整资源库大小。浏览器估算包含本站所有本地数据；桌面文件和伴随服务占用未接入统计。
      </p>
      {info.error && <p role="alert">{info.error}</p>}
      <div className="settings-action-group">
        <button
          type="button"
          className="settings-action secondary"
          disabled={busy}
          onClick={() => refresh((value) => value + 1)}
        >
          {busy ? "读取中…" : "刷新存储信息"}
        </button>
      </div>
    </section>
  );
}
