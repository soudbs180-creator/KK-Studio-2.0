import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { GeminiApiAdapter } from "./geminiApiAdapter.ts";
import { LocalComfyUiAdapter } from "./localComfyUiAdapter.ts";
import { OpenAiImageAdapter } from "./openAiImageAdapter.ts";
import type { GenerationProviderAdapter } from "./providerAdapter.ts";

/**
 * Keeps provider selection out of canvas components. Unknown or experimental
 * connections stay disabled until a reviewed adapter is added.
 */
export function createGenerationAdapter(
  connection: ProviderConnection,
): GenerationProviderAdapter | null {
  if (connection.state === "disabled" || connection.state === "quarantined")
    return null;
  if (connection.kind === "local_comfyui")
    return new LocalComfyUiAdapter(connection);
  const provider =
    `${connection.provider} ${connection.baseUrl ?? ""}`.toLowerCase();
  if (provider.includes("gemini") || provider.includes("generativelanguage"))
    return new GeminiApiAdapter(connection);
  if (connection.capabilities.modalities.includes("image"))
    return new OpenAiImageAdapter(connection);
  return null;
}
