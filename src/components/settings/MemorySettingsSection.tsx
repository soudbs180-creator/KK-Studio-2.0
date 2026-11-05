import { agentConnection } from "../../features/agent/index.ts";
/**
 * 设置 › 连接 › 记忆：本地长期记忆管理（本机共享）。
 *
 * 共享语义（TASK-MEMORY-002）：Codex（桌面/Web）、豆包（Agent 环境）、
 * 共享文件契约位于 ~/.kk-memory/memory.json；豆包和 WorkBuddy 的原生客户端
 * 尚未接入该契约，不能仅凭已登录状态宣称已共享。
 * 换账号/换人时用户手动清空。
 */
import { isTauri } from "@tauri-apps/api/core";
import { useState } from "react";
import type { CreationProject } from "../../features/creation/index.ts";
import {
  formatNamespaceKey,
  type MemoryNamespaceScope,
} from "../../features/memory/index.ts";
import { Select } from "../ui";
import MemoryRecordsList from "./MemoryRecordsList";
import OntologyCertificationPanel from "./OntologyCertificationPanel";
import { useMemory } from "../../features/memory/index.ts";
import { confirmAction } from "../../runtime/confirmAction";
export default function MemorySettingsSection({
  onFeedback,
  activeProject,
}: {
  onFeedback: (message: string) => void;
  activeProject?: CreationProject;
}) {
  const [selectedScope, setSelectedScope] =
    useState<MemoryNamespaceScope>("global");
  const chatId = activeProject?.activeChatId;
  const { scope, namespace } = memoryScope();
  function memoryScope() {
    const scope =
      (selectedScope === "project" && !activeProject) ||
      (selectedScope === "session" && !chatId)
        ? "global"
        : selectedScope;
    const namespace = formatNamespaceKey(
      scope,
      scope === "project"
        ? activeProject?.id
        : scope === "session"
          ? JSON.stringify([activeProject?.id, chatId])
          : undefined,
    );
    return { scope, namespace };
  }
  const {
    enabled,
    store,
    mode,
    storageStatus,
    loadError,
    settingsError,
    loading,
    extracting,
    busy,
    codexConnected,
    toggle,
    removeRecord,
    clearAll,
    resetIdentity,
    authorizeSharedDirectory,
    leaveSharedDirectory,
    extractWithCodex,
    refresh,
  } = useMemory(onFeedback, agentConnection, {
    namespace,
    projectId: activeProject?.id,
    activeChat: chatId ? activeProject?.chats?.[chatId] : null,
  });
  const records = store?.records ?? [];
  const sharedReadOnly = mode === "shared-readonly";
  const cannotEdit = sharedReadOnly || mode === "locked";

  function renderRecords() {
    return (
      <>
        {loading ? (
          <div className="settings-empty-state">
            <strong>读取中…</strong>
            <p>正在读取本地记忆。</p>
          </div>
        ) : loadError ? (
          <div className="settings-empty-state" role="alert">
            <strong>{loadError}</strong>
            <p>请检查共享目录授权或文件格式；当前未覆盖原数据。</p>
            <button
              type="button"
              className="settings-action secondary"
              onClick={() => void refresh()}
            >
              重新读取
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="settings-empty-state">
            <strong>暂无记忆</strong>
            <p>
              {cannotEdit
                ? "当前共享文件暂无记忆；浏览器只读模式不会自动写入。"
                : scope === "global"
                  ? '开启记忆后，对话中表达偏好（如"以后请用…"、"不要…"）会被自动记录到这里。'
                  : "当前范围暂无记忆；使用「让 Codex 提炼记忆」保存到此范围。"}
            </p>
          </div>
        ) : (
          <>
            <MemoryRecordsList
              records={records}
              busy={busy}
              cannotEdit={cannotEdit}
              onRemove={removeRecord}
            />
            <div className="settings-network-actions">
              <button
                type="button"
                className="settings-action secondary"
                disabled={busy || cannotEdit}
                onClick={async () => {
                  if (
                    await confirmAction(
                      "确认清空当前范围的全部记忆？其他范围不会删除。",
                    )
                  )
                    void clearAll();
                }}
              >
                清空全部记忆
              </button>
              <button
                type="button"
                className="settings-action secondary"
                disabled={busy || cannotEdit}
                onClick={async () => {
                  if (
                    await confirmAction(
                      scope === "global"
                        ? "确认重置当前记忆？桌面端会保留旧文件备份；浏览器私有记忆没有文件级备份。"
                        : "确认重置当前范围的记忆？其他范围不会删除。",
                    )
                  )
                    void resetIdentity();
                }}
              >
                重置共享文件
              </button>
            </div>
          </>
        )}
      </>
    );
  }
  return (
    <div className="settings-detail-stack settings-memory-section">
      <h3 className="settings-detail-label">记忆服务</h3>
      <div className="settings-network-row">
        <div>
          <h3>记忆参考与自动学习</h3>
          <p>
            开启后，对话会自动学习你的稳定偏好（如"以后请用日系插画风格"），
            并在后续 KK Studio 的 Codex 对话中参考。豆包和 WorkBuddy
            的接入仍在进行中。
          </p>
          {sharedReadOnly && (
            <p className="settings-network-activity">
              当前浏览器共享视图只读：仍可参考共享记忆，自动学习和编辑请使用桌面版。
            </p>
          )}
          <p className="settings-network-activity">
            隐私：完整记忆文件仅存本机，不进入同步、日志或导出包。
            开启后，相关记忆片段会随当前请求发送给所选模型用于回答。
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

      <p role="alert" hidden={!settingsError}>
        {settingsError}
      </p>
      {enabled && (
        <>
          <h3 className="settings-detail-label">共享状态</h3>
          <div className="settings-detail-card">
            <div>
              <span>存储模式</span>
              <strong>
                {mode === "shared"
                  ? "本机共享文件"
                  : sharedReadOnly
                    ? "本机共享文件（浏览器只读）"
                    : mode === "locked"
                      ? "共享目录需重新授权"
                      : isTauri()
                        ? "仅当前数据目录"
                        : "仅本应用（浏览器私有）"}
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
                {storageStatus}。桌面端默认使用
                ~/.kk-memory；指定隔离数据目录时仅使用该目录。浏览器端选择共享目录后可只读参考。
                浏览器私有记忆会保留，不会自动合并到共享文件。
                其他应用只有完成该契约接入后才能读取，不会因登录而自动共享。
              </p>
            </div>
            {!isTauri() && !sharedReadOnly && (
              <button
                type="button"
                className="settings-action secondary"
                disabled={busy}
                onClick={() => void authorizeSharedDirectory()}
              >
                {mode === "locked" ? "重新授权只读目录" : "授权只读共享目录"}
              </button>
            )}
            {!isTauri() && (sharedReadOnly || mode === "locked") && (
              <button
                type="button"
                className="settings-action secondary"
                disabled={busy}
                onClick={() => void leaveSharedDirectory()}
              >
                切回浏览器私有记忆
              </button>
            )}
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
              disabled={!codexConnected || extracting || busy || cannotEdit}
              title={
                cannotEdit
                  ? "浏览器共享目录只读，请在桌面端提炼记忆"
                  : codexConnected
                    ? undefined
                    : "请先在对话面板连接 Codex 主 Agent"
              }
              onClick={() => void extractWithCodex()}
            >
              {extracting ? "提炼中…" : "让 Codex 提炼记忆"}
            </button>
          </div>

          <div className="settings-network-row settings-memory-scope">
            <div>
              <h3>记忆范围</h3>
              <p>全局、当前项目与当前会话分开管理</p>
            </div>
            <Select
              aria-label="记忆范围"
              value={scope}
              onChange={setSelectedScope}
              disabled={busy || extracting}
              options={[
                { value: "global", label: "全局" },
                {
                  value: "project",
                  label: "当前项目",
                  disabled: !activeProject,
                },
                { value: "session", label: "当前会话", disabled: !chatId },
              ]}
            />
          </div>
          <h3 className="settings-detail-label">记忆列表</h3>
          {renderRecords()}
        </>
      )}
      <OntologyCertificationPanel project={activeProject} />
    </div>
  );
}
