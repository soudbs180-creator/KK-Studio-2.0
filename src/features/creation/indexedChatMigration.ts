import type { CreationSnapshot } from "./model.ts";
import { sha256Hex } from "./chatMigration.ts";
import { SnapshotStorageError } from "./snapshotCodec.ts";

export interface IndexedSnapshotRecords {
  snapshot: unknown;
  backup: unknown;
  marker: unknown;
}

/** The archive, both write barriers and receipt commit together, or none do. */
export async function commitIndexedChatMigration(
  db: IDBDatabase,
  observed: IndexedSnapshotRecords,
  candidate: CreationSnapshot,
  originals: Record<string, string>,
): Promise<void> {
  const candidateSha256 = sha256Hex(JSON.stringify(candidate));
  const sources = Object.entries(originals).map(([source, rawBytes]) => ({
    source,
    rawBytes,
    sha256: sha256Hex(rawBytes),
    targetFormat: 3,
  }));
  const archives = [
    ...new Map(sources.map((archive) => [archive.sha256, archive])).values(),
  ];
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("creation", "readwrite");
    const store = transaction.objectStore("creation");
    let failure: unknown;
    let remaining = 3 + archives.length;
    const requests = ["snapshot", "backup", "formatMarker"].map((key) =>
      store.get(key),
    );
    const archiveRequests = archives.map((archive) =>
      store.get(`chat-migration:archive:${archive.sha256}`),
    );
    const loaded = () => {
      if (--remaining) return;
      try {
        for (const [index, key] of ["snapshot", "backup", "marker"].entries()) {
          if (
            JSON.stringify(requests[index].result ?? null) !==
            JSON.stringify(
              observed[key as keyof IndexedSnapshotRecords] ?? null,
            )
          )
            throw new SnapshotStorageError(
              "conflict",
              "迁移预检后项目已变化，原件未覆盖。",
            );
        }
        archives.forEach((archive, index) => {
          const existing = archiveRequests[index].result as
            { rawBytes?: string; sha256?: string } | undefined;
          if (existing !== undefined) {
            if (
              existing.rawBytes !== archive.rawBytes ||
              existing.sha256 !== archive.sha256
            )
              throw new SnapshotStorageError(
                "corrupt",
                "迁移保全档案摘要冲突，原件未覆盖。",
              );
          } else {
            store.add(
              {
                rawBytes: archive.rawBytes,
                sha256: archive.sha256,
                targetFormat: 3,
              },
              `chat-migration:archive:${archive.sha256}`,
            );
          }
        });
        store.put(candidate, "backup");
        store.put(candidate, "snapshot");
        store.put({ formatVersion: 2, minWriterVersion: 2 }, "formatMarker");
        store.put(
          {
            algorithm: 1,
            candidateSha256,
            revision: candidate.revision,
            sources: Object.fromEntries(
              sources.map((archive) => [archive.source, archive.sha256]),
            ),
          },
          `chat-migration:receipt:${candidateSha256}`,
        );
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    for (const request of [...requests, ...archiveRequests])
      request.onsuccess = loaded;
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(
        failure ??
          transaction.error ??
          new Error("项目迁移事务中断，原件已保留。"),
      );
  });
}
