/** Compatibility model entry; storage I/O stays here, pure normalization lives in domain. */
import {
  CREATION_STORAGE_KEY,
  emptySnapshot,
  migrateV1,
  normalizeCreationSnapshot,
  type CreationSnapshot,
} from "../../domain/creationModel.ts";
export * from "../../domain/creationModel.ts";
export function readCreationSnapshot(): CreationSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = window.localStorage.getItem(CREATION_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as {
      version?: number;
      projects?: unknown[];
      activeProjectId?: unknown;
      revision?: number;
      homeDraft?: unknown;
    };
    if (parsed.version === 1 && Array.isArray(parsed.projects)) {
      return migrateV1(parsed);
    }
    if (
      (parsed.version !== 2 && parsed.version !== 3) ||
      !Array.isArray(parsed.projects)
    ) {
      return emptySnapshot();
    }
    return normalizeCreationSnapshot(parsed) ?? emptySnapshot();
  } catch {
    // Preserve malformed data. The UI can keep working in memory and saving is
    // deliberately attempted only after the user creates or edits a project.
    return emptySnapshot();
  }
}

export function persistCreationSnapshot(snapshot: CreationSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CREATION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota errors are surfaced by the caller's status state. A full UI reload
    // must never replace a valid in-memory project with an empty one.
  }
}
