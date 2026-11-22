import type { ProviderConnection } from "../../domain/providerConnections.ts";
import {
  createGenerationAdapter,
  type GenerationAdapterFactoryOptions,
} from "../../integrations/generation/providerAdapterFactory.ts";
import { readFastVideoRuntimeSettings } from "./fastVideoRuntimeSettings.ts";

/** Features-layer wrapper that injects saved FastVideo runtime settings. */
export function createGenerationAdapterWithRuntimeSettings(
  connection: ProviderConnection,
  options?: GenerationAdapterFactoryOptions,
) {
  const settings = readFastVideoRuntimeSettings();
  return createGenerationAdapter(connection, {
    ...options,
    fastVideoOutputDirectory:
      options?.fastVideoOutputDirectory ?? settings.outputDirectory,
    fastVideoModelId: options?.fastVideoModelId ?? settings.modelId,
  });
}
