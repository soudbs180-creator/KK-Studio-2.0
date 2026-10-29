import type React from "react";
import type { SlashCommand } from "../../features/commands/index.ts";
import type { MentionCandidate } from "./ComposerMentionMenu.tsx";
import type { CanvasReferenceSlot } from "../../domain/canvasItems.ts";
import type { CreationAttachment } from "../../features/creation/index.ts";
import type { AgentDraftAttachment } from "../../features/agent/index.ts";

export interface AvailableNodeCandidate {
  id: string;
  title: string;
  preview?: string;
  slot?: CanvasReferenceSlot;
  assetId?: string;
}

export function buildMentionCandidates(
  availableNodes: readonly AvailableNodeCandidate[],
  attachments: readonly (CreationAttachment | AgentDraftAttachment)[],
): MentionCandidate[] {
  const list: MentionCandidate[] = [];
  const seenIds = new Set<string>();

  for (const node of availableNodes) {
    if (!seenIds.has(node.id)) {
      seenIds.add(node.id);
      list.push({
        id: node.id,
        name: node.title || "画布图片",
        preview: node.preview,
        slot: node.slot || "主体",
        sourceType: "canvas-node",
      });
    }
  }

  for (const att of attachments) {
    if (!seenIds.has(att.id)) {
      seenIds.add(att.id);
      list.push({
        id: att.id,
        name: att.name || "参考附件",
        preview: att.dataUrl?.startsWith("data:") ? att.dataUrl : undefined,
        slot: (att.role as CanvasReferenceSlot) || "主体",
        sourceType: "attachment",
      });
    }
  }

  return list;
}

export function shouldSubmit(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  shortcut: "enter" | "ctrlEnter",
): boolean {
  if (e.key !== "Enter") return false;
  const isCtrlOrMeta = e.ctrlKey || e.metaKey;
  return shortcut === "ctrlEnter" ? isCtrlOrMeta : !e.shiftKey || isCtrlOrMeta;
}

export function handleAutocompleteKey(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  mode: string,
  selectedIndex: number,
  slashCommands: readonly SlashCommand[],
  mentionCandidates: readonly MentionCandidate[],
  onSelectSlash: (cmd: SlashCommand) => void,
  onSelectMention: (
    candidate: MentionCandidate,
    slot: CanvasReferenceSlot,
  ) => void,
): boolean {
  if (e.key !== "Enter" && e.key !== "Tab") return false;
  if (mode === "slash") {
    const selectedCmd = slashCommands[selectedIndex];
    if (selectedCmd) {
      e.preventDefault();
      onSelectSlash(selectedCmd);
      return true;
    }
  } else if (mode === "mention") {
    const selectedItem = mentionCandidates[selectedIndex];
    if (selectedItem) {
      e.preventDefault();
      onSelectMention(selectedItem, selectedItem.slot || "主体");
      return true;
    }
  }
  return false;
}
