import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { GeminiApiAdapter } from "./geminiApiAdapter.ts";
import { LocalComfyUiAdapter } from "./localComfyUiAdapter.ts";
import {
  OpenAiImageAdapter,
  type OpenAiImageGenerator,
} from "./openAiImageAdapter.ts";
import {
  TwelveAiTaskAdapter,
  type TwelveAiTaskAdapterOptions,
} from "./twelveAiTaskAdapter.ts";
import { twelveAiApiBase } from "./twelveAiTaskProtocol.ts";
import type { GenerationProviderAdapter } from "./providerAdapter.ts";

/**
 * Keeps provider selection out of canvas components. Unknown or experimental
 * connections stay disabled until a reviewed adapter is added.
 */
export function createGenerationAdapter(
  connection: ProviderConnection,
  options?: TwelveAiTaskAdapterOptions & {
    generateImages?: OpenAiImageGenerator;
  },
): GenerationProviderAdapter | null {
  if (connection.state === "disabled" || connection.state === "quarantined")
    return null;
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
    return options?.generateImages
      ? new OpenAiImageAdapter(connection, options.generateImages)
      : null;
  return null;
}
