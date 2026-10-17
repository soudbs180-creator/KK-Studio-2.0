import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import type { ImageRenderer } from "./imageDerivativeFlow.ts";
import { invariant, LIMITS } from "../storage/validation.ts";

/** Only disposable cache copies are changed; original storage is never a render target. */
export const renderImageDerivative: ImageRenderer = async (
  bytes,
  mime,
  plan,
) => {
  const suffix =
    mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const source = new File(
    Paths.cache,
    `kk-edit-${Crypto.randomUUID()}.${suffix}`,
  );
  let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
  let output: File | undefined,
    rendered:
      | Awaited<
          ReturnType<
            ReturnType<typeof ImageManipulator.manipulate>["renderAsync"]
          >
        >
      | undefined;
  try {
    source.create();
    source.write(bytes);
    context = ImageManipulator.manipulate(source.uri);
    if (plan.crop) context.crop(plan.crop);
    if (plan.rotation) context.rotate(plan.rotation);
    if (plan.resizeWidth) context.resize(plan.outputSize);
    rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      format: SaveFormat.PNG,
      compress: 1,
    });
    output = new File(result.uri);
    invariant(
      output.size > 0 && output.size <= LIMITS.originalBytes,
      "派生图片超过存储上限，原件保留。",
    );
    return {
      bytes: await output.bytes(),
      width: result.width,
      height: result.height,
    };
  } finally {
    rendered?.release();
    context?.release();
    if (output?.exists) output.delete();
    if (source.exists) source.delete();
  }
};
