import React, { useMemo, useCallback } from "react";
import ComposerTextarea from "../ComposerTextarea.tsx";
import {
  useComposerAutocomplete,
} from "./useComposerAutocomplete.ts";
import ComposerSlashMenu from "./ComposerSlashMenu.tsx";
import ComposerMentionMenu, {
  type MentionCandidate,
} from "./ComposerMentionMenu.tsx";
import ComposerMentionsBar, {
  cycleMentionSlot,
  removeMentionToken,
} from "./ComposerMentionsBar.tsx";
import {
  defaultSlashRegistry,
  type SlashCommand,
} from "../../features/commands/slashCommandRegistry.ts";
import type { CanvasReferenceSlot } from "../../domain/canvasItems.ts";
import {
  extractMentionTokens,
  serializeMentionToken,
  type ParsedMention,
} from "../../features/prompts/structuredPromptCompiler.ts";
import type { CreationAttachment } from "../../features/creation/model.ts";
import type { AgentDraftAttachment } from "../../features/agent/agentAttachments.ts";

export interface TokenizedComposerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit?: () => void;
  availableNodes?: Array<{
    id: string;
    title: string;
    preview?: string;
    slot?: CanvasReferenceSlot;
    assetId?: string;
  }>;
  attachments?: (CreationAttachment | AgentDraftAttachment)[];
  onAddAttachment?: (item: {
    id: string;
    name: string;
    preview?: string;
    slot?: CanvasReferenceSlot;
    assetId?: string;
  }) => void;
  onOpenModal?: (modalId: string) => void;
  setStatus?: (status: string) => void;
  minRows?: number;
}

export default function TokenizedComposerInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  onKeyDown,
  onSubmit,
  availableNodes = [],
  attachments = [],
  onAddAttachment,
  onOpenModal,
  setStatus,
}: TokenizedComposerInputProps) {
  // 1. 解析当前输入框中已有的 Mention Tokens
  const activeTokens = useMemo(() => {
    return extractMentionTokens(value);
  }, [value]);

  // 2. 聚合所有的提及候选素材（画布节点 + 附件）
  const allCandidates: MentionCandidate[] = useMemo(() => {
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
  }, [availableNodes, attachments]);

  // 3. 准备命令与提及过滤结果
  const mentionFilter = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return allCandidates;
      return allCandidates.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.slot && c.slot.toLowerCase().includes(q)),
      );
    },
    [allCandidates],
  );

  // 4. 自动补齐状态机
  const autocomplete = useComposerAutocomplete({
    itemCount: 0, // 在渲染层动态计算
    onSelect: () => {}, // 占位，在渲染层注入真实回调
  });

  const matchedSlashCommands: SlashCommand[] = useMemo(() => {
    if (autocomplete.mode !== "slash") return [];
    return defaultSlashRegistry.match(autocomplete.query);
  }, [autocomplete.mode, autocomplete.query]);

  const matchedMentionCandidates: MentionCandidate[] = useMemo(() => {
    if (autocomplete.mode !== "mention") return [];
    return mentionFilter(autocomplete.query);
  }, [autocomplete.mode, autocomplete.query, mentionFilter]);

  // 5. 选中命令回调
  const handleSelectSlash = useCallback(
    (cmd: SlashCommand) => {
      // 移除已输入的斜杠前缀
      const lastSlashIdx = value.lastIndexOf("/" + autocomplete.query);
      const nextValue =
        lastSlashIdx >= 0
          ? value.slice(0, lastSlashIdx) +
            value.slice(lastSlashIdx + 1 + autocomplete.query.length)
          : value;
      onChange(nextValue);
      autocomplete.close();

      // 执行命令
      cmd.execute({
        prompt: nextValue,
        setPrompt: onChange,
        openModal: onOpenModal,
        setStatus,
      });
    },
    [value, autocomplete, onChange, onOpenModal, setStatus],
  );

  // 6. 选中 Mention 回调
  const handleSelectMention = useCallback(
    (candidate: MentionCandidate, slot: CanvasReferenceSlot) => {
      // 移除已输入的 @ 前缀并插入规范 Token
      const lastAtIdx = value.lastIndexOf("@" + autocomplete.query);
      const token = serializeMentionToken(candidate.id, candidate.name, slot);

      const nextValue =
        lastAtIdx >= 0
          ? value.slice(0, lastAtIdx) +
            token +
            " " +
            value.slice(lastAtIdx + 1 + autocomplete.query.length)
          : value + " " + token + " ";

      onChange(nextValue);
      autocomplete.close();

      // 确保该素材加入附件
      onAddAttachment?.({
        id: candidate.id,
        name: candidate.name,
        preview: candidate.preview,
        slot,
      });
    },
    [value, autocomplete, onChange, onAddAttachment],
  );

  // 7. 处理键盘导航
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete.mode !== "none") {
      if (e.key === "Enter" || e.key === "Tab") {
        if (autocomplete.mode === "slash") {
          const selectedCmd = matchedSlashCommands[autocomplete.selectedIndex];
          if (selectedCmd) {
            e.preventDefault();
            handleSelectSlash(selectedCmd);
            return;
          }
        } else if (autocomplete.mode === "mention") {
          const selectedItem =
            matchedMentionCandidates[autocomplete.selectedIndex];
          if (selectedItem) {
            e.preventDefault();
            handleSelectMention(selectedItem, selectedItem.slot || "主体");
            return;
          }
        }
      }

      const handled = autocomplete.handleKeyDown(e);
      if (handled) return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (onSubmit) {
        e.preventDefault();
        onSubmit();
        return;
      }
    }

    onKeyDown?.(e);
  };

  // 8. 切换已有 Token 槽位
  const cycleTokenSlot = (token: ParsedMention) => {
    onChange(cycleMentionSlot(value, token));
  };

  // 9. 移除已有 Token
  const removeToken = (token: ParsedMention) => {
    onChange(removeMentionToken(value, token));
  };

  return (
    <div className="tokenized-composer-wrapper" style={{ position: "relative", width: "100%" }}>
      {/* 活跃引用的内联胶囊栏 */}
      <ComposerMentionsBar
        activeTokens={activeTokens}
        onCycleSlot={cycleTokenSlot}
        onRemoveToken={removeToken}
      />

      {/* 斜杠命令自动补齐浮层 */}
      {autocomplete.mode === "slash" && (
        <ComposerSlashMenu
          commands={matchedSlashCommands}
          selectedIndex={autocomplete.selectedIndex}
          onSelect={handleSelectSlash}
          onClose={autocomplete.close}
        />
      )}

      {/* 提及素材自动补齐浮层 */}
      {autocomplete.mode === "mention" && (
        <ComposerMentionMenu
          candidates={matchedMentionCandidates}
          selectedIndex={autocomplete.selectedIndex}
          onSelect={handleSelectMention}
          onClose={autocomplete.close}
        />
      )}

      {/* 核心输入框 */}
      <ComposerTextarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          autocomplete.handleTextChange(
            e.target.value,
            e.target.selectionStart || 0,
          );
        }}
        onSelect={(e) => {
          const target = e.target as HTMLTextAreaElement;
          autocomplete.handleTextChange(
            target.value,
            target.selectionStart || 0,
          );
        }}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder || "描述创作需求；输入 @ 引用参考图，输入 / 快捷操作…"}
        disabled={disabled}
      />
    </div>
  );
}
