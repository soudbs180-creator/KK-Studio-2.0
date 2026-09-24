/**
 * 记忆设置页 React hook：开关、列表、删除、清空、身份重置、手动 Codex 提炼。
 */
import { useCallback, useEffect, useState } from "react";
import { agentConnection } from "../agent/agentConnection.ts";
import { memoryService } from "./index.ts";
import type { MemoryStoreFile } from "./types.ts";

const EXTRACT_INSTRUCTION =
  "请从本次对话中提炼关于用户稳定偏好的 3~5 条事实，每行一条，以「记忆：」开头，不要输出其他内容。";

function waitForAssistantReply(
  beforeCount: number,
  timeoutMs = 45_000,
): Promise<string | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      const messages = agentConnection.getState().messages;
      if (messages.length > beforeCount) {
        const last = [...messages]
          .reverse()
          .find((item) => item.role === "assistant" && Boolean(item.text));
        if (last?.text) {
          window.clearInterval(timer);
          resolve(last.text);
          return;
        }
      }
      if (Date.now() - start >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 300);
  });
}

export function useMemory(onFeedback: (message: string) => void) {
  const [enabled, setEnabled] = useState<boolean>(() =>
    memoryService.isEnabled(),
  );
  const [store, setStore] = useState<MemoryStoreFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [busy, setBusy] = useState(false);
  const codexConnected = agentConnection.getState().status === "connected";

  const refresh = useCallback(async () => {
    try {
      setStore(await memoryService.load());
    } catch {
      setStore(null);
      onFeedback("读取本地记忆失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, [onFeedback]);

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
          ? "已开启记忆：对话会自动学习你的偏好，仅存本地、随账号隔离、不上云。"
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
      onFeedback("已清空当前账号的全部本地记忆。");
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
      onFeedback(
        "已重置记忆身份：旧身份记忆已保留在本地文件（.previous），新对话从空记忆开始。",
      );
    } catch {
      onFeedback("重置记忆身份失败，请重试。");
    } finally {
      setBusy(false);
    }
  }, [onFeedback]);

  const extractWithCodex = useCallback(async () => {
    if (extracting || busy) return;
    if (agentConnection.getState().status !== "connected") {
      onFeedback("请先连接 Codex 主 Agent，再使用「让 Codex 提炼记忆」。");
      return;
    }
    setExtracting(true);
    try {
      const before = agentConnection.getState().messages.length;
      const result = await agentConnection.sendMessage(EXTRACT_INSTRUCTION);
      if (!result.ok) {
        onFeedback(result.error ?? "Codex 提炼失败，请重试。");
        return;
      }
      const reply = await waitForAssistantReply(before);
      if (!reply) {
        onFeedback("Codex 未返回可提炼的内容，请稍后重试。");
        return;
      }
      const added = await memoryService.saveCodexExtraction(reply);
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
    loading,
    extracting,
    busy,
    codexConnected,
    toggle,
    removeRecord,
    clearAll,
    resetIdentity,
    extractWithCodex,
  };
}
