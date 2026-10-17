import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  emptySnapshot,
  snapshotWriteBlockReason,
  type CreationAttachment,
  type CreationDraft,
  type CreationSnapshot,
} from "./model";
import {
  loadCreationSnapshot,
  persistCreationSnapshotAsync,
  persistCreationSnapshotSync,
  pendingRecoveryDraft,
} from "./storage";
import { storageError } from "./snapshotCodec";
import { reconcileProjectCanvas } from "../../domain/projectCanvas";
import {
  createNativeCloseHandler,
  flushCreationBeforeClose,
} from "./nativeClose";

export type SaveState =
  | "loading"
  | "saved"
  | "saving"
  | "read_error"
  | "write_error"
  | "conflict"
  | "read_only";

type LoadingDraft = {
  base: CreationSnapshot;
  changes: Partial<CreationDraft>;
  preservePriorDraft: boolean;
};

function attachmentIdentity(attachment: CreationAttachment): string {
  return attachment.assetId ?? attachment.dataUrl ?? attachment.id;
}

function mergeLoadingDraft(
  stored: CreationDraft,
  base: CreationDraft,
  changes: Partial<CreationDraft>,
): CreationDraft {
  const next = { ...stored, ...changes };
  if (changes.attachments) {
    const retained = new Set(
      changes.attachments.map((attachment) => attachment.id),
    );
    const removed = new Set(
      base.attachments
        .map((attachment) => attachment.id)
        .filter((id) => !retained.has(id)),
    );
    next.attachments = stored.attachments.filter(
      (attachment) => !removed.has(attachment.id),
    );
    const included = new Set(next.attachments.map(attachmentIdentity));
    for (const attachment of changes.attachments) {
      const id = attachmentIdentity(attachment);
      if (!included.has(id)) {
        next.attachments.push(attachment);
        included.add(id);
      }
    }
  }
  return next;
}

function mergeLoadingSnapshot(
  stored: CreationSnapshot,
  current: CreationSnapshot,
  pending: LoadingDraft,
  initialRead: boolean,
): CreationSnapshot {
  const projects = initialRead
    ? current.projects.filter(
        (project) => !stored.projects.some((saved) => saved.id === project.id),
      )
    : [];
  const activeProjectId = initialRead ? current.activeProjectId : null;
  if (
    !Object.keys(pending.changes).length &&
    !projects.length &&
    !activeProjectId
  )
    return stored;
  return {
    ...stored,
    homeDraft: {
      ...mergeLoadingDraft(
        stored.homeDraft,
        pending.base.homeDraft,
        pending.changes,
      ),
      updatedAt: Math.max(
        stored.homeDraft.updatedAt,
        current.homeDraft.updatedAt,
      ),
    },
    projects: [...stored.projects, ...projects],
    activeProjectId: activeProjectId ?? stored.activeProjectId,
    revision: Math.max(stored.revision, current.revision) + 1,
  };
}

export function useCreationStorage(
  recover: (snapshot: CreationSnapshot) => CreationSnapshot,
  reconcile?: (
    snapshot: CreationSnapshot,
  ) => CreationSnapshot | Promise<CreationSnapshot>,
) {
  const [creation, setCreation] = useState(emptySnapshot);
  const creationRef = useRef(creation);
  const [state, setState] = useState<SaveState>("loading");
  const [message, setMessage] = useState("");
  const [loadEpoch, setLoadEpoch] = useState(0);
  const [recoveryDraft, setRecoveryDraft] = useState<CreationSnapshot | null>(
    null,
  );
  const ready = useRef(false);
  const readOnlyReason = useRef<string | undefined>(undefined);
  const dirty = useRef(false);
  const acknowledged = useRef(0);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(false);
  const readSequence = useRef(0);
  const pendingRead = useRef(Promise.resolve());
  const loadedOnce = useRef(false);
  const loadingDraft = useRef<LoadingDraft | null>({
    base: creation,
    changes: {},
    preservePriorDraft: false,
  });

  function commitCreation(
    next: CreationSnapshot,
    homeDraftChanges?: Partial<CreationDraft>,
  ): void {
    const blocked = readOnlyReason.current ?? snapshotWriteBlockReason(next);
    if (blocked) {
      if (!readOnlyReason.current) setRecoveryDraft(creationRef.current);
      readOnlyReason.current = blocked;
      ready.current = false;
      dirty.current = false;
      setState("read_only");
      setMessage(blocked);
      // Read-only navigation may select existing projects/chats without editing their data.
      const current = creationRef.current;
      const viewed = {
        ...current,
        activeProjectId: current.projects.some(
          (project) => project.id === next.activeProjectId,
        )
          ? next.activeProjectId
          : current.activeProjectId,
        projects: current.projects.map((project) => {
          const selected = next.projects.find(
            (candidate) => candidate.id === project.id,
          )?.activeChatId;
          return selected && project.chats?.[selected]
            ? { ...project, activeChatId: selected }
            : project;
        }),
      };
      creationRef.current = viewed;
      setCreation(viewed);
      return;
    }
    if (loadingDraft.current) {
      if (homeDraftChanges)
        Object.assign(loadingDraft.current.changes, homeDraftChanges);
      else {
        const previous = creationRef.current.homeDraft;
        const keys = new Set([
          ...Object.keys(previous),
          ...Object.keys(next.homeDraft),
        ]) as Set<keyof CreationDraft>;
        for (const key of keys)
          if (key !== "updatedAt" && next.homeDraft[key] !== previous[key])
            Object.assign(loadingDraft.current.changes, {
              [key]: next.homeDraft[key],
            });
      }
      delete loadingDraft.current.changes.updatedAt;
    }
    next = {
      ...next,
      projects: next.projects.map((project) => ({
        ...project,
        canvas: reconcileProjectCanvas(project.canvas, project.items),
      })),
      revision: Math.max(creationRef.current.revision, next.revision) + 1,
    };
    creationRef.current = next;
    dirty.current = true;
    if (ready.current) {
      persistCreationSnapshotSync(next);
      setState("saving");
    }
    setCreation(next);
  }
  function isCurrentRead(sequence: number): boolean {
    return mounted.current && sequence === readSequence.current;
  }
  async function read(retry = false): Promise<void> {
    const sequence = ++readSequence.current;
    if (!loadingDraft.current) {
      loadingDraft.current = {
        base: creationRef.current,
        changes: {},
        preservePriorDraft: dirty.current,
      };
      if (dirty.current) setRecoveryDraft(creationRef.current);
    }
    ready.current = false;
    setState("loading");
    // Reads share the write queue because storage also owns the CAS baseline.
    const loading = queue.current.then(() => {
      if (!isCurrentRead(sequence)) return;
      return loadCreationSnapshot(retry);
    });
    queue.current = loading.then(
      () => undefined,
      () => undefined,
    );
    try {
      const loaded = await loading;
      if (!loaded || !isCurrentRead(sequence)) return;
      const blocked =
        loaded.readOnlyReason ?? snapshotWriteBlockReason(loaded.snapshot);
      if (blocked) {
        readOnlyReason.current = blocked;
        ready.current = false;
        dirty.current = false;
        acknowledged.current = loaded.durableRevision ?? 0;
        loadedOnce.current = true;
        loadingDraft.current = null;
        creationRef.current = loaded.snapshot;
        setRecoveryDraft(loaded.recoveryDraft ?? loaded.snapshot);
        setCreation(loaded.snapshot);
        setMessage(blocked);
        setState("read_only");
        setLoadEpoch((epoch) => epoch + 1);
        return;
      }
      const reconciled = reconcile
        ? await reconcile(loaded.snapshot)
        : loaded.snapshot;
      if (!isCurrentRead(sequence)) return;
      const current = creationRef.current;
      let next = recover(reconciled);
      if (
        loaded.durableRevision === null &&
        loaded.recovered &&
        next.revision === 0
      )
        next = { ...next, revision: 1 };
      const pending = loadingDraft.current!;
      if (loaded.recoveryDraft && !pending.preservePriorDraft)
        setRecoveryDraft(loaded.recoveryDraft);
      next = mergeLoadingSnapshot(next, current, pending, !loadedOnce.current);
      setMessage(
        pending.preservePriorDraft
          ? "已重新读取原件；读取前的内存草稿仍可单独下载。"
          : loaded.recovered
            ? "已读取恢复副本，原始数据仍保留。"
            : "",
      );
      acknowledged.current = loaded.durableRevision ?? 0;
      loadedOnce.current = true;
      loadingDraft.current = null;
      readOnlyReason.current = undefined;
      ready.current = true;
      creationRef.current = next;
      dirty.current = next.revision > acknowledged.current;
      setCreation(next);
      setLoadEpoch((epoch) => epoch + 1);
      setState(dirty.current ? "saving" : "saved");
    } catch (error) {
      if (!isCurrentRead(sequence)) return;
      const failure = storageError(error);
      ready.current = false;
      setMessage(failure.message);
      setState(failure.code === "conflict" ? "conflict" : "read_error");
    }
  }
  function enqueuePersist(snapshot: CreationSnapshot): Promise<void> {
    const operation = queue.current.then(async () => {
      if (snapshot.revision <= acknowledged.current) {
        if (mounted.current && ready.current)
          setState(dirty.current ? "saving" : "saved");
        return;
      }
      if (!ready.current)
        throw new Error(
          "项目保存已暂停，本次修改尚未保存；请先处理项目恢复提示。",
        );
      try {
        await persistCreationSnapshotAsync(snapshot);
        acknowledged.current = snapshot.revision;
        dirty.current = creationRef.current.revision > snapshot.revision;
        if (mounted.current && ready.current) {
          setMessage("");
          setState(dirty.current ? "saving" : "saved");
        }
      } catch (error) {
        const failure = storageError(error);
        if (failure.code !== "io") ready.current = false;
        if (mounted.current) {
          setMessage(failure.message);
          setState(
            failure.code === "conflict"
              ? "conflict"
              : ready.current
                ? "write_error"
                : "read_error",
          );
        }
        throw error;
      }
    });
    queue.current = operation.catch(() => undefined);
    return operation;
  }
  function save(): void {
    if (!ready.current) return;
    setState("saving");
    const snapshot = creationRef.current;
    void enqueuePersist(snapshot).catch(() => undefined);
  }
  async function flush(): Promise<void> {
    if (!ready.current)
      throw new Error("项目尚未读取成功，无法持久化任务意图。");
    setState("saving");
    await enqueuePersist(creationRef.current);
  }
  function startRead(retry = false): void {
    pendingRead.current = read(retry);
  }
  useEffect(() => {
    mounted.current = true;
    startRead();
    return () => {
      mounted.current = false;
      readSequence.current++;
    };
  }, []);
  useEffect(() => {
    if (!ready.current || !dirty.current) return;
    const timer = window.setTimeout(save, 180);
    return () => window.clearTimeout(timer);
  }, [creation]);
  useEffect(() => {
    if (!isTauri()) return;
    const nativeWindow = getCurrentWindow();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const report = (error: unknown) => {
      if (!disposed && mounted.current)
        setMessage(
          `${storageError(error).message} 窗口保持打开，请重试保存或下载草稿。`,
        );
    };
    const release = (stop: () => void) => {
      try {
        void Promise.resolve(stop()).catch(report);
      } catch (error) {
        report(error);
      }
    };
    const closing = createNativeCloseHandler({
      flush: () =>
        flushCreationBeforeClose({
          waitForRead: () => pendingRead.current,
          canWrite: () => ready.current,
          hasChanges: () => dirty.current,
          flush,
        }),
      destroy: () => nativeWindow.destroy(),
      active: () => !disposed && mounted.current,
      report,
    });
    void nativeWindow
      .onCloseRequested(closing)
      .then((stop) => {
        if (disposed) release(stop);
        else unlisten = stop;
      })
      .catch(report);
    return () => {
      disposed = true;
      if (unlisten) release(unlisten);
    };
  }, []);
  useEffect(() => {
    const closing = (event: BeforeUnloadEvent) => {
      // Native CloseRequested owns the awaited save. Starting another IPC
      // write during WebView destruction loses data and produces a late error.
      if (isTauri()) return;
      if (!dirty.current) return;
      save();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", closing);
    return () => window.removeEventListener("beforeunload", closing);
  }, []);
  function downloadDraft(): void {
    const snapshot = dirty.current
      ? creationRef.current
      : (recoveryDraft ?? pendingRecoveryDraft() ?? creationRef.current);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kk-studio-unsaved-${Date.now()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return {
    loadEpoch,
    creation,
    creationRef,
    commitCreation,
    state,
    message,
    recoveryDraft,
    downloadDraft,
    retryRead: () => startRead(true),
    retrySave: save,
    flush,
    getWriteBlockReason: () =>
      readOnlyReason.current ??
      (ready.current
        ? undefined
        : "项目存储尚未就绪，已暂停执行；请先处理读取或恢复提示。"),
  };
}
