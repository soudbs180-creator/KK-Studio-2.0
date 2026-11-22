import type { ProviderConnection } from "../../domain/providerConnections.ts";
import {
  createFastVideoAdapter,
  isFastVideoConnection,
  type FastVideoRunner,
} from "./fastVideoAdapter.ts";
import { GeminiApiAdapter } from "./geminiApiAdapter.ts";
import { LocalComfyUiAdapter } from "./localComfyUiAdapter.ts";
import { OpenAiImageAdapter } from "./openAiImageAdapter.ts";
import {
  TwelveAiTaskAdapter,
  type TwelveAiTaskAdapterOptions,
} from "./twelveAiTaskAdapter.ts";
import { twelveAiApiBase } from "./twelveAiTaskProtocol.ts";
import type { GenerationProviderAdapter } from "./providerAdapter.ts";

export type GenerationAdapterFactoryOptions = TwelveAiTaskAdapterOptions & {
  fastVideoRunner?: FastVideoRunner;
  fastVideoOutputDirectory?: string;
  fastVideoModelId?: string;
};

/**
 * Keeps provider selection out of canvas components. Unknown or experimental
 * connections stay disabled until a reviewed adapter is added.
 */
export function createGenerationAdapter(
  connection: ProviderConnection,
  options?: GenerationAdapterFactoryOptions,
): GenerationProviderAdapter | null {
  if (connection.state === "disabled" || connection.state === "quarantined")
    return null;
  if (isFastVideoConnection(connection)) {
    return createFastVideoAdapter({
      connection,
      outputDirectory: options?.fastVideoOutputDirectory ?? "fastvideo-output",
      ...(options?.fastVideoModelId
        ? { modelId: options.fastVideoModelId }
        : {}),
      ...(options?.fastVideoRunner
        ? { runner: options.fastVideoRunner }
        : {}),
    });
  }
  if (connection.kind === "local_comfyui")
    return new LocalComfyUiAdapter(connection);
  if (twelveAiApiBase(connection.baseUrl)) {
    try {
      return new TwelveAiTaskAdapter(connection, options);
    } catch {
      return null;
    }
  }
  const provider =
    `${connection.provider} ${connection.baseUrl ?? ""}`.toLowerCase();
  if (provider.includes("gemini") || provider.includes("generativelanguage"))
    return new GeminiApiAdapter(connection);
  if (connection.capabilities.modalities.includes("image"))
    return new OpenAiImageAdapter(connection);
  return null;
}
