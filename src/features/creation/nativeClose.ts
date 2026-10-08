import { SnapshotStorageError } from "./snapshotCodec.ts";

export async function flushCreationBeforeClose(persistence: {
  waitForRead: () => Promise<void>;
  canWrite: () => boolean;
  hasChanges: () => boolean;
  flush: () => Promise<void>;
}): Promise<void> {
  await persistence.waitForRead();
  if (!persistence.canWrite()) {
    if (persistence.hasChanges())
      throw new SnapshotStorageError(
        "io",
        "本次修改尚未保存；请先处理项目恢复提示或下载草稿。",
      );
    return;
  }
  do {
    await persistence.flush();
  } while (persistence.hasChanges());
}

export function createNativeCloseHandler(options: {
  flush: () => Promise<void>;
  destroy: () => Promise<void>;
  active: () => boolean;
  report: (error: unknown) => void;
}) {
  let closing = false;
  return async (event: { preventDefault: () => void }): Promise<void> => {
    // Prevent every request before yielding. A second event must never close
    // the window while the first request still owns the durable write queue.
    event.preventDefault();
    if (closing || !options.active()) return;
    closing = true;
    try {
      await options.flush();
      if (options.active()) await options.destroy();
    } catch (error) {
      if (options.active()) options.report(error);
    } finally {
      closing = false;
    }
  };
}
