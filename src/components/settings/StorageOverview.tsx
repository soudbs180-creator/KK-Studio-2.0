import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { executableDir } from "@tauri-apps/api/path";
import { usesNativeAssets } from "../../features/creation/index.ts";
import { readCompanionConnection } from "../../features/local-service/index.ts";
import type { CreationProject } from "../../features/creation/index.ts";
import type { SaveState } from "../../features/creation/index.ts";

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
    installation: "读取中…",
    native: false,
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
      if (usesNativeAssets()) {
        const location = await invoke<string>("get_storage_root");
        return {
          location,
          installation: await executableDir().catch(() => "未能读取，请重试"),
          native: true,
          usage: "未报告",
          quota: "未报告",
          error: "",
        };
      }
      if (companion?.enabled)
        return {
          location: `本机伴随服务 · ${companion.endpoint}`,
          installation: "网页无需安装",
          native: false,
          usage: "未报告",
          quota: "未报告",
          error: "",
        };
      const estimate = await navigator.storage?.estimate?.();
      return {
        location: `当前浏览器 · ${location.origin}`,
        installation: "网页无需安装",
        native: false,
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
            installation: "未能读取",
            native: false,
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
          <span>客户端位置</span>
          <strong>{info.installation}</strong>
        </div>
        <div>
          <span>保存位置</span>
          <strong>{info.location}</strong>
        </div>
        <div>
          <span>项目保存位置</span>
          <strong>
            {info.native
              ? `${info.location.replace(/[\\/]+$/, "")}/projects`
              : info.location}
          </strong>
        </div>
        <div>
          <span>生成原件位置</span>
          <strong>
            {info.native
              ? `${info.location.replace(/[\\/]+$/, "")}/assets`
              : "与项目共用当前本地仓库"}
          </strong>
        </div>
        <div>
          <span>下载目录</span>
          <strong>
            {info.native ? "独立目录选择尚未接入" : "使用浏览器下载设置"}
          </strong>
        </div>
        <div>
          <span>磁盘缓存</span>
          <strong>独立统计与清理尚未接入</strong>
        </div>
        <div>
          <span>内存占用</span>
          <strong>进程统计与管理尚未接入</strong>
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
        当前尚不支持从设置更改项目、生成与下载目录，也不会自动搬移或清理原件。
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
