import type { ImageRenderer } from "./imageDerivativeFlow.ts";
import { invariant, LIMITS } from "../storage/validation.ts";

/** Browser canvas edits verified local bytes only, without remote image/CORS access. */
export const renderImageDerivative: ImageRenderer = async (
  bytes,
  mime,
  plan,
) => {
  invariant(
    typeof createImageBitmap === "function",
    "此浏览器没有本地图片解码能力，请使用原生手机版编辑。",
  );
  const bitmap = await createImageBitmap(
    new Blob([new Uint8Array(bytes)], { type: mime }),
  );
  const canvas = document.createElement("canvas");
  try {
    invariant(
      bitmap.width === plan.inputSize.width &&
        bitmap.height === plan.inputSize.height,
      "此图片的方向元数据尚未适配；原件保留，可先导出为 PNG 后编辑。",
    );
    const crop = plan.crop ?? { originX: 0, originY: 0, ...plan.inputSize };
    canvas.width = plan.outputSize.width;
    canvas.height = plan.outputSize.height;
    const context = canvas.getContext("2d");
    invariant(context, "此浏览器无法执行本地编辑，请使用原生手机版。");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((plan.rotation * Math.PI) / 180);
    const sideways = plan.rotation === 90 || plan.rotation === 270;
    const width = sideways ? canvas.height : canvas.width;
    const height = sideways ? canvas.width : canvas.height;
    context.drawImage(
      bitmap,
      crop.originX,
      crop.originY,
      crop.width,
      crop.height,
      -width / 2,
      -height / 2,
      width,
      height,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("派生图片编码失败，原件和参数保留。")),
        "image/png",
      ),
    );
    invariant(
      blob.size > 0 && blob.size <= LIMITS.originalBytes,
      "派生图片超过存储上限，原件保留。",
    );
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      ...plan.outputSize,
    };
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
};
