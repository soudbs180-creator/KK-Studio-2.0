export type ImageSizeReader = (
  uri: string,
  success: (width: number, height: number) => void,
  failure: (error: unknown) => void,
) => void;
export function imageEventRatio(event: {
  nativeEvent: { source?: { width: number; height: number } };
}): number | undefined {
  const source = event.nativeEvent?.source;
  if (
    !source ||
    !Number.isFinite(source.width) ||
    !Number.isFinite(source.height) ||
    source.width <= 0 ||
    source.height <= 0
  )
    return undefined;
  const ratio = source.width / source.height;
  return Number.isFinite(ratio) ? ratio : undefined;
}
export async function loadPreviewImage(
  uri: string,
  getSize: ImageSizeReader,
  isCurrent: () => boolean,
) {
  const size = await new Promise<{ width: number; height: number }>(
    (resolve, reject) =>
      getSize(uri, (width, height) => resolve({ width, height }), reject),
  );
  if (!isCurrent()) return undefined;
  if (imageEventRatio({ nativeEvent: { source: size } }) === undefined)
    throw new Error("无法读取原图尺寸，原件保留。");
  return size;
}
