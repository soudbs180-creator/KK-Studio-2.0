// Public contract entry for feature: projects
export { default as ProjectPackageActions } from "./ProjectPackageActions.tsx";
export { NativeProjectPackageError, exportNativeProjectPackage, openRestoredProjectPackage, preflightNativeProjectPackage, importNativeProjectPackage } from "./nativeProjectPackageAdapter.ts";
export type { ProjectPackageOperationState, ProjectPackageSummary } from "./nativeProjectPackageAdapter.ts";
export { applyProjectLifecycle } from "./projectLifecycle.ts";
export type { ProjectLifecycleAction, ProjectLibraryActions } from "./projectLifecycle.ts";
export { ProjectPackageError, canonicalJson, sha256Hex, manifestChecksum, collectReferencedAssetIds, createProjectPackageManifest, preflightProjectPackage } from "./projectPackage.ts";
export type { ProjectPackageErrorCode, PortableAssetMetadata, ProjectPackageAssetEntry, ProjectPackageManifestV1, ProjectPackageInput, ProjectPackagePreflight } from "./projectPackage.ts";
export { sortSidebarProjects, resolveSidebarFolders, restoreSidebarFolder, SIDEBAR_PROJECT_DRAG_TYPE, SIDEBAR_PROJECT_TITLE_TYPE, PROJECT_THUMB_COLORS, randomProjectColor, projectColor, sidebarProjectItem, createSidebarId } from "./sidebarProjectModel.ts";
export type { SidebarSortMode, SidebarProjectVisual, SidebarProjectItem, SidebarFolderItem } from "./sidebarProjectModel.ts";
export { useProjectLibrary } from "./useProjectLibrary.ts";
