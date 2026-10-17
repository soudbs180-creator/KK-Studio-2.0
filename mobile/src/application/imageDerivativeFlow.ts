import type { MobileRepository } from "../storage/repository.ts";
import type { MobileAsset } from "../core/mobileModel.ts";
import { invariant, LIMITS } from "../storage/validation.ts";
import {
  imageSizeFromBytes,
  boundedImageSize,
  type ImageSize,
} from "./imageDerivativeDimensions.ts";
export interface ImageCrop {
  originX: number;
  originY: number;
  width: number;
  height: number;
}
export interface ImageEditOptions {
  crop?: ImageCrop;
  rotation: number;
  resizeWidth?: number;
}
export interface ImageEditPlan extends ImageEditOptions {
  inputSize: ImageSize;
  outputSize: ImageSize;
}
export interface ImageRenderResult extends ImageSize {
  bytes: Uint8Array;
}
export interface ImageDerivativePreview extends ImageRenderResult {
  parentAssetId: string;
  parentSha256: string;
  parentName: string;
}
export type ImageRenderer = (
  bytes: Uint8Array,
  mime: string,
  plan: ImageEditPlan,
) => Promise<ImageRenderResult>;
export function checkImageEditScope(valid: () => boolean): void {
  invariant(valid(), "操作已取消或登录会话已变化；原件与输入保留。");
}
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
export function imageEditPlan(
  input: ImageSize,
  options: ImageEditOptions,
): ImageEditPlan {
  boundedImageSize(input);
  invariant(
    [0, 90, 180, 270].includes(options.rotation),
    "旋转角度必须为 0、90、180 或 270。",
  );
  const crop = options.crop ? { ...options.crop } : undefined;
  if (crop)
    invariant(
      Object.values(crop).every(Number.isInteger) &&
        crop.originX >= 0 &&
        crop.originY >= 0 &&
        crop.width > 0 &&
        crop.height > 0 &&
        crop.originX + crop.width <= input.width &&
        crop.originY + crop.height <= input.height,
      "裁剪坐标或尺寸超出原图，请修改输入后重新预览。",
    );
  let width = crop?.width ?? input.width,
    height = crop?.height ?? input.height;
  if (options.rotation === 90 || options.rotation === 270)
    [width, height] = [height, width];
  if (options.resizeWidth !== undefined) {
    invariant(
      Number.isInteger(options.resizeWidth) &&
        options.resizeWidth > 0 &&
        options.resizeWidth <= 4096,
      "输出宽度必须为 1–4096 像素。",
    );
    height = Math.max(1, Math.round((height * options.resizeWidth) / width));
    width = options.resizeWidth;
  }
  return {
    ...(crop ? { crop } : {}),
    rotation: options.rotation,
    ...(options.resizeWidth ? { resizeWidth: options.resizeWidth } : {}),
    inputSize: { ...input },
    outputSize: boundedImageSize({ width, height }, true),
  };
}
function checkResult(result: ImageRenderResult, expected: ImageSize) {
  boundedImageSize(result, true);
  invariant(
    result.bytes.length > 0 && result.bytes.length <= LIMITS.originalBytes,
    "派生图片超过存储上限，原件保留。",
  );
  const actual = imageSizeFromBytes(result.bytes, "image/png");
  invariant(
    actual.width === result.width &&
      actual.height === result.height &&
      actual.width === expected.width &&
      actual.height === expected.height,
    "派生图片尺寸与编辑计划不一致，原件和输入保留。",
  );
}
async function boundedRender(
  work: Promise<ImageRenderResult>,
): Promise<ImageRenderResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error("编辑预览超时，原件和编辑输入保留；可缩小图片后重试。"),
            ),
          30000,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
export async function prepareImageDerivative(
  repository: MobileRepository,
  assetId: string,
  options: ImageEditOptions,
  render: ImageRenderer,
  valid: () => boolean,
): Promise<ImageDerivativePreview> {
  const captured = {
    ...options,
    ...(options.crop ? { crop: { ...options.crop } } : {}),
  };
  checkImageEditScope(valid);
  const snapshot = await repository.load();
  checkImageEditScope(valid);
  const asset = snapshot.assets.find((a) => a.id === assetId);
  invariant(
    asset && !asset.deleting && asset.mime.startsWith("image/"),
    "可编辑的图片原件不存在。",
  );
  const bytes = await repository.readOriginal(assetId);
  checkImageEditScope(valid);
  const plan = imageEditPlan(imageSizeFromBytes(bytes, asset.mime), captured);
  const expectedSize = { ...plan.outputSize };
  const result = await boundedRender(render(bytes, asset.mime, plan));
  checkImageEditScope(valid);
  checkResult(result, expectedSize);
  invariant(
    !sameBytes(result.bytes, bytes),
    "编辑结果与原件相同，请调整参数后重新预览。",
  );
  return {
    ...result,
    bytes: result.bytes.slice(),
    parentAssetId: asset.id,
    parentSha256: asset.sha256,
    parentName: asset.name,
  };
}
export async function saveImageDerivative(
  repository: MobileRepository,
  candidate: ImageDerivativePreview,
  valid: () => boolean,
): Promise<MobileAsset> {
  const preview = { ...candidate, bytes: candidate.bytes.slice() };
  checkImageEditScope(valid);
  checkResult(preview, preview);
  const snapshot = await repository.load();
  checkImageEditScope(valid);
  const parent = snapshot.assets.find((a) => a.id === preview.parentAssetId);
  invariant(
    parent && !parent.deleting && parent.sha256 === preview.parentSha256,
    "父原件已变化，不能保存此预览。",
  );
  const original = await repository.readOriginal(parent.id);
  checkImageEditScope(valid);
  invariant(!sameBytes(preview.bytes, original), "派生图片不能与原件相同。");
  const saved = await repository.storeOriginal({
    bytes: preview.bytes,
    mime: "image/png",
    name: `${parent.name.slice(0, 170)}-edited.png`,
    parentAssetId: parent.id,
    provenance: { source: "derivative" },
  });
  invariant(
    saved.parentAssetId === parent.id &&
      saved.provenance.source === "derivative",
    "此结果已存在为其他原件，未创建新的派生关系；请调整编辑参数。",
  );
  return saved;
}
