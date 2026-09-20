import { useEffect, useRef, useState } from "react";
import { emptySnapshot, type CreationSnapshot } from "./model";
import {
  loadCreationSnapshot,
  persistCreationSnapshotAsync,
  persistCreationSnapshotSync,
  pendingRecoveryDraft,
} from "./storage";
import { storageError } from "./snapshotCodec";
import { reconcileProjectCanvas } from "../../domain/projectCanvas";

export type SaveState =
  "loading" | "saved" | "saving" | "read_error" | "write_error" | "conflict";

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
  const dirty = useRef(false);
  const acknowledged = useRef(0);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(false);
  const readSequence = useRef(0);

  function commitCreation(next: CreationSnapshot): void {
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
  async function read(retry = false): Promise<void> {
    const sequence = ++readSequence.current;
    ready.current = false;
    setState("loading");
    await queue.current;
    try {
      const loaded = await loadCreationSnapshot(retry);
      if (!mounted.current || sequence !== readSequence.current) return;
      const current = creationRef.current;
      const reconciled = reconcile
        ? await reconcile(loaded.snapshot)
        : loaded.snapshot;
      let next = recover(reconciled);
      acknowledged.current = loaded.durableRevision ?? 0;
      if (
        loaded.durableRevision === null &&
        loaded.recovered &&
        next.revision === 0
      )
        next = { ...next, revision: 1 };
      if (loaded.recoveryDraft) setRecoveryDraft(loaded.recoveryDraft);
      if (dirty.current) {
        if (retry) {
          // Keep the user's draft separately. Never merge a stale revision over
          // data that another process has saved in the meantime.
          setRecoveryDraft(current);
          setMessage("已重新读取原件；刚才的内存草稿仍可单独下载。");
        } else {
          next = {
            ...next,
            homeDraft:
              current.homeDraft.updatedAt > next.homeDraft.updatedAt
                ? current.homeDraft
                : next.homeDraft,
            projects: [
              ...next.projects,
              ...current.projects.filter(
                (project) =>
                  !next.projects.some((stored) => stored.id === project.id),
              ),
            ],
            activeProjectId: current.activeProjectId ?? next.activeProjectId,
            revision: Math.max(next.revision, current.revision) + 1,
          };
        }
      } else
        setMessage(loaded.recovered ? "已读取恢复副本，原始数据仍保留。" : "");
      ready.current = true;
      creationRef.current = next;
      dirty.current = next.revision > acknowledged.current;
      setCreation(next);
      setLoadEpoch((epoch) => epoch + 1);
      setState(dirty.current ? "saving" : "saved");
    } catch (error) {
      if (!mounted.current || sequence !== readSequence.current) return;
      const failure = storageError(error);
      ready.current = false;
      setMessage(failure.message);
      setState(failure.code === "conflict" ? "conflict" : "read_error");
    }
  }
  function enqueuePersist(snapshot: CreationSnapshot): Promise<void> {
    const operation = queue.current.then(async () => {
      if (!ready.current || snapshot.revision <= acknowledged.current) return;
      try {
        await persistCreationSnapshotAsync(snapshot);
        acknowledged.current = snapshot.revision;
        dirty.current = creationRef.current.revision > snapshot.revision;
        if (mounted.current) {
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
  useEffect(() => {
    mounted.current = true;
    void read();
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
    const closing = (event: BeforeUnloadEvent) => {
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
    retryRead: () => void read(true),
    retrySave: save,
    flush,
  };
}
