import { useState } from "react";
import type { CompanionClient } from "../../features/local-service/client.ts";
import {
  exportCompanionBackup,
  importIndexedData,
  preflightIndexedData,
  restoreCompanionBackup,
  type MigrationPreflightReport,
} from "../../features/local-service/migration.ts";

export default function CompanionMigrationActions({
  client,
  onFeedback,
}: {
  client: CompanionClient;
  onFeedback: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState("");
  const [migrationReport, setMigrationReport] =
    useState<MigrationPreflightReport | null>(null);
  const [latestBackupId, setLatestBackupId] = useState<string | null>(null);

  async function preflightMigration(): Promise<void> {
    setBusy(true);
    setDetail("");
    try {
      const report = await preflightIndexedData();
      setMigrationReport(report);
      onFeedback(
        `预检通过：${report.assets.length} 个素材、${report.totalBytes} 字节；旧浏览器数据不会被删除。`,
      );
    } catch (error) {
      setDetail(error instanceof Error ? error.message : "旧数据预检失败。");
    } finally {
      setBusy(false);
    }
  }

  async function importMigration(): Promise<void> {
    if (!migrationReport) return;
    setBusy(true);
    setDetail("");
    try {
      await importIndexedData(migrationReport, {
        client,
        onProgress: (completed, total) =>
          setDetail(`正在上传素材 ${completed}/${total}…`),
      });
      setMigrationReport(null);
      onFeedback("旧浏览器项目和素材已导入本机服务；原 IndexedDB 数据仍保留。");
    } catch (error) {
      setDetail(
        error instanceof Error ? error.message : "迁移未完成，旧数据仍保留。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createBackup(): Promise<void> {
    setBusy(true);
    try {
      const backup = await exportCompanionBackup(client);
      setLatestBackupId(backup.backupId);
      onFeedback(`本机备份已生成：${backup.backupId}`);
    } catch (error) {
      setDetail(error instanceof Error ? error.message : "备份失败。");
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup(): Promise<void> {
    setBusy(true);
    try {
      const backups = await client.listCompanionBackups();
      const backup = backups.at(-1);
      if (!backup) {
        setDetail("没有可恢复的本机备份。");
        return;
      }
      await restoreCompanionBackup(backup.id, client);
      setLatestBackupId(backup.id);
      onFeedback(
        `已恢复本机备份：${backup.id}；请重新读取项目以应用恢复版本。`,
      );
    } catch (error) {
      setDetail(
        error instanceof Error ? error.message : "恢复失败，当前项目仍保留。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="settings-companion-migration">
        <h4>旧浏览器数据迁移</h4>
        <p>
          先只读预检，再确认导入。导入失败会保留旧 IndexedDB
          和本机服务当前快照。
        </p>
        <div className="settings-action-group">
          <button
            type="button"
            className="settings-action secondary"
            onClick={() => void preflightMigration()}
            disabled={busy}
          >
            预检旧数据
          </button>
          {migrationReport && (
            <button
              type="button"
              className="settings-action"
              onClick={() => void importMigration()}
              disabled={busy}
            >
              确认导入 {migrationReport.assets.length} 个素材
            </button>
          )}
        </div>
        {migrationReport && (
          <p className="settings-network-activity" role="status">
            报告 {migrationReport.reportId} · 快照 revision{" "}
            {migrationReport.snapshot.revision} · {migrationReport.totalBytes}{" "}
            字节
          </p>
        )}
      </div>
      <div className="settings-companion-migration">
        <h4>本机备份</h4>
        <p>
          备份保存在伴随服务数据目录；恢复前会校验清单和每个文件的 SHA-256。
        </p>
        <div className="settings-action-group">
          <button
            type="button"
            className="settings-action secondary"
            onClick={() => void createBackup()}
            disabled={busy}
          >
            创建备份
          </button>
          <button
            type="button"
            className="settings-action secondary"
            onClick={() => void restoreBackup()}
            disabled={busy}
          >
            恢复最近备份
          </button>
        </div>
        {latestBackupId && (
          <p className="settings-network-activity" role="status">
            最近备份：{latestBackupId}
          </p>
        )}
      </div>
      {detail && (
        <p className="settings-network-error" role="alert">
          {detail}
        </p>
      )}
    </>
  );
}
