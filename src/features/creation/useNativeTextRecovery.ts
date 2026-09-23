import { useEffect, useRef, type MutableRefObject } from "react";
import type { CreationSnapshot } from "./model";
import { reconcileNativeTasks, usesNativeTaskHost } from "./nativeTaskHost";

/** Reconnects to the same native journal after a WebView reload, never submits. */
export function useNativeTextRecovery(
  creationRef: MutableRefObject<CreationSnapshot>,
  controllers: MutableRefObject<Record<string, AbortController>>,
  commit: (snapshot: CreationSnapshot) => void,
  ready: boolean,
) {
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    if (!ready || !usesNativeTaskHost()) return;
    let stopped = false,
      running = false;
    const poll = async () => {
      if (running || stopped) return;
      const snapshot = creationRef.current;
      const ids = snapshot.projects
        .flatMap((project) => project.tasks)
        .filter(
          (task) =>
            task.kind === "text" &&
            !controllers.current[task.id] &&
            ["running", "unknown"].includes(task.status),
        )
        .map((task) => task.id);
      if (!ids.length) return;
      running = true;
      try {
        const next = await reconcileNativeTasks(snapshot, ids);
        // A stale read cannot overwrite typing, cancellation or another project.
        if (!stopped && next !== snapshot && creationRef.current === snapshot)
          commitRef.current(next);
      } catch {
        /* Leave the last durable state visible; retry reads only. */
      } finally {
        running = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [ready, creationRef, controllers]);
}
