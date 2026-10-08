import { useEffect, useState } from "react";
import type { ModelSelection } from "../../domain/modelSelection";
import { readProviderConnections } from "../creation/providerRegistry";
import { imageCapabilitiesForSelection } from "./imageModelCapabilities";

/** Settings saves and other-window catalog writes refresh every consumer. */
export function useImageModelCapabilities(selection: ModelSelection) {
  const [, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    window.addEventListener("kk:model-provider-changed", changed);
    window.addEventListener("storage", changed);
    return () => {
      window.removeEventListener("kk:model-provider-changed", changed);
      window.removeEventListener("storage", changed);
    };
  }, []);
  return imageCapabilitiesForSelection(selection, readProviderConnections());
}
