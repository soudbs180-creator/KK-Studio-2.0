import type {
  CertificationQuestion,
  OntologyConcept,
} from "../../domain/ontologyCertification.ts";
import { BROWSER_STORAGE_KEYS } from "../../runtime/storage-contract.ts";

interface OntologyRecord {
  concepts: OntologyConcept[];
  holds: CertificationQuestion[];
}

function browserStorage(): Storage | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    return localStorage;
  } catch {
    return undefined;
  }
}

function readAll(): Record<string, OntologyRecord> {
  const storage = browserStorage();
  if (!storage) return {};
  try {
    const parsed = JSON.parse(
      storage.getItem(BROWSER_STORAGE_KEYS.ontologyCertification) ?? "{}",
    ) as Record<string, OntologyRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, OntologyRecord>): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(
      BROWSER_STORAGE_KEYS.ontologyCertification,
      JSON.stringify(records),
    );
  } catch (error) {
    void error;
  }
}

export function readOntology(projectId = "workspace"): OntologyRecord {
  const record = readAll()[projectId];
  return {
    concepts: Array.isArray(record?.concepts) ? record.concepts : [],
    holds: Array.isArray(record?.holds) ? record.holds : [],
  };
}

export function writeOntology(
  projectId: string,
  concepts: readonly OntologyConcept[],
  holds: readonly CertificationQuestion[] = [],
): void {
  const records = readAll();
  records[projectId] = { concepts: [...concepts], holds: [...holds] };
  writeAll(records);
}
