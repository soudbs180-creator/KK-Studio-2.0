import {
  sha256Hex,
  type CreationSnapshotV3,
} from "../../src/features/creation/index.ts";

/**
 * Test-only model of the write barrier. Production IDB and Native use real transactions.
 * 1. Read v2 raw bytes -> compute SHA-256
 * 2. Write immutable archive: archive-v2-${sha256}.json
 * 3. Write v3 backup: creation-backup.json (.bak)
 * 4. Write v3 main: creation-v2.json
 * 5. Advance authority marker: formatVersion = 2, minWriterVersion = 2
 */
export class NonDowngradableWriteBarrier {
  readonly memoryFiles = new Map<string, string>();
  #formatMarker = { formatVersion: 1, minWriterVersion: 1 };
  #stepLog: string[] = [];

  constructor(initialV2Raw: string) {
    this.memoryFiles.set("projects/creation-v2.json", initialV2Raw);
  }

  get formatMarker(): { formatVersion: number; minWriterVersion: number } {
    return { ...this.#formatMarker };
  }

  get stepLog(): string[] {
    return [...this.#stepLog];
  }

  executeMigrationWriteBarrier(v3Snapshot: CreationSnapshotV3): {
    archivePath: string;
    archiveSha: string;
    backupPath: string;
    mainPath: string;
  } {
    // Step 1: Read existing raw bytes and compute SHA-256
    const rawV2 = this.memoryFiles.get("projects/creation-v2.json");
    if (!rawV2) throw new Error("Missing projects/creation-v2.json to migrate");
    const sha256 = sha256Hex(rawV2);
    this.#stepLog.push(`sha256:${sha256}`);

    // Step 2: Write immutable archive
    const archivePath = `projects/archive-v2-${sha256}.json`;
    this.memoryFiles.set(
      archivePath,
      JSON.stringify({
        rawBytes: rawV2,
        sha256,
        targetFormat: 3,
        archivedAt: Date.now(),
      }),
    );
    this.#stepLog.push(`archived:${archivePath}`);

    // Step 3: Write v3 backup barrier
    const backupPath = "projects/creation-backup.json";
    const serializedV3 = JSON.stringify(v3Snapshot, null, 2);
    this.memoryFiles.set(backupPath, serializedV3);
    this.#stepLog.push(`backup_written:${backupPath}`);

    // Step 4: Write v3 main publication
    const mainPath = "projects/creation-v2.json";
    this.memoryFiles.set(mainPath, serializedV3);
    this.#stepLog.push(`main_written:${mainPath}`);

    // Step 5: Advance authority marker
    this.#formatMarker = { formatVersion: 2, minWriterVersion: 2 };
    this.memoryFiles.set(
      "app/repository.json",
      JSON.stringify({ ...this.#formatMarker, updatedAt: Date.now() }),
    );
    this.#stepLog.push("marker_advanced:formatVersion=2");

    return { archivePath, archiveSha: sha256, backupPath, mainPath };
  }

  /** Crash recovery simulation */
  recoverFromCrash(): { state: "v2" | "v3_recovered" } {
    const backup = this.memoryFiles.get("projects/creation-backup.json");
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        if (parsed.version === 3) {
          this.memoryFiles.set("projects/creation-v2.json", backup);
          this.#formatMarker = { formatVersion: 2, minWriterVersion: 2 };
          return { state: "v3_recovered" };
        }
      } catch (err) {
        void err;
      }
    }
    return { state: "v2" };
  }
}
