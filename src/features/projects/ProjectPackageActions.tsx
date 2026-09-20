import { useEffect, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { usesNativeAssets } from "../creation/nativeAssetAdapter";
import type { SaveState } from "../creation/useCreationStorage";
import {
  exportNativeProjectPackage,
  importNativeProjectPackage,
  preflightNativeProjectPackage,
  openRestoredProjectPackage,
  type ProjectPackageSummary,
} from "./nativeProjectPackageAdapter";

type Selection = { source: string; summary: ProjectPackageSummary };

/** Engineering supplement using the existing Settings action primitives. */
export default function ProjectPackageActions({
  saveState,
  revision,
}: {
  saveState: SaveState;
  revision: number;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", error: false });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [restoredRoot, setRestoredRoot] = useState("");
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const current = useRef({ saveState, revision });
  current.current = { saveState, revision };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const native = usesNativeAssets();
  const message = (value: string, error = false) => {
    if (mounted.current) setFeedback({ message: value, error });
  };
  async function run(work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await work();
    } catch (error) {
      message(
        error instanceof Error ? error.message : "项目包操作失败，请重试。",
        true,
      );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const filters = [{ name: "KK Studio 项目包", extensions: ["kkproject"] }];
  async function exportPackage() {
    if (current.current.saveState !== "saved") return;
    const expectedRevision = current.current.revision;
    const destination = await save({
      title: "导出项目包到新文件",
      defaultPath: "KK-Studio.kkproject",
      filters,
    });
    if (!mounted.current) return;
    if (!destination) {
      message("已取消导出，项目未改动。");
      return;
    }
    if (
      current.current.saveState !== "saved" ||
      current.current.revision !== expectedRevision
    ) {
      message("项目在选择文件期间发生变化，请等待保存完成后重新导出。", true);
      return;
    }
    message("正在校验原件并写入项目包…");
    const summary = await exportNativeProjectPackage(
      destination,
      expectedRevision,
    );
    message(
      `已导出 ${summary.projectIds.length} 个项目、${summary.assetIds.length} 个原件，并完成写后校验。`,
    );
  }
  async function choosePackage() {
    setSelection(null);
    const source = await open({
      title: "选择项目包",
      multiple: false,
      directory: false,
      filters,
    });
    if (!mounted.current) return;
    if (!source || Array.isArray(source)) {
      message("已取消选择，当前项目未改动。");
      return;
    }
    message("正在检查项目包、图和素材校验和…");
    const summary = await preflightNativeProjectPackage(source);
    if (!mounted.current) return;
    setSelection({ source, summary });
    message(
      `检查通过：${summary.projectIds.length} 个项目、${summary.assetIds.length} 个原件。请选择独立恢复位置。`,
    );
  }
  async function restore() {
    if (!selection) return;
    const parent = await open({
      title: "选择恢复副本的父目录",
      directory: true,
      multiple: false,
    });
    if (!mounted.current) return;
    if (!parent || Array.isArray(parent)) {
      message("已取消恢复，当前项目未改动。");
      return;
    }
    const targetRoot = `${parent.replace(/[\\/]+$/, "")}/KK-Studio-restored-${Date.now()}`;
    message("正在恢复到独立新目录并校验原件…");
    const summary = await importNativeProjectPackage(
      selection.source,
      targetRoot,
    );
    if (!mounted.current) return;
    setSelection(null);
    setRestoredRoot(targetRoot);
    message(
      `已恢复 ${summary.projectIds.length} 个项目、${summary.assetIds.length} 个原件。当前项目保持打开，可在新窗口打开恢复副本。`,
    );
  }
  return (
    <section
      aria-label="项目包备份与恢复"
      data-testid="project-package-actions"
      aria-busy={busy}
    >
      <h3>项目包备份与恢复</h3>
      <p className="settings-section-intro">
        备份所有已保存项目、画布和引用原件。恢复会创建独立副本，不覆盖当前数据。此操作无需网络。
      </p>
      {!native && (
        <p className="settings-section-intro">
          项目包操作目前仅支持 Desktop；Web 文件导入导出尚未接入。
        </p>
      )}
      {native && saveState !== "saved" && (
        <p className="settings-section-intro">
          请等待项目保存完成；读取或保存出错时先处理存储提示，再导出备份。
        </p>
      )}
      <div className="settings-action-group">
        <button
          type="button"
          className="settings-action"
          disabled={!native || busy || saveState !== "saved"}
          onClick={() => void run(exportPackage)}
        >
          导出项目包
        </button>
        <button
          type="button"
          className="settings-action secondary"
          disabled={!native || busy}
          onClick={() => void run(choosePackage)}
        >
          选择项目包
        </button>
      </div>
      {selection && (
        <div className="settings-action-group">
          <button
            type="button"
            className="settings-action"
            disabled={busy}
            onClick={() => void run(restore)}
          >
            恢复到新目录
          </button>
          <button
            type="button"
            className="settings-action secondary"
            disabled={busy}
            onClick={() => {
              setSelection(null);
              message("已取消导入，当前项目未改动。");
            }}
          >
            取消导入
          </button>
        </div>
      )}
      {restoredRoot && (
        <button
          type="button"
          className="settings-action"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await openRestoredProjectPackage(restoredRoot);
              message("已启动恢复副本窗口，当前窗口仍保留原项目。");
            })
          }
        >
          打开恢复副本
        </button>
      )}
      {feedback.message && (
        <p
          className="settings-section-intro"
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
}
