import { useEffect, useMemo, useState } from "react";
import {
  MODEL_PROVIDER_STORAGE_KEY,
  parseModelProvider,
} from "../domain/modelProvider";
import {
  loadProviderConnectionsDurable,
  persistProviderConnectionsDurable,
  readProviderConnections,
} from "../features/creation/index.ts";

export function useHomeModelConfig() {
  const [providerVersion, setProviderVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const native = await loadProviderConnectionsDurable();
        if (!active) return;
        if (native) {
          setProviderVersion((value) => value + 1);
        } else {
          const local = readProviderConnections();
          if (local.length > 0) {
            await persistProviderConnectionsDurable(local);
          }
        }
      } catch (error) {
        console.warn(
          "[App] Failed to synchronize durable provider connections:",
          error,
        );
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const syncProvider = () => setProviderVersion((value) => value + 1);
    window.addEventListener("kk:model-provider-changed", syncProvider);
    return () =>
      window.removeEventListener("kk:model-provider-changed", syncProvider);
  }, []);
  return useMemo(() => {
    void providerVersion;
    try {
      const profile = parseModelProvider(
        localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
      ).profile;
      const connection = readProviderConnections().find(
        (item) =>
          Boolean(item.model?.trim()) &&
          item.state !== "disabled" &&
          item.capabilities.modalities.includes("image"),
      );
      const model = profile.model.trim() || connection?.model?.trim() || "";
      return { model, configured: Boolean(model) };
    } catch (error) {
      console.warn("[App] Failed to resolve home model config:", error);
      return { model: "", configured: false };
    }
  }, [providerVersion]);
}
