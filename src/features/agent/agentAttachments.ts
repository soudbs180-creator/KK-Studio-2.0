import type { CreationAttachment } from "../creation/model.ts";
import { loadStoredAsset } from "../creation/assetRepository.ts";
import type { AgentTurnInput } from "./agentTypes.ts";

export const MAX_AGENT_ATTACHMENTS = 6;
export const MAX_AGENT_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_AGENT_ATTACHMENT_PAYLOAD = 28 * 1024 * 1024;
export type AgentDraftAttachment = CreationAttachment & {
  canvasNodeId?: string;
};
export type AgentImageAttachment = NonNullable<
  AgentTurnInput["attachments"]
>[number];

/** Read the selected immutable original; never fetch a canvas URL or use a missing original's thumbnail. */
export async function prepareAgentAttachments(
  inputs: AgentDraftAttachment[],
  options: {
    signal: AbortSignal;
    read?: typeof loadStoredAsset;
    inspect?: typeof inspectAgentImage;
  },
): Promise<AgentImageAttachment[]> {
  const selected = inputs.map((item) => ({ ...item }));
  if (selected.length > MAX_AGENT_ATTACHMENTS)
    throw new Error("Agent 最多添加 6 张参考图片。");
  const output: AgentImageAttachment[] = [];
  const seen = new Set<string>();
  for (const item of selected) {
    options.signal.throwIfAborted();
    if (
      !item.id ||
      item.id.length > 200 ||
      !item.name.trim() ||
      item.name.length > 500
    )
      throw new Error("图片名称或标识无效，请重新选择。");
    let dataUrl = item.dataUrl;
    if (item.assetId) {
      if (
        dataUrl?.startsWith("kk-asset:") &&
        dataUrl !== `kk-asset:${item.assetId}`
      )
        throw new Error("参考素材引用与身份不一致，请重新选择。");
      const asset = await (options.read ?? loadStoredAsset)(item.assetId);
      options.signal.throwIfAborted();
      if (!asset || asset.assetId !== item.assetId || asset.mime !== item.mime)
        throw new Error("参考图片原件缺失或身份不一致，请重新导入。");
      dataUrl = asset.preview;
    }
    const match = dataUrl?.match(
      /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!match || match[1] !== item.mime || match[2].length % 4 !== 0)
      throw new Error("参考图片格式无效，未发送，请重新选择。");
    const size =
      (match[2].length / 4) * 3 -
      (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
    if (!size || size > MAX_AGENT_IMAGE_BYTES)
      throw new Error("单张参考图片必须在 1 字节至 8 MiB 之间。");
    if (seen.has(dataUrl!)) continue;
    seen.add(dataUrl!);
    const dimensions = await (options.inspect ?? inspectAgentImage)(
      dataUrl!,
      options.signal,
    );
    options.signal.throwIfAborted();
    if (
      !Number.isSafeInteger(dimensions.width) ||
      !Number.isSafeInteger(dimensions.height) ||
      dimensions.width <= 0 ||
      dimensions.height <= 0 ||
      dimensions.width * dimensions.height > 100_000_000
    )
      throw new Error("参考图片尺寸无效或过大，请重新选择。");
    output.push({
      id: item.id,
      name: item.name,
      type: item.mime,
      size,
      ...dimensions,
      dataUrl: dataUrl!,
    });
    if (
      new TextEncoder().encode(JSON.stringify(output)).byteLength >
      MAX_AGENT_ATTACHMENT_PAYLOAD
    )
      throw new Error("参考图片编码后合计超过 28 MiB，请减少图片后重试。");
  }
  return output;
}

function inspectAgentImage(
  dataUrl: string,
  signal: AbortSignal,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      image.onload = image.onerror = null;
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      image.src = "";
      if (error) reject(error);
      else resolve(dimensions);
    };
    const abort = () => finish(new Error("图片读取已取消，草稿已保留。"));
    const timer = setTimeout(
      () => finish(new Error("图片读取超时，请重试。")),
      15000,
    );
    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => finish();
    image.onerror = () => finish(new Error("图片内容无法解码，请重新选择。"));
    image.src = dataUrl;
  });
}
