import type { RefObject } from "react";
import ConversationModelPicker from "./ConversationModelPicker";
import type { CreationDraft } from "../features/creation/model";
import VoiceInputButton from "./VoiceInputButton";

export default function ConversationActions({
  actionsRef,
  fileInput,
  onAddFiles,
  composerDraft,
  submitting,
  currentModel,
  modelOptions,
  modelMenuOpen,
  onToggleModel,
  onSelectModel,
  onConfigureModel,
  onOpen,
  skillMenuOpen,
  onToggleSkill,
  pluginMenuOpen,
  onTogglePlugin,
  modeMenuRef,
  modeMenuOpen,
  approvalMode,
  onToggleMode,
  onSelectMode,
  input,
  onVoiceChange,
  onVoiceStatus,
  voiceEnabled,
  voiceSessionKey,
}: {
  actionsRef: RefObject<HTMLDivElement>;
  fileInput: RefObject<HTMLInputElement>;
  onAddFiles: (files: FileList | null) => void;
  composerDraft?: CreationDraft;
  submitting: boolean;
  currentModel?: string;
  modelOptions: string[];
  modelMenuOpen: boolean;
  onToggleModel: () => void;
  onSelectModel: (model: string) => void;
  onConfigureModel: () => void;
  onOpen: (id: string) => void;
  skillMenuOpen: boolean;
  onToggleSkill: () => void;
  pluginMenuOpen: boolean;
  onTogglePlugin: () => void;
  modeMenuRef: RefObject<HTMLDivElement>;
  modeMenuOpen: boolean;
  approvalMode: "auto" | "ask";
  onToggleMode: () => void;
  onSelectMode: (mode: "auto" | "ask") => void;
  input: string;
  onVoiceChange: (value: string) => void;
  onVoiceStatus: (message: string) => void;
  voiceEnabled: boolean;
  voiceSessionKey: string;
}) {
  return (
    <div ref={actionsRef} data-node-id="407:29315">
      <button
        type="button"
        aria-label="添加对话素材"
        disabled={submitting || !composerDraft}
        onClick={() => fileInput.current?.click()}
      >
        <img
          src="/design/figma/composer-plus.svg"
          width="24"
          height="24"
          alt=""
        />
      </button>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={(event) => {
          onAddFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <ConversationModelPicker
        currentModel={currentModel}
        options={modelOptions}
        open={modelMenuOpen}
        onToggle={onToggleModel}
        onSelect={onSelectModel}
        onConfigure={onConfigureModel}
      />
      <span className="chat-footer-separator" aria-hidden="true" />
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={skillMenuOpen}
        onClick={onToggleSkill}
      >
        <img
          src="/design/figma/composer-puzzle.svg"
          width="12"
          height="12"
          alt=""
        />
        Skill
      </button>
      {skillMenuOpen && (
        <div
          className="chat-resource-popover"
          role="menu"
          aria-label="选择 Skill"
        >
          <p>当前项目还没有可用的本地 Skill。</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggleSkill();
              onOpen("skills");
            }}
          >
            浏览 Skill 目录
          </button>
        </div>
      )}
      <span className="chat-footer-separator" aria-hidden="true" />
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={pluginMenuOpen}
        onClick={onTogglePlugin}
      >
        <img
          src="/design/figma/composer-unplug.svg"
          width="12"
          height="12"
          alt=""
        />
        插件
      </button>
      {pluginMenuOpen && (
        <div
          className="chat-resource-popover chat-plugin-popover"
          role="menu"
          aria-label="选择插件"
        >
          <p>当前没有已连接的插件。</p>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onTogglePlugin();
              onOpen("settings/mcp");
            }}
          >
            管理插件连接
          </button>
        </div>
      )}
      <div className="chat-mode-menu" ref={modeMenuRef}>
        <button
          type="button"
          className="chat-mode-trigger"
          aria-label="AI权限模式"
          aria-haspopup="menu"
          aria-expanded={modeMenuOpen}
          onClick={onToggleMode}
        >
          {approvalMode === "auto" ? "自动" : "询问"}
          <img
            className="chat-mode-chevron"
            src="/design/figma/composer-chevron.svg"
            width="10"
            height="5"
            alt=""
          />
        </button>
        {modeMenuOpen && (
          <div className="chat-mode-popover" role="menu">
            {(
              [
                ["auto", "自动"],
                ["ask", "询问"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={approvalMode === value}
                title={
                  value === "auto"
                    ? "AI 可以连续执行，不在每一步询问"
                    : "AI 在执行前询问你的确认"
                }
                onClick={() => onSelectMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <VoiceInputButton
        value={input}
        onChange={onVoiceChange}
        onStatus={onVoiceStatus}
        enabled={voiceEnabled}
        sessionKey={voiceSessionKey}
        maxLength={7500}
      />
      <span
        className="chat-footer-separator chat-footer-separator-right"
        aria-hidden="true"
      />
      <button
        type="submit"
        aria-label="发送消息"
        disabled={!input.trim() || submitting}
        className="chat-send"
      >
        <img
          src="/design/figma/composer-send.svg"
          width="24"
          height="24"
          alt=""
        />
      </button>
    </div>
  );
}
