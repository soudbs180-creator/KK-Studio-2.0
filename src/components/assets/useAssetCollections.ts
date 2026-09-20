import { useState } from "react";
import { BROWSER_STORAGE_KEYS } from "../../runtime/storage-contract";

export default function useAssetCollections(
  onError: (message: string) => void,
) {
  const [ids, setIds] = useState<Set<string>>(() => {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem(BROWSER_STORAGE_KEYS.assetCollections) ?? "[]",
      );
      return new Set(
        Array.isArray(value)
          ? value.filter((id): id is string => typeof id === "string")
          : [],
      );
    } catch {
      return new Set<string>();
    }
  });
  function toggle(id: string): void {
    const next = new Set(ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      localStorage.setItem(
        BROWSER_STORAGE_KEYS.assetCollections,
        JSON.stringify([...next]),
      );
    } catch {
      onError("集合保存失败；本次会话仍可用。");
    }
    setIds(next);
  }
  return { collectionIds: ids, toggleCollection: toggle };
}
