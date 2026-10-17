import React from "react";
import { CANVAS_REFERENCE_SLOTS } from "../../domain/canvasItems.ts";
import {
  serializeMentionToken,
  type ParsedMention,
} from "../../features/prompts/structuredPromptCompiler.ts";

export interface ComposerMentionsBarProps {
  activeTokens: ParsedMention[];
  onCycleSlot: (token: ParsedMention) => void;
  onRemoveToken: (token: ParsedMention) => void;
}

export function cycleMentionSlot(value: string, token: ParsedMention): string {
  const currentIndex = CANVAS_REFERENCE_SLOTS.indexOf(token.slot);
  const validSlots = CANVAS_REFERENCE_SLOTS.filter((s) => s !== "Mask");
  const nextSlot = validSlots[(currentIndex + 1) % validSlots.length] || "主体";
  const newToken = serializeMentionToken(token.targetId, token.name, nextSlot);
  return (
    value.slice(0, token.startIndex) + newToken + value.slice(token.endIndex)
  );
}

export function removeMentionToken(
  value: string,
  token: ParsedMention,
): string {
  return (
    value.slice(0, token.startIndex) + value.slice(token.endIndex)
  ).trim();
}

export default function ComposerMentionsBar({
  activeTokens,
  onCycleSlot,
  onRemoveToken,
}: ComposerMentionsBarProps) {
  if (activeTokens.length === 0) return null;

  return (
    <div className="tokenized-mentions-bar">
      {activeTokens.map((t, idx) => (
        <div key={`${t.targetId}-${idx}`} className="inline-mention-pill">
          <span aria-hidden="true">🖼️</span>
          <span className="pill-name">{t.name}</span>
          <button
            type="button"
            className={`slot-badge slot-${t.slot}`}
            title="点击切换参考角色（主体/风格/材质/构图）"
            onClick={() => onCycleSlot(t)}
          >
            {t.slot}
          </button>
          <button
            type="button"
            className="inline-mention-pill-remove"
            aria-label={`移除 ${t.name}`}
            onClick={() => onRemoveToken(t)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
