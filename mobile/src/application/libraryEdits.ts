import type { MobileLibraryInput } from "../core/mobileModel.ts";

export interface LibraryEdit {
  input: MobileLibraryInput;
  baseline: MobileLibraryInput;
  baseRevision?: number;
}
/** Unsaved input remains in RAM, isolated by the validated identity realm. */
export class LibraryEditMemory {
  private readonly entries = new Map<string, LibraryEdit>();
  private key(accountId: string, id: string) {
    return JSON.stringify([accountId, id]);
  }
  read(accountId: string, id: string): LibraryEdit | undefined {
    const value = this.entries.get(this.key(accountId, id));
    return value && structuredClone(value);
  }
  remember(accountId: string, id: string, edit: LibraryEdit): void {
    this.entries.set(this.key(accountId, id), structuredClone(edit));
  }
  acknowledge(accountId: string, id: string, saved: LibraryEdit): void {
    const key = this.key(accountId, id);
    if (JSON.stringify(this.entries.get(key)) === JSON.stringify(saved))
      this.entries.delete(key);
  }
  discard(accountId: string, id: string): void {
    this.entries.delete(this.key(accountId, id));
  }
}
