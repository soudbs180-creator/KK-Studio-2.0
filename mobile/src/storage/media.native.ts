import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import * as Crypto from "expo-crypto";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import type { MobileAsset } from "../core/mobileModel.ts";
import type { MobileRepository } from "./repository.ts";
import { invariant, LIMITS } from "./validation.ts";

export async function importDocument(
  repository: MobileRepository,
): Promise<MobileAsset | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (picked.canceled) return null;
  const a = picked.assets[0],
    file = new File(a.uri);
  invariant(
    file.size > 0 && file.size <= LIMITS.originalBytes,
    "Selected file exceeds original limit",
  );
  return repository.storeOriginal({
    bytes: await file.bytes(),
    mime: a.mimeType || "application/octet-stream",
    name: a.name,
    provenance: { source: "import" },
  });
}
/** Editing is disabled in the picker so the imported original is not cropped. */
export async function importImage(
  repository: MobileRepository,
): Promise<MobileAsset | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (picked.canceled) return null;
  const a = picked.assets[0],
    file = new File(a.uri);
  invariant(
    file.size > 0 && file.size <= LIMITS.originalBytes,
    "Selected image exceeds original limit",
  );
  return repository.storeOriginal({
    bytes: await file.bytes(),
    mime: a.mimeType || file.type || "application/octet-stream",
    name: a.fileName || "image",
    provenance: { source: "import" },
  });
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
  const snapshot = await repository.load(),
    asset = snapshot.assets.find((a) => a.id === assetId);
  invariant(
    asset && asset.mime.startsWith("image/"),
    "Image original required",
  );
  const input = new File(Paths.cache, `${Crypto.randomUUID()}.source`);
  input.create();
  input.write(await repository.readOriginal(assetId));
  const context = ImageManipulator.manipulate(input.uri);
  context.resize({ width });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.PNG,
    compress: 1,
  });
  const file = new File(result.uri);
  invariant(
    file.size <= LIMITS.originalBytes,
    "Derivative exceeds original limit",
  );
  return repository.storeOriginal({
    bytes: await file.bytes(),
    mime: "image/png",
    name: `${asset.name}-resized.png`,
    parentAssetId: assetId,
    provenance: { source: "derivative" },
  });
}
function extension(mime: string): string {
  return (
    (
      {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "application/pdf": ".pdf",
        "text/plain": ".txt",
      } as Record<string, string>
    )[mime] || ".bin"
  );
}
export async function shareOriginal(
  repository: MobileRepository,
  assetId: string,
): Promise<void> {
  invariant(await Sharing.isAvailableAsync(), "Native sharing unavailable");
  const snapshot = await repository.load(),
    asset = snapshot.assets.find((a) => a.id === assetId);
  invariant(asset, "Original metadata missing");
  const file = new File(
    Paths.cache,
    `${Crypto.randomUUID()}${extension(asset.mime)}`,
  );
  file.create();
  file.write(await repository.readOriginal(assetId));
  await Sharing.shareAsync(file.uri, { mimeType: asset.mime });
}
export async function shareBackup(
  repository: MobileRepository,
  projectId: string,
): Promise<void> {
  invariant(await Sharing.isAvailableAsync(), "Native sharing unavailable");
  const payload = await repository.backup(projectId),
    file = new File(Paths.cache, `kk-project-${Crypto.randomUUID()}.json`);
  file.create();
  file.write(payload);
  await Sharing.shareAsync(file.uri, { mimeType: "application/json" });
}
export async function pickBackup(): Promise<string | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    multiple: false,
    copyToCacheDirectory: true,
    type: "application/json",
  });
  if (picked.canceled) return null;
  const file = new File(picked.assets[0].uri);
  invariant(
    file.size > 0 && file.size <= LIMITS.backupBytes,
    "Backup exceeds limit",
  );
  return file.text();
}
