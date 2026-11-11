import type {
  CreationProject,
  CreationTask,
} from "../../domain/creationTypes.ts";

/** Observe the durable task host; a submission acknowledgement is not a result. */
export async function waitForCreationTask(options: {
  getProject: () => CreationProject | undefined;
  taskId: string;
  signal: AbortSignal;
  cancel: (id: string) => void;
  timeoutMs?: number;
}): Promise<CreationTask> {
  const deadline = Date.now() + (options.timeoutMs ?? 20 * 60 * 1000);
  try {
    for (;;) {
      options.signal.throwIfAborted();
      const project = options.getProject();
      if (!project) throw new Error("原项目或聊天已不可用，请在原项目核对任务");
      const task = project.tasks.find((task) => task.id === options.taskId);
      if (!task) throw new Error("任务记录不存在");
      if (task.status === "succeeded") return structuredClone(task);
      if (
        [
          "failed",
          "partial",
          "interrupted",
          "cancelled",
          "offline",
          "unknown",
        ].includes(task.status)
      )
        throw new Error(task.error ?? `任务未成功：${task.status}`);
      if (Date.now() >= deadline)
        throw new Error("等待任务超时，请在任务面板核对结果");
      await new Promise<void>((resolve, reject) => {
        const finish = () => {
          options.signal.removeEventListener("abort", abort);
          resolve();
        };
        const timer = setTimeout(finish, 100);
        const abort = () => {
          clearTimeout(timer);
          options.signal.removeEventListener("abort", abort);
          reject(options.signal.reason);
        };
        options.signal.addEventListener("abort", abort, { once: true });
        if (options.signal.aborted) abort();
      });
    }
  } catch (error) {
    if (options.signal.aborted) options.cancel(options.taskId);
    throw error;
  }
}
