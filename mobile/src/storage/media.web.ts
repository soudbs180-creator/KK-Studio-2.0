import * as DocumentPicker from "expo-document-picker";
import type { MobileRepository } from "./repository.ts";
import type { MobileAsset } from "../core/mobileModel.ts";
import { invariant, LIMITS } from "./validation.ts";

async function selected(type: string): Promise<globalThis.File | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type,
    multiple: false,
    base64: false,
  });
  if (picked.canceled) return null;
  const file = picked.assets[0].file;
  invariant(file, "Browser picker did not return readable bytes");
  return file;
}
async function importFile(
  repository: MobileRepository,
  type: string,
): Promise<MobileAsset | null> {
  const file = await selected(type);
  if (!file) return null;
  invariant(
    file.size > 0 && file.size <= LIMITS.originalBytes,
    "Original exceeds limit",
  );
  return repository.storeOriginal({
    bytes: new Uint8Array(await file.arrayBuffer()),
    mime: file.type || "application/octet-stream",
    name: file.name,
    provenance: { source: "import" },
  });
}
export function importDocument(
  repository: MobileRepository,
): Promise<MobileAsset | null> {
  return importFile(repository, "*/*");
}
export function importImage(
  repository: MobileRepository,
): Promise<MobileAsset | null> {
  return importFile(repository, "image/*");
}
function download(bytes: Uint8Array, mime: string, name: string): void {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: mime }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function shareOriginal(
  repository: MobileRepository,
  assetId: string,
): Promise<void> {
  const s = await repository.load(),
    asset = s.assets.find((a) => a.id === assetId);
  invariant(asset, "Original metadata missing");
  download(await repository.readOriginal(assetId), asset.mime, asset.name);
}
export async function shareBackup(
  repository: MobileRepository,
  projectId: string,
): Promise<void> {
  download(
    new TextEncoder().encode(await repository.backup(projectId)),
    "application/json",
    "kk-project.json",
  );
}
export async function pickBackup(): Promise<string | null> {
  const file = await selected("application/json");
  if (!file) return null;
  invariant(file.size <= LIMITS.backupBytes, "Backup exceeds limit");
  return file.text();
}
export async function createImageDerivative(
  repository: MobileRepository,
  assetId: string,
  width: number,
): Promise<MobileAsset> {
  invariant(
    Number.isInteger(width) && width >= 1 && width <= 4096,
    "Derivative width must be 1–4096",
  );
  const s = await repository.load(),
    asset = s.assets.find((a) => a.id === assetId);
  invariant(
    asset && asset.mime.startsWith("image/"),
    "Image original required",
  );
  const bitmap = await createImageBitmap(
    new Blob([new Uint8Array(await repository.readOriginal(assetId))], {
      type: asset.mime,
    }),
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.max(
    1,
    Math.round((bitmap.height * width) / bitmap.width),
  );
  const context = canvas.getContext("2d");
  invariant(context, "Image editing unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Derivative encoding failed")),
      "image/png",
    ),
  );
  return repository.storeOriginal({
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mime: "image/png",
    name: `${asset.name}-resized.png`,
    parentAssetId: assetId,
    provenance: { source: "derivative" },
  });
}
