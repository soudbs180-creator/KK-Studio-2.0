import type {
  MobileLibraryEntry,
  MobileLibraryInput,
  MobileCanvasProposal,
  MobileProposalInput,
} from "../core/mobileModel.ts";
import {
  invariant,
  object,
  array,
  id,
  text,
  integer,
  keys,
  assertNoSecrets,
} from "./schemaPrimitives.ts";
import { validateDraft } from "./creationValidation.ts";
import { validateCanvasOperations } from "./canvasOperations.ts";

export function validateLibraryInput(
  value: unknown,
): asserts value is MobileLibraryInput {
  object(value);
  assertNoSecrets(value);
  keys(value, ["kind", "name", "content"]);
  validateLibraryContent(value);
}
function validateLibraryContent(value: Record<string, unknown>): void {
  invariant(
    typeof value.kind === "string" &&
      ["prompt", "template", "role", "skill-instruction"].includes(value.kind),
    "Unsupported library instruction kind",
  );
  text(value.name, 200);
  text(value.content, 20000);
  invariant(
    value.name.trim().length > 0 && value.content.trim().length > 0,
    "Library name and instruction content required",
  );
}
export function validateLibraryEntry(
  value: unknown,
): asserts value is MobileLibraryEntry {
  object(value);
  assertNoSecrets(value);
  keys(value, [
    "id",
    "kind",
    "name",
    "content",
    "revision",
    "createdAt",
    "updatedAt",
    "importedFromId",
  ]);
  validateLibraryContent(value);
  id(value.id);
  integer(value.revision);
  integer(value.createdAt);
  integer(value.updatedAt);
  if (value.importedFromId !== undefined) id(value.importedFromId);
}
export function validateLibrary(
  value: unknown,
): asserts value is MobileLibraryEntry[] {
  array(value, 500);
  const ids = new Set<string>();
  for (const entry of value) {
    validateLibraryEntry(entry);
    invariant(!ids.has(entry.id), "Duplicate library identity");
    ids.add(entry.id);
  }
}
export function validateProposalInput(
  value: unknown,
): asserts value is MobileProposalInput {
  object(value);
  assertNoSecrets(value);
  keys(
    value,
    value.kind === "canvas"
      ? ["kind", "title", "operations"]
      : ["kind", "title", "draft"],
  );
  validateProposalContent(value);
}
function validateProposalContent(value: Record<string, unknown>): void {
  text(value.title, 200);
  invariant(value.title.trim().length > 0, "Proposal title required");
  invariant(
    value.kind === "canvas" || value.kind === "generation",
    "Unsupported proposal kind",
  );
  if (value.kind === "canvas") validateCanvasOperations(value.operations);
  else validateDraft(value.draft);
}
export function validateProposal(
  value: unknown,
): asserts value is MobileCanvasProposal {
  object(value);
  assertNoSecrets(value);
  keys(value, [
    "id",
    "kind",
    "title",
    ...(value.kind === "canvas" ? ["operations"] : ["draft"]),
    "revision",
    "baseProjectRevision",
    "createdAt",
    "updatedAt",
    "status",
    "requiresRefresh",
  ]);
  validateProposalContent(value);
  id(value.id);
  for (const k of ["revision", "baseProjectRevision", "createdAt", "updatedAt"])
    integer(value[k]);
  invariant(
    typeof value.status === "string" &&
      ["pending", "approved", "rejected", "withdrawn"].includes(value.status),
    "Invalid proposal status",
  );
  invariant(
    value.requiresRefresh === undefined ||
      typeof value.requiresRefresh === "boolean",
    "Invalid proposal refresh state",
  );
}
