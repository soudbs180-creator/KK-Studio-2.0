import type {
  MobileLibraryInput,
  MobileSnapshot,
} from "../core/mobileModel.ts";
import type { LocalRepositoryBridge } from "./localBridge.ts";
import { utf8ByteLength } from "../core/resultLimits.ts";
import { validateLibrary, validateLibraryInput } from "./localSchema.ts";
import {
  invariant,
  object,
  keys,
  assertNoSecrets,
  LIMITS,
  array,
  id,
} from "./schemaPrimitives.ts";

export class MobileLibraryRepository {
  private readonly bridge: LocalRepositoryBridge;
  constructor(bridge: LocalRepositoryBridge) {
    this.bridge = bridge;
  }
  async create(input: MobileLibraryInput): Promise<MobileSnapshot> {
    validateLibraryInput(input);
    const captured = { ...input };
    return this.bridge.mutate((s) => {
      const now = this.bridge.now();
      (s.library ??= []).push({
        ...captured,
        id: this.bridge.id(),
        revision: 0,
        createdAt: now,
        updatedAt: now,
      });
    });
  }
  async update(
    entryId: string,
    input: MobileLibraryInput,
    revision: number,
  ): Promise<MobileSnapshot> {
    validateLibraryInput(input);
    const captured = { ...input };
    return this.bridge.mutate((s) => {
      const entry = s.library?.find((e) => e.id === entryId);
      invariant(entry, "Library entry missing");
      invariant(entry.revision === revision, "Library revision conflict");
      Object.assign(entry, captured, {
        revision: entry.revision + 1,
        updatedAt: this.bridge.now(),
      });
    });
  }
  async delete(entryId: string, revision: number): Promise<MobileSnapshot> {
    return this.bridge.mutate((s) => {
      const entry = s.library?.find((e) => e.id === entryId);
      invariant(entry, "Library entry missing");
      invariant(entry.revision === revision, "Library revision conflict");
      s.library = s.library!.filter((e) => e.id !== entryId);
    });
  }
  async export(entryIds?: string[]): Promise<string> {
    const entries = this.bridge.snapshot().library ?? [];
    if (entryIds !== undefined) {
      array(entryIds, 500);
      entryIds.forEach(id);
      invariant(
        new Set(entryIds).size === entryIds.length &&
          entryIds.every((entryId) => entries.some((e) => e.id === entryId)),
        "Selected library entries missing",
      );
    }
    const payload = JSON.stringify({
      format: "kk-mobile-library",
      version: 1,
      entries: entryIds
        ? entries.filter((e) => entryIds.includes(e.id))
        : entries,
    });
    invariant(
      utf8ByteLength(payload) <= LIMITS.snapshotBytes,
      "Library package exceeds limit",
    );
    return payload;
  }
  private parse(payload: string) {
    invariant(
      typeof payload === "string" &&
        utf8ByteLength(payload) <= LIMITS.snapshotBytes,
      "Library package exceeds limit",
    );
    const value: unknown = JSON.parse(payload);
    object(value);
    assertNoSecrets(value);
    keys(value, ["format", "version", "entries"]);
    invariant(
      value.format === "kk-mobile-library" && value.version === 1,
      "Invalid library package",
    );
    validateLibrary(value.entries);
    return value.entries;
  }
  async preflight(
    payload: string,
  ): Promise<{ entryCount: number; kinds: MobileLibraryInput["kind"][] }> {
    const entries = this.parse(payload);
    return {
      entryCount: entries.length,
      kinds: [...new Set(entries.map((e) => e.kind))],
    };
  }
  async import(payload: string): Promise<MobileSnapshot> {
    const entries = this.parse(payload);
    return this.bridge.mutate((s) => {
      const now = this.bridge.now();
      (s.library ??= []).push(
        ...entries.map((e) => ({
          ...e,
          id: this.bridge.id(),
          importedFromId: e.importedFromId ?? e.id,
          revision: 0,
          createdAt: now,
          updatedAt: now,
        })),
      );
    });
  }
}
