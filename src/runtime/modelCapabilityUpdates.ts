import { useEffect, useState } from "react";
import type { ModelSelection } from "../../packages/creation-contracts/index.ts";

/** Shared browser notification lifecycle; the composition root supplies the resolver. */
export function useModelCapabilityUpdates<T>(
  selection: ModelSelection,
  resolve: (selection: ModelSelection) => T,
): T {
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
  return resolve(selection);
}
