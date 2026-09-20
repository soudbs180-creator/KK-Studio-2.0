# Portable Project Package Specification

## 1. Package boundary

The portable package is a single `.kkproject` file containing a versioned manifest and immutable asset entries. The v1 transport is ZIP32 (UTF-8 names, one disk, no archive comments, ZIP64, symlinks or executable entries). Limits are 100 MiB per entry, 512 MiB total and 10,000 entries including the manifest; the central directory is bounded to 2 MiB before library allocation. A browser implementation may use the same logical entries behind a File/Blob adapter; the manifest contract must not depend on Tauri paths.

Required entry names:

```text
manifest.json
assets/<sha256-lowercase-64-hex>.bin
```

Only these two entry families are accepted. `manifest.json` is UTF-8 JSON. An asset filename is derived from the complete SHA-256, never from user-controlled names or paths. The archive reader must reject absolute paths, `..`, duplicate names, symlinks, encrypted entries, an entry count above the configured limit, and declared/uncompressed size above the configured limit before allocating output.

## 2. Manifest schema

`manifest.json` has this shape (additional top-level fields are rejected in v1):

```ts
type ProjectPackageManifestV1 = {
  kind: "kk-studio-project";
  version: 1;
  exportedAt: string;             // RFC3339 UTC
  snapshot: CreationSnapshot;     // version 2, after encodeSnapshotAssets
  assets: Array<{
    assetId: string;              // asset-<first 24 lowercase hex>
    sha256: string;               // complete lowercase SHA-256
    mime: string;
    size: number;
    tags: string[];
    source?: "provider" | "upload";
    isAiGenerated?: boolean;
    sourceJobId?: string;
    promptHash?: string;
    parentId?: string;
    origins?: StoredGeneratedAsset["origins"];
    provenance: AssetProvenance;
  }>;
  checksum: string;               // SHA-256 of canonical body without checksum
};
```

The canonical body is `{kind,version,exportedAt,snapshot,assets}` serialized with a deterministic JSON canonicalizer (object keys sorted recursively by raw UTF-16 code units, numbers serialized with ECMAScript double semantics; arrays keep schema order). `checksum` is computed over UTF-8 canonical bytes. Each asset entry must also satisfy `sha256(bytes) === sha256`, `assetId === asset-${sha256.slice(0,24)}`, `bytes.length === size`, and the declared MIME allowlist already enforced by the T3a repository. `preview` and all data URLs are excluded from asset metadata; the encoded snapshot contains `kk-asset:<assetId>` references only where `snapshotAssets.ts` currently transforms media.

The package must include every referenced asset, including attachment `assetId`s, item `assetId`/`parentAssetId`s, and task output `assetId`s. A preflight collector must reject a dangling reference and must not silently drop an attachment or task output. Unreferenced archive entries are rejected in v1 so a package cannot smuggle an unrelated blob into a project restore.

`decodeSnapshot(manifest.snapshot)` is required after parsing, and `rejectSecrets` must reject API keys, access/refresh/OAuth tokens and nested secret-shaped fields before any file write. `credentialRef`, provider name, base URL and prompt hashes remain non-secret routing metadata; the package never contains the credential value.

## 3. Export flow

1. Read the durable snapshot through the existing storage service. Do not export an in-memory snapshot while `loadCreationSnapshot` is blocked or while a revision write is pending.
2. Run `encodeSnapshotAssets(snapshot, loadStoredAsset)`. For every reference, read and fully verify the T3a record/blob; missing or mismatched originals abort export and leave the source unchanged.
3. Collect the exact referenced `assetId`s, build metadata entries and collect the verified original bytes within the package memory/size limits into `assets/<sha256>.bin`. Do not use UI preview bytes when a native/IDB archive record is available.
4. Canonicalize the manifest, calculate `checksum`, write the ZIP to a sibling temporary path, fsync/close, reopen it through the same preflight reader, and publish a hard link at the user-selected new destination, then remove the temporary name. Existing destinations are refused; v1 never replaces another backup. The command checks the saved revision captured by the UI.

Export does not delete or mark source assets. The package is an immutable backup artifact; it does not include credentials, provider responses, local filesystem paths or secrets.

## 4. Import and isolated restore

Import is a two-phase operation. `preflightProjectPackage(input)` parses the archive and validates path policy, entry limits, manifest schema, snapshot schema, secret rejection, reference closure, metadata/byte hashes, MIME/size and manifest checksum. It returns a read-only validated package summary and never mutates storage.

The user selects an existing parent outside the active data root; the UI proposes a unique new child root. Existing targets, even empty directories, are refused. The native command exclusively creates a sibling `<target>.kkstudio-import.<nonce>` staging directory, writes each verified blob and record there, writes the encoded snapshot last, syncs repository files (plus the parent directory on Unix), then reopens the staged snapshot/assets through the normal repositories and rechecks every referenced hash. Only after this readback succeeds does it atomically rename the staging directory to the selected import root and return `{projectIds, assetIds, checksum}`. The running app then starts/reopens against that isolated root (the existing `--data-dir` contract) instead of merging over the source root.

For any existing target or a path inside the current root, v1 must refuse an overwrite with a visible `target-not-empty` result. A later merge flow can add a new project ID under the same CAS/revision rules, but it is outside this acceptance unit. Refusing is safer than silently replacing current projects.

If staging, fsync, readback or final rename fails, the staging directory is removed best-effort and the source package/current data root is untouched. Orphaned content in a failed *new* root is diagnosable and never becomes the active snapshot. Existing T3a “do not delete unknown orphan blobs” behavior remains in force.

## 5. Platform API

Shared frontend boundary (`src/features/projects/projectPackage.ts`):

```ts
export type ProjectPackagePreflight = {
  manifest: ProjectPackageManifestV1;
  snapshot: CreationSnapshot;
  assets: ReadonlyMap<string, { metadata: PortableAssetMetadata; bytes: Uint8Array }>;
  checksum: string;
};
export function collectReferencedAssetIds(snapshot: CreationSnapshot): string[];
export function createProjectPackageManifest(
  snapshot: CreationSnapshot,
  readAsset?: (assetId: string) => Promise<StoredGeneratedAsset | null>,
): Promise<{ manifest: ProjectPackageManifestV1; entries: ProjectPackageAssetEntry[] }>;
export function preflightProjectPackage(input: ProjectPackageInput): Promise<ProjectPackagePreflight>;
```

The settings action component owns native dialogs. The Desktop adapter (`src/features/projects/nativeProjectPackageAdapter.ts`) invokes `export_project_package` / `preflight_project_package` / `import_project_package` plus `open_restored_project_package`; it must not expose arbitrary native paths to the shared codec. Rust commands belong in `src-tauri/src/project_package.rs` and receive a user-selected path only after canonicalization and `--data-dir` containment checks. The existing `SnapshotRepository` and `AssetRepository` remain the final schema/hash validators; do not duplicate a weaker writer in the UI.

## 6. Error contract

Errors are machine-readable and user-actionable: `conflict`, `unsupported`, `corrupt`, `checksum-mismatch`, `missing-asset`, `asset-hash-mismatch`, `secret-present`, `target-not-empty`, `quota`, `permission`, `io`. An error must include no API key, token, native absolute path or full prompt. The UI shows preflight failure separately from staging/write failure and offers retry or choose another destination; it never reports “imported” before readback and atomic publish.

## 7. Acceptance evidence

The T3b verification record must include the package SHA-256, source commit, package manifest checksum, source and isolated target roots, and exact runtime/build entry. It must show: all projects/nodes/edges/viewport/messages/tasks survive; every referenced original has the same complete SHA-256; a fresh WebView/Tauri process opened against the isolated root; an invalid schema/checksum/missing/wrong-hash/path-traversal/secret package was rejected before writes; and injected write/fsync/rename failure left the source snapshot and source asset bytes byte-for-byte unchanged.

## 8. Acceptance limits

T3b closes the Desktop Windows local restore unit. Web File/Blob transport remains deferred to T9; the Web settings actions display disabled reasons. Shared logical manifest/preflight is platform independent. Current Figma authentication is unavailable, so the new settings controls are an engineering supplement using existing primitives. The Windows failure matrix injects explicit IO errors; it is not a power-loss, filesystem driver, or cross-platform crash certification.
