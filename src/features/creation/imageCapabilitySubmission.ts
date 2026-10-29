import {
  imageCapabilitySchema,
  type ImageCapabilitySpec,
  type CreateProjectInput,
} from "../../../packages/creation-contracts/index.ts";
import {
  isConnectionReady,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import { isLocalProviderUrl } from "../../domain/providerUrl.ts";
import {
  protocolBindingMatches,
  isProviderAuthAllowed,
  type ProviderProtocol,
  type ProviderAuthMode,
} from "../../domain/providerProtocol.ts";
import type { CapabilityAsset } from "../../../packages/creation-contracts/index.ts";

export type ImageCapabilityBinding = {
  imageCapability?: ImageCapabilitySpec;
  baseUrl?: string;
  credentialRef?: string;
  model?: string;
  referenceCount: number;
  outputCount?: number;
  protocol?: ProviderProtocol;
  authMode?: ProviderAuthMode;
};

/** Dedicated local workflow binding; it cannot make an ordinary BYOK request local. */
export function assertImageCapabilityConnection(
  connection: ProviderConnection,
  binding: ImageCapabilityBinding,
  options: {
    ownSlot?: boolean;
    skipCapacity?: boolean;
    explicitRetry?: boolean;
  } = {},
): ProviderConnection {
  assertLocalImageConnectionIdentity(connection, binding);
  const spec = imageCapabilitySchema.parse(binding.imageCapability);
  const count =
    spec.capabilityId === "image.layer-split"
      ? spec.parameters.layers.length
      : 1;
  if (
    spec.adapter !== "comfyui" ||
    !connection.capabilities.modalities.includes("image") ||
    !connection.capabilities.operations.includes("generate") ||
    count > (connection.capabilities.maxOutputs ?? 16) ||
    !binding.model ||
    binding.referenceCount !== 1 ||
    binding.outputCount !== count
  )
    throw new Error(
      "图片能力的原绑定、原件数量或本地工作流适配器不可用，未提交。",
    );
  const health =
    options.explicitRetry && connection.state === "degraded"
      ? { ...connection, state: "active" as const }
      : connection;
  if (!isConnectionReady(health))
    throw new Error("能力连接不可用、隔离或冷却中，未提交。");
  if (
    !options.skipCapacity &&
    Math.max(0, (connection.activeJobs ?? 0) - (options.ownSlot ? 1 : 0)) >=
      connection.concurrencyLimit
  )
    throw new Error("能力连接并发已满，请等待原任务结束。");
  return connection;
}

export async function prepareImageCapabilityInput(
  input: CreateProjectInput,
  read: (id: string) => Promise<CapabilityAsset | null>,
  platform: "web" | "desktop",
): Promise<CreateProjectInput> {
  const spec = imageCapabilitySchema.parse(input.imageCapability);
  if (platform !== "web")
    throw new Error("此图片能力尚未接入原生TaskHost，当前未提交。");
  if (spec.adapter !== "comfyui")
    throw new Error("此图片能力的API适配器尚未配置，当前未提交。");
  if (input.kind !== "image" || input.imageEdit || !input.providerConnectionId)
    throw new Error("图片能力需要明确原连接，不能与局部重绘混用。");
  const count = spec.workflow.outputNodeIds.length;
  if (input.outputCount !== undefined && input.outputCount !== count)
    throw new Error("能力输出数量与工作流不一致。");
  const original = await read(spec.sourceAssetId);
  if (
    !original ||
    original.assetId !== spec.sourceAssetId ||
    !/^image\/(png|jpeg|webp)$/.test(original.mime) ||
    !original.preview.startsWith(`data:${original.mime};base64,`)
  )
    throw new Error("能力原图尚未归档或已丢失，未提交。");
  const encoded = original.preview.split(",")[1];
  return {
    ...input,
    imageCapability: spec,
    outputCount: count,
    attachments: [
      {
        id: spec.sourceAssetId,
        assetId: spec.sourceAssetId,
        originalAssetId: spec.sourceAssetId,
        name: "original",
        mime: original.mime,
        size: atob(encoded).length,
      },
    ],
  };
}

function assertLocalImageConnectionIdentity(
  connection: ProviderConnection,
  binding: ImageCapabilityBinding,
): void {
  if (
    connection.kind !== "local_comfyui" ||
    !isLocalProviderUrl(connection.baseUrl ?? "") ||
    !isProviderAuthAllowed({
      ...connection,
      baseUrl: connection.baseUrl ?? "",
    }) ||
    connection.authMode !== "none" ||
    connection.baseUrl?.replace(/\/$/, "") !==
      binding.baseUrl?.replace(/\/$/, "") ||
    connection.credentialRef !== binding.credentialRef ||
    !protocolBindingMatches(
      { ...connection, baseUrl: connection.baseUrl ?? "" },
      { ...binding, baseUrl: binding.baseUrl ?? "" },
    )
  )
    throw new Error("图片能力原绑定身份或本地认证不可用，未提交。");
}
