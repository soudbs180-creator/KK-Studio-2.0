import type { ModelSelection } from "../../domain/modelSelection.ts";
import { readProviderConnections } from "../../integrations/providers/providerStore.ts";
import { useModelCapabilityUpdates } from "../../runtime/modelCapabilityUpdates.ts";
import { imageCapabilitiesForSelection } from "./imageModelCapabilities.ts";

export function useImageModelCapabilities(selection: ModelSelection) {
  return useModelCapabilityUpdates(selection, (value) =>
    imageCapabilitiesForSelection(value, readProviderConnections()),
  );
}
