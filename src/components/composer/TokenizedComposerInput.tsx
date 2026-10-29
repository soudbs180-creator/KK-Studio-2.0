import React, { useMemo, useCallback } from "react";
import ComposerTextarea from "../ComposerTextarea.tsx";
import { useComposerAutocomplete } from "./useComposerAutocomplete.ts";
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
} from "../../features/commands/index.ts";
import {
  buildMentionCandidates,
  shouldSubmit,
  handleAutocompleteKey,
  type AvailableNodeCandidate,
} from "./composerKeyHandlers.ts";
import type { CanvasReferenceSlot } from "../../domain/canvasItems.ts";
import {
  extractMentionTokens,
  serializeMentionToken,
  type ParsedMention,
} from "../../features/prompts/index.ts";
import type { CreationAttachment } from "../../features/creation/index.ts";
import type { AgentDraftAttachment } from "../../features/agent/index.ts";
import type { ModelSelection } from "../../domain/modelSelection.ts";
import type { UserCapability } from "../../features/models/index.ts";

export interface TokenizedComposerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit?: () => void;
  submitShortcut?: "enter" | "ctrlEnter";
  modelSelection?: ModelSelection;
  capability?: UserCapability;
  onSelectModel?: (selection: ModelSelection) => void;
  onCapabilityChange?: (capability: UserCapability) => void;
  onDispatch?: (payload: {
    prompt: string;
    capability: UserCapability;
    modelSelection?: ModelSelection;
  }) => void | Promise<void>;
  availableNodes?: AvailableNodeCandidate[];
  attachments?: (CreationAttachment | AgentDraftAttachment)[];
  onAddAttachment?: (item: AvailableNodeCandidate) => void;
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
  submitShortcut,
  modelSelection,
  capability,
  onSelectModel,
  onCapabilityChange,
  onDispatch,
  availableNodes = [],
  attachments = [],
  onAddAttachment,
  onOpenModal,
  setStatus,
}: TokenizedComposerInputProps) {
  void onSelectModel;
  void onCapabilityChange;
  // 1. 解析当前输入框中已有的 Mention Tokens
  const activeTokens = useMemo(() => {
    return extractMentionTokens(value);
  }, [value]);

  // 2. 聚合所有的提及候选素材（画布节点 + 附件）
  const allCandidates: MentionCandidate[] = useMemo(() => {
    return buildMentionCandidates(availableNodes, attachments);
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
        title: candidate.name,
        preview: candidate.preview,
        slot,
      });
    },
    [value, autocomplete, onChange, onAddAttachment],
  );

  // 7. 处理键盘导航
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete.mode !== "none") {
      const handledKey = handleAutocompleteKey(
        e,
        autocomplete.mode,
        autocomplete.selectedIndex,
        matchedSlashCommands,
        matchedMentionCandidates,
        handleSelectSlash,
        handleSelectMention,
      );
      if (handledKey) return;

      const handled = autocomplete.handleKeyDown(e);
      if (handled) return;
    }

    if (disabled || e.nativeEvent.isComposing) {
      onKeyDown?.(e);
      return;
    }

    const resolvedSubmitShortcut =
      submitShortcut ??
      (typeof window !== "undefined"
        ? ((window.localStorage.getItem("kk:submit-shortcut") as
            "enter" | "ctrlEnter" | null) ?? "enter")
        : "enter");

    if (shouldSubmit(e, resolvedSubmitShortcut)) {
      if (!value.trim()) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      if (onDispatch) {
        void onDispatch({
          prompt: value,
          capability: capability ?? "chat",
          modelSelection,
        });
      } else if (onSubmit) {
        onSubmit();
      }
      return;
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
    <div
      className="tokenized-composer-wrapper"
      style={{ position: "relative", width: "100%" }}
    >
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
        placeholder={
          placeholder || "描述创作需求；输入 @ 引用参考图，输入 / 快捷操作…"
        }
        disabled={disabled}
      />
    </div>
  );
}
