import { useEffect, useRef, useState } from "react";
import type { CreationDraft } from "../features/creation/model";
import StartAttachmentList from "./StartAttachmentList";
import useConversationAttachments from "./useConversationAttachments";
import StartResourcePopover from "./StartResourcePopover";
import { StartApproval, StartModePicker } from "./StartComposerModes";
import VoiceInputButton from "./VoiceInputButton";
import GenerationOptions from "./GenerationOptions";
import GenerationPrivacyNotice from "./GenerationPrivacyNotice";

export default function StartComposer({
  draft,
  onDraftChange,
  setStatus,
  onSubmit,
  onOpenModel,
  onOpenSkills,
  onOpenPlugins,
  defaultModel = "",
}: {
  draft: CreationDraft;
  onDraftChange: (draft: CreationDraft) => void;
  setStatus: (status: string) => void;
  onSubmit: (input: CreationDraft) => void;
  onOpenModel: () => void;
  onOpenSkills: () => void;
  onOpenPlugins: () => void;
  defaultModel?: string;
}) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [pluginMenuOpen, setPluginMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<CreationDraft | null>(
    null,
  );
  const pickerRef = useRef<HTMLDivElement>(null);
  const model = draft.model || defaultModel || "kk-image-2";
  const modelOptions = [
    ...new Set(
      [defaultModel.trim(), draft.model.trim(), "kk-image-2"].filter(Boolean),
    ),
  ];
  function closeMenus(): void {
    setModelMenuOpen(false);
    setSkillMenuOpen(false);
    setPluginMenuOpen(false);
    setModeMenuOpen(false);
  }
  useEffect(() => {
    if (!modelMenuOpen && !skillMenuOpen && !pluginMenuOpen && !modeMenuOpen)
      return;
    const pointer = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        closeMenus();
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenus();
      }
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [modelMenuOpen, skillMenuOpen, pluginMenuOpen, modeMenuOpen]);
  function commit(patch: Partial<CreationDraft>): void {
    onDraftChange({ ...draft, ...patch, updatedAt: Date.now() });
  }
  const { fileInput, addFiles, readingFiles } = useConversationAttachments({
    draftKey: "home",
    attachments: draft.attachments,
    onChange: (attachments) =>
      onDraftChange({ ...draft, attachments, updatedAt: Date.now() }),
    onStatus: setStatus,
  });
  function submit(): void {
    if (readingFiles) {
      setStatus("正在读取参考素材，请稍候再提交。");
      return;
    }
    if (!draft.prompt.trim()) {
      setStatus("先写下一句创意，再开始创建项目。");
      return;
    }
    if (!model.trim()) {
      setStatus("请选择本次创作使用的模型。");
      setModelMenuOpen(true);
      return;
    }
    const nextDraft = {
      ...draft,
      prompt: draft.prompt.trim(),
      model: model.trim(),
      kind: "image",
    } satisfies CreationDraft;
    if (nextDraft.approvalMode === "ask" && !pendingSubmit) {
      setPendingSubmit(nextDraft);
      setStatus("项目准备就绪，确认后才会创建并提交任务。");
      return;
    }
    onSubmit(nextDraft);
    setPendingSubmit(null);
  }
  return (
    <>
      <form
        className="start-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          aria-label="创作提示词"
          value={draft.prompt}
          onChange={(event) => {
            commit({ prompt: event.target.value });
            setStatus("");
          }}
          placeholder="描述你要生成的内容，或查看创作指南"
          rows={3}
          maxLength={4000}
        />
        <div className="start-composer-footer" ref={pickerRef}>
          <div className="start-footer-left">
            <button
              type="button"
              className="start-add-button"
              aria-label="添加参考素材"
              onClick={() => fileInput.current?.click()}
            >
              <img src="/design/figma/composer-plus.svg" alt="" />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <div className="start-model-picker">
              <button
                type="button"
                className="start-tool-button"
                aria-label="模型"
                aria-haspopup="menu"
                aria-expanded={modelMenuOpen}
                onClick={() => setModelMenuOpen((open) => !open)}
              >
                <img src="/design/figma/composer-package.svg" alt="" />
                <span>{model || "模型"}</span>
              </button>
              {modelMenuOpen && (
                <div className="start-model-popover" role="menu">
                  {modelOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-checked={model === option}
                      onClick={() => {
                        commit({ model: option });
                        setModelMenuOpen(false);
                      }}
                    >
                      {option}
                      {option === defaultModel ? "（当前配置）" : ""}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="start-model-configure"
                    onClick={() => {
                      setModelMenuOpen(false);
                      onOpenModel();
                    }}
                  >
                    配置供应商…
                  </button>
                </div>
              )}
            </div>
            <GenerationOptions draft={draft} onChange={commit} />
            <span className="start-composer-divider" aria-hidden="true" />
            <button
              type="button"
              className="start-tool-button"
              aria-haspopup="menu"
              aria-expanded={skillMenuOpen}
              onClick={() => setSkillMenuOpen((open) => !open)}
            >
              <img src="/design/figma/composer-puzzle.svg" alt="" />
              <span>Skill</span>
            </button>
            {skillMenuOpen && (
              <StartResourcePopover
                kind="skill"
                onOpen={() => {
                  setSkillMenuOpen(false);
                  onOpenSkills();
                }}
              />
            )}
            <span className="start-composer-divider" aria-hidden="true" />
            <button
              type="button"
              className="start-tool-button"
              aria-haspopup="menu"
              aria-expanded={pluginMenuOpen}
              onClick={() => setPluginMenuOpen((open) => !open)}
            >
              <img src="/design/figma/composer-unplug.svg" alt="" />
              <span>插件</span>
            </button>
            {pluginMenuOpen && (
              <StartResourcePopover
                kind="plugin"
                onOpen={() => {
                  setPluginMenuOpen(false);
                  onOpenPlugins();
                }}
              />
            )}
          </div>
          <div className="start-footer-right">
            <VoiceInputButton
              className="start-mic-button"
              value={draft.prompt}
              onChange={(prompt) => commit({ prompt })}
              onStatus={setStatus}
              maxLength={4000}
            />
            <span className="start-composer-divider" aria-hidden="true" />
            <StartModePicker
              draft={draft}
              open={modeMenuOpen}
              onToggle={() => setModeMenuOpen((open) => !open)}
              onSelect={(value) => {
                commit({ approvalMode: value });
                setModeMenuOpen(false);
              }}
            />
            <button
              type="submit"
              className="start-submit-button"
              aria-label="开始创建项目"
            >
              <img src="/design/figma/composer-send.svg" alt="" />
            </button>
          </div>
        </div>
      </form>
      <GenerationPrivacyNotice mode={draft.privacyMode} />
      {pendingSubmit && (
        <StartApproval
          onConfirm={() => {
            onSubmit(pendingSubmit);
            setPendingSubmit(null);
          }}
          onCancel={() => {
            setPendingSubmit(null);
            setStatus("已取消创建，输入仍保留。");
          }}
        />
      )}
      <StartAttachmentList
        attachments={draft.attachments}
        onRemove={(id) =>
          commit({
            attachments: draft.attachments.filter((item) => item.id !== id),
          })
        }
      />
    </>
  );
}
