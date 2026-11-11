import { extractNumberedReferences } from "../../domain/promptMentions.ts";
import type { CanvasReferenceSlot } from "../../domain/canvasItems.ts";
import {
  extractMentionTokens,
  serializeMentionToken,
  type ParsedMention,
} from "./structuredPromptCompiler.ts";

export interface ComposerReference {
  id: string;
  name: string;
  slot?: CanvasReferenceSlot;
  assetId?: string;
}
export function composerReferenceTokens(
  prompt: string,
  references: readonly ComposerReference[],
): { tokens: ParsedMention[]; missing: number[] } {
  const missing: number[] = [];
  const tokens = extractMentionTokens(prompt)
    .filter((token) => !token.targetId.startsWith("reference:"))
    .map((token) => ({
      ...token,
      slot: references.find((r) => r.id === token.targetId)?.slot ?? token.slot,
    }));
  for (const token of extractNumberedReferences(prompt)) {
    const ref = references[token.index - 1];
    if (!ref) {
      missing.push(token.index);
      continue;
    }
    tokens.push({
      ...token,
      targetId: ref.id,
      name: `参考 ${token.index} · ${ref.name}`,
      slot: ref.slot ?? "主体",
    });
  }
  return {
    tokens: tokens.sort((a, b) => a.startIndex - b.startIndex),
    missing,
  };
}

/** Bind numbered aliases to their original identity before the slot list reorders. */
export function reconcileComposerReferences(
  prompt: string,
  before: readonly ComposerReference[],
  after: readonly ComposerReference[],
): string {
  let next = prompt;
  const canonical = extractMentionTokens(prompt);
  const numbered = extractNumberedReferences(prompt);
  const replacements: Array<{
    startIndex: number;
    endIndex: number;
    text: string;
  }> = [];
  for (const token of canonical) {
    const ref = after.find((r) => r.id === token.targetId);
    if (ref?.slot && ref.slot !== token.slot)
      replacements.push({
        ...token,
        text: serializeMentionToken(ref.id, ref.name, ref.slot),
      });
  }
  if (
    before.length &&
    before.map((r) => r.id).join("\0") !== after.map((r) => r.id).join("\0")
  )
    for (const token of numbered) {
      const ref = before[token.index - 1];
      if (ref)
        replacements.push({
          ...token,
          text: serializeMentionToken(
            ref.id,
            ref.name,
            after.find((r) => r.id === ref.id)?.slot ?? ref.slot ?? "主体",
          ),
        });
    }
  for (const replacement of replacements.sort(
    (a, b) => b.startIndex - a.startIndex,
  ))
    next =
      next.slice(0, replacement.startIndex) +
      replacement.text +
      next.slice(replacement.endIndex);
  return next;
}
