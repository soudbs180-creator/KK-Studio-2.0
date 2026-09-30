/**
 * 记忆设置页 React hook：开关、列表、删除、清空、共享目录授权、手动 Codex 提炼。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { agentConnection } from "../agent/agentConnection.ts";
import { memoryService } from "./index.ts";
import { completedAssistantReply } from "./reply.ts";
import type { MemoryStoreFile } from "./types.ts";

const EXTRACT_INSTRUCTION =
  "请从本次对话中提炼关于用户稳定偏好的 3~5 条事实，每行一条，以「记忆：」开头，不要输出其他内容。";

function waitForAssistantReply(
  clientMessageId: string,
  threadId: string,
  timeoutMs = 120_000,
): Promise<string | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      const state = agentConnection.getState();
      const reply = completedAssistantReply(
        state.messages,
        clientMessageId,
        threadId,
        state.sending,
        state.conversation?.status,
      );
      if (reply) {
        window.clearInterval(timer);
        resolve(reply);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 300);
  });
}

export function useMemory(onFeedback: (message: string) => void) {
  const feedbackRef = useRef(onFeedback);
  feedbackRef.current = onFeedback;
  const [enabled, setEnabled] = useState<boolean>(() =>
    memoryService.isEnabled(),
  );
  const [store, setStore] = useState<MemoryStoreFile | null>(null);
  const [mode, setMode] = useState<
    "shared" | "shared-readonly" | "isolated" | "locked"
  >("isolated");
  const [storageStatus, setStorageStatus] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [busy, setBusy] = useState(false);
  const codexConnected = agentConnection.getState().status === "connected";

  const refresh = useCallback(async () => {
    try {
      setMode(await memoryService.storageMode());
      setStorageStatus(await memoryService.storageStatus());
      setStore(await memoryService.load());
      setLoadError(null);
    } catch {
      setStore(null);
      setLoadError("本地记忆读取失败，原数据已保留。");
      feedbackRef.current(
        "读取本地记忆失败。请检查共享目录授权或文件格式后重试。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (next: boolean) => {
      memoryService.setEnabled(next);
      setEnabled(next);
      await refresh();
      onFeedback(
        next
          ? (await memoryService.storageMode()) === "shared-readonly"
            ? "已开启记忆：可读取共享文件并向所选模型发送相关片段；浏览器共享目录只读，自动学习需在桌面端完成。"
            : "已开启记忆：KK Studio 会记录你的稳定偏好，并向当前所选模型发送相关片段用于回答。"
          : "已关闭记忆：停止自动学习与注入。",
      );
    },
    [onFeedback, refresh],
  );

  const removeRecord = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        setStore(await memoryService.deleteRecord(id));
      } catch {
        onFeedback("删除记忆失败，请重试。");
      } finally {
        setBusy(false);
      }
    },
    [onFeedback],
  );

  const clearAll = useCallback(async () => {
    setBusy(true);
    try {
      setStore(await memoryService.clearAll());
      onFeedback(
        "已清空当前存储的记忆；已接入共享文件的客户端重新读取后会看到变化。",
      );
    } catch {
      onFeedback("清空记忆失败，请重试。");
    } finally {
      setBusy(false);
    }
  }, [onFeedback]);

  const resetIdentity = useCallback(async () => {
    setBusy(true);
    try {
      setStore(await memoryService.resetIdentity());
      onFeedback("已重置当前记忆。桌面端旧文件保留为 .previous 备份。");
    } catch {
      onFeedback("重置记忆文件失败，请重试。");
    } finally {
      setBusy(false);
    }
  }, [onFeedback]);

  const authorizeSharedDirectory = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await memoryService.authorizeSharedDirectory();
      await refresh();
      onFeedback(
        ok
          ? "已授权只读共享目录。浏览器私有记忆仍保留，退出共享视图后可继续编辑。"
          : "未完成授权，记忆仍仅存本应用。",
      );
    } catch {
      onFeedback("授权共享目录失败（浏览器可能不支持），记忆仍仅存本应用。");
    } finally {
      setBusy(false);
    }
  }, [onFeedback, refresh]);

  const leaveSharedDirectory = useCallback(async () => {
    setBusy(true);
    try {
      await memoryService.leaveSharedDirectory();
      await refresh();
      onFeedback("已切回浏览器私有记忆，可继续自动学习和编辑。");
    } catch {
      onFeedback("退出共享视图失败，请重试。");
    } finally {
      setBusy(false);
    }
  }, [onFeedback, refresh]);

  const extractWithCodex = useCallback(async () => {
    if (extracting || busy) return;
    if (agentConnection.getState().status !== "connected") {
      onFeedback("请先连接 Codex 主 Agent，再使用「让 Codex 提炼记忆」。");
      return;
    }
    setExtracting(true);
    try {
      const beforeState = agentConnection.getState();
      const threadId = beforeState.conversation?.threadId;
      if (!threadId) {
        onFeedback("Codex 对话尚未就绪，请稍后重试。");
        return;
      }
      if ((await memoryService.storageMode()) === "shared-readonly") {
        onFeedback("浏览器共享目录只读，请在桌面端提炼记忆。");
        return;
      }
      const result = await agentConnection.sendMessage(EXTRACT_INSTRUCTION, {
        memoryMode: "none",
      });
      if (!result.ok) {
        onFeedback(result.error ?? "Codex 提炼失败，请重试。");
        return;
      }
      if (!result.messageId) {
        onFeedback("无法识别本次 Codex 提炼请求，请重试。");
        return;
      }
      const reply = await waitForAssistantReply(result.messageId, threadId);
      if (!reply) {
        onFeedback("Codex 未返回可提炼的内容，请稍后重试。");
        return;
      }
      const added = await memoryService.saveCodexExtraction(reply, threadId);
      await refresh();
      onFeedback(
        added > 0
          ? `已提炼并保存 ${added} 条记忆（仅存本地）。`
          : "本次没有新增记忆（可能已存在或未识别到稳定偏好）。",
      );
    } catch {
      onFeedback("提炼记忆时发生错误，请重试。");
    } finally {
      setExtracting(false);
    }
  }, [busy, extracting, onFeedback, refresh]);

  return {
    enabled,
    store,
    mode,
    storageStatus,
    loadError,
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
  };
}
