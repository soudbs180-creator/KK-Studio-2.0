import type { MobileAsset } from "../core/mobileModel.ts";

/** Null means absent only. I/O errors and corrupt content must throw. */
export interface SnapshotBackend {
  read(accountId: string): Promise<string | null>;
  compareAndSwap(
    accountId: string,
    expectedRevision: number | null,
    payload: string,
  ): Promise<boolean>;
}
export interface OriginalStore {
  read(accountId: string, assetId: string): Promise<Uint8Array>;
  /** Create immutable bytes; reject existing paths rather than overwrite. */
  write(accountId: string, assetId: string, bytes: Uint8Array): Promise<void>;
  remove(accountId: string, assetId: string): Promise<void>;
}
export interface RepositoryOptions {
  accountId: string;
  /** Development fixtures only; default false, never sourced from persisted content. */
  allowLoopbackHttp?: boolean;
  backend: SnapshotBackend;
  originalStore: OriginalStore;
  hash(bytes: Uint8Array): Promise<string>;
  id(): string;
  now(): number;
  /** Close only the private resource opened for this owner; never delete data. */
  close?(): Promise<void>;
}
export interface OriginalInput {
  bytes: Uint8Array;
  mime: string;
  name: string;
  provenance: MobileAsset["provenance"];
  parentAssetId?: string;
}
export interface CredentialVault {
  get(ref: string): Promise<string | null>;
  set(ref: string, value: string): Promise<void>;
  remove(ref: string): Promise<void>;
}
