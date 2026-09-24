/**
 * 设置 › 连接 › 记忆：本地长期记忆管理（本机共享）。
 *
 * 共享语义（TASK-MEMORY-002）：Codex（桌面/Web）、豆包（Agent 环境）、
 * WorkBuddy 读写同一份共享文件 ~/.kk-memory/memory.json；仅存本地、绝不上云；
 * 换账号/换人时用户手动清空。
 */
import { useMemory } from "../../features/memory/useMemory.ts";
import { MEMORY_CONTENT_MAX_LENGTH } from "../../features/memory/types.ts";

const TYPE_LABELS: Record<string, string> = {
  user_profile: "用户画像",
  user_preference: "用户偏好",
  user_habit: "使用习惯",
  user_constraint: "用户约束",
};

const SOURCE_LABELS: Record<string, string> = {
  auto_rule: "自动学习",
  manual_codex: "Codex 提炼",
  manual_user: "手动添加",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function MemorySettingsSection({
  onFeedback,
}: {
  onFeedback: (message: string) => void;
}) {
  const {
    enabled,
    store,
    mode,
    storageStatus,
    loading,
    extracting,
    busy,
    codexConnected,
    toggle,
    removeRecord,
    clearAll,
    resetIdentity,
    authorizeSharedDirectory,
    extractWithCodex,
  } = useMemory(onFeedback);

  const records = store?.records ?? [];

  return (
    <div className="settings-detail-stack">
      <h3 className="settings-detail-label">记忆服务</h3>
      <div className="settings-network-row">
        <div>
          <h3>自动学习偏好与习惯</h3>
          <p>
            开启后，对话会自动学习你的稳定偏好（如"以后请用日系插画风格"），
            并在后续对话中供 Codex、豆包、WorkBuddy 参考。
          </p>
          <p className="settings-network-activity">
            隐私：记忆仅存本机共享文件（~/.kk-memory/memory.json），本机各产品共享同一份，
            绝不上传云端，也不进入同步、日志或导出包。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className="settings-toggle"
          aria-label="记忆服务开关"
          onClick={() => void toggle(!enabled)}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      {enabled && (
        <>
          <h3 className="settings-detail-label">共享状态</h3>
          <div className="settings-detail-card">
            <div>
              <span>存储模式</span>
              <strong>
                {mode === "shared"
                  ? "本机共享文件"
                  : "仅本应用（浏览器未授权）"}
              </strong>
            </div>
            <div>
              <span>记忆条数</span>
              <strong>{records.length}</strong>
            </div>
          </div>
          <div className="settings-network-row">
            <div>
              <h3>共享目录授权</h3>
              <p>
                {storageStatus}。桌面端自动读写共享文件；浏览器端需授权一次
                （选择 ~/.kk-memory 目录）即可与 Codex/WorkBuddy
                共享同一份记忆。
              </p>
            </div>
            <button
              type="button"
              className="settings-action secondary"
              disabled={busy}
              onClick={() => void authorizeSharedDirectory()}
            >
              授权共享目录
            </button>
          </div>

          <h3 className="settings-detail-label">手动提炼</h3>
          <div className="settings-network-row">
            <div>
              <h3>让 Codex 提炼记忆</h3>
              <p>
                把当前对话中你的稳定偏好交给 Codex 整理成记忆（消耗 Codex
                账号额度；需要 Codex 已连接）。
              </p>
            </div>
            <button
              type="button"
              className="settings-action"
              disabled={!codexConnected || extracting || busy}
              title={
                codexConnected ? undefined : "请先在对话面板连接 Codex 主 Agent"
              }
              onClick={() => void extractWithCodex()}
            >
              {extracting ? "提炼中…" : "让 Codex 提炼记忆"}
            </button>
          </div>

          <h3 className="settings-detail-label">记忆列表</h3>
          {loading ? (
            <div className="settings-empty-state">
              <strong>读取中…</strong>
              <p>正在读取本地记忆。</p>
            </div>
          ) : records.length === 0 ? (
            <div className="settings-empty-state">
              <strong>暂无记忆</strong>
              <p>
                开启记忆后，对话中表达偏好（如"以后请用…"、"不要…"）会被自动记录到这里。
              </p>
            </div>
          ) : (
            <>
              <div className="settings-memory-list">
                {records.map((record) => (
                  <div className="settings-memory-item" key={record.id}>
                    <div className="settings-memory-content">
                      <strong>
                        {record.content.slice(0, MEMORY_CONTENT_MAX_LENGTH)}
                      </strong>
                      <span>
                        {TYPE_LABELS[record.memoryType] ?? record.memoryType} ·{" "}
                        {SOURCE_LABELS[record.source] ?? record.source} ·{" "}
                        {formatDate(record.createdAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="settings-memory-delete"
                      aria-label={`删除记忆：${record.content.slice(0, 20)}`}
                      disabled={busy}
                      onClick={() => void removeRecord(record.id)}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <div className="settings-network-actions">
                <button
                  type="button"
                  className="settings-action secondary"
                  disabled={busy}
                  onClick={() => void clearAll()}
                >
                  清空全部记忆
                </button>
                <button
                  type="button"
                  className="settings-action secondary"
                  disabled={busy}
                  onClick={() => void resetIdentity()}
                >
                  重置共享文件
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
