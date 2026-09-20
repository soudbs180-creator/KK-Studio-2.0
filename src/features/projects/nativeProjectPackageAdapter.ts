import { invoke } from "@tauri-apps/api/core";
import { usesNativeAssets } from "../creation/nativeAssetAdapter.ts";

export type ProjectPackageOperationState =
  | "checking"
  | "writing"
  | "success"
  | "error"
  | "cancelled"
  | "target-not-empty";

export type ProjectPackageSummary = {
  checksum: string;
  projectIds: string[];
  assetIds: string[];
};

export class NativeProjectPackageError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NativeProjectPackageError";
    this.code = code;
  }
}

function requireNative(): void {
  if (!usesNativeAssets())
    throw new NativeProjectPackageError(
      "unsupported",
      "项目包导出导入仅在 Desktop 原生数据模式可用。",
    );
}

function requireSelectedPath(path: string, label: string): string {
  const selected = path.trim();
  if (!selected)
    throw new NativeProjectPackageError("cancelled", `${label}已取消。`);
  return selected;
}

function normalizeError(error: unknown): NativeProjectPackageError {
  if (error instanceof NativeProjectPackageError) return error;
  const raw = error instanceof Error ? error.message : String(error);
  const code =
    /^(conflict|unsupported|corrupt|checksum-mismatch|missing-asset|asset-hash-mismatch|secret-present|path-traversal|duplicate-entry|unreferenced-asset|target-not-empty|quota|permission|io):/.exec(
      raw,
    )?.[1] ?? "io";
  return new NativeProjectPackageError(
    code,
    raw.replace(/^[a-z-]+:\s*/i, "") || "项目包操作失败，请重试。",
  );
}

export async function exportNativeProjectPackage(
  destination: string,
  expectedRevision?: number,
): Promise<ProjectPackageSummary> {
  requireNative();
  try {
    return await invoke<ProjectPackageSummary>("export_project_package", {
      destination: requireSelectedPath(destination, "项目包导出"),
      expectedRevision,
    });
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function openRestoredProjectPackage(
  targetRoot: string,
): Promise<void> {
  requireNative();
  try {
    await invoke("open_restored_project_package", {
      targetRoot: requireSelectedPath(targetRoot, "恢复副本"),
    });
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function preflightNativeProjectPackage(
  source: string,
): Promise<ProjectPackageSummary> {
  requireNative();
  try {
    return await invoke<ProjectPackageSummary>("preflight_project_package", {
      source: requireSelectedPath(source, "项目包检查"),
    });
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function importNativeProjectPackage(
  source: string,
  targetRoot: string,
): Promise<ProjectPackageSummary> {
  requireNative();
  try {
    return await invoke<ProjectPackageSummary>("import_project_package", {
      source: requireSelectedPath(source, "项目包导入"),
      targetRoot: requireSelectedPath(targetRoot, "恢复目录选择"),
    });
  } catch (error) {
    throw normalizeError(error);
  }
}
