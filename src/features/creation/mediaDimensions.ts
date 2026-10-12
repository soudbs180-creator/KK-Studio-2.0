export interface MediaDimensions {
  width: number;
  height: number;
}

export function dimensionsFromImageSize(
  value?: string,
): MediaDimensions | undefined {
  if (!value) return undefined;
  const match = /^(\d{2,5})x(\d{2,5})$/.exec(value.trim());
  if (!match) return undefined;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 1 && height > 1 ? { width, height } : undefined;
}

export function readImageDimensions(source: string): Promise<MediaDimensions> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve({ width: 1, height: 1 });
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || 1,
        height: image.naturalHeight || 1,
      });
    image.onerror = () => resolve({ width: 1, height: 1 });
    image.src = source;
  });
}
