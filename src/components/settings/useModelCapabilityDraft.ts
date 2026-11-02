import { useRef, useState } from "react";
import type { CatalogModel, ModelKind } from "../../features/models/index.ts";
import { imageCapabilityDraft } from "./ImageModelCapabilityFields";

function valuesFrom(model?: CatalogModel) {
  return {
    kind: model?.kind ?? ("text" as ModelKind),
    sizes: model?.sizes?.join(", ") ?? "",
    family: model?.family ?? "",
    variant: model?.variant ?? "",
    aliases: model?.aliases?.join(", ") ?? "",
    image: imageCapabilityDraft(model?.image),
  };
}

export default function useModelCapabilityDraft(key: string, model?: CatalogModel) {
  const values = valuesFrom(model);
  const signature = JSON.stringify(values);
  type Draft = { key: string; signature: string; values: typeof values; dirty: boolean };
  const drafts = useRef(new Map<string, Draft>());
  let [draft, setDraft] = useState<Draft>({ key, signature, values, dirty: false });
  if (draft.key !== key || draft.signature !== signature) {
    const cached = drafts.current.get(key);
    draft = cached?.dirty
      ? { ...cached, signature }
      : { key, signature, values, dirty: false };
    setDraft(draft);
  }
  return {
    value: draft.values,
    update(patch: Partial<typeof values>) {
      setDraft((current) => {
        const next = { ...current, values: { ...current.values, ...patch }, dirty: true };
        drafts.current.set(key, next);
        return next;
      });
    },
    saved() {
      drafts.current.delete(key);
      setDraft((current) => ({ ...current, dirty: false }));
    },
  };
}
