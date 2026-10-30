import { z } from "zod";
import {
  imageCapabilitySchema,
  bindImageCapabilityWorkflow,
} from "../../../packages/creation-contracts/index.ts";
import type { GenerationRequest } from "./providerAdapter.ts";

const uploaded = z.object({
  name: z.string().min(1).max(200),
  subfolder: z.string().max(200).default(""),
  type: z.literal("input"),
});

/** Standard ComfyUI upload + explicit API graph binding; no image algorithm is reimplemented. */
export async function prepareComfyImageCapability(
  base: string,
  request: GenerationRequest,
) {
  const spec = imageCapabilitySchema.parse(request.imageCapability);
  if (spec.adapter !== "comfyui")
    throw new Error("此能力没有可用的API适配器，当前未提交。");
  const source = request.attachments.find(
    (a) => a.assetId === spec.sourceAssetId,
  );
  if (
    request.attachments.length !== 1 ||
    !source?.dataUrl ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      source.dataUrl,
    )
  )
    throw new Error("能力原件缺失或未解析，当前未上传或提交。");
  request.signal.throwIfAborted();
  if (!source.dataUrl.startsWith(`data:${source.mime};base64,`))
    throw new Error("能力原件类型不一致，未上传。");
  const data = source.dataUrl.split(",")[1];
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  if (!bytes.byteLength || bytes.byteLength > 32 * 1024 * 1024)
    throw new Error("能力原件超过大小上限。");
  const form = new FormData();
  form.append(
    "image",
    new Blob([bytes], { type: source.mime }),
    `${spec.sourceAssetId}.${source.mime === "image/jpeg" ? "jpg" : source.mime.split("/")[1]}`,
  );
  form.append("type", "input");
  form.append("overwrite", "false");
  const response = await fetch(`${base}/upload/image`, {
    method: "POST",
    body: form,
    credentials: "omit",
    redirect: "error",
    signal: request.signal,
  });
  if (!response.ok)
    throw new Error(
      `ComfyUI原件上传失败（HTTP ${response.status}），未提交推理。`,
    );
  const result = uploaded.parse(await response.json());
  const parts = [result.subfolder, result.name].filter(Boolean);
  if (
    parts.some(
      (v) =>
        v.includes("\\") ||
        v.startsWith("/") ||
        v.split("/").some((p) => !p || p === ".." || p === ".") ||
        /[:?%#\p{Cc}]/u.test(v),
    )
  )
    throw new Error("ComfyUI返回的原件路径不安全，未提交推理。");
  request.signal.throwIfAborted();
  return {
    workflow: bindImageCapabilityWorkflow(
      spec,
      parts.join("/"),
      request.prompt,
    ),
    outputNodeIds: spec.workflow.outputNodeIds,
  };
}
