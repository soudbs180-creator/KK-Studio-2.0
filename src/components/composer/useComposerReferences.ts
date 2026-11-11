import { useEffect, useMemo, useRef } from "react";
import {
  composerReferenceTokens,
  reconcileComposerReferences,
  type ComposerReference,
} from "../../features/prompts/index.ts";
import type { CreationAttachment } from "../../features/creation/index.ts";
export function useComposerReferences(
  value: string,
  onChange: (value: string) => void,
  attachments: readonly CreationAttachment[],
  entries?: readonly ComposerReference[],
) {
  const references = useMemo(
    () =>
      entries ??
      attachments.map((a) => ({
        id: a.id,
        name: a.name,
        slot: a.role,
        assetId: a.assetId,
      })),
    [entries, attachments],
  );
  const parsed = useMemo(
    () => composerReferenceTokens(value, references),
    [value, references],
  );
  const previous = useRef(references);
  useEffect(() => {
    const next = reconcileComposerReferences(
      value,
      previous.current,
      references,
    );
    previous.current = references;
    if (next !== value) onChange(next);
  }, [value, references, onChange]);
  return parsed;
}
