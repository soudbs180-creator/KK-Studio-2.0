import type { CreationDraft } from "../features/creation/index.ts";
import type { ModelSelection } from "../domain/modelSelection.ts";
import type { SkillRecord } from "../features/skills/index.ts";
import {
  defaultVideoMedia,
  videoMediaSchema,
} from "../../packages/creation-contracts/media.ts";
import {
  imageSizeOptions,
  useImageModelCapabilities,
} from "../features/models/index.ts";
import CreationParameterControl from "./nodes/CreationParameterControl";
import GenerationCount from "./nodes/GenerationCount";
import ComposerExtensionsMenu from "./ComposerExtensionsMenu";
import { StartModePicker } from "./StartComposerModes";
import type { useComposerMenus } from "./useComposerMenus";
import UiIcon from "./UiIcon";

export interface StartMediaControlsProps {
  placement: "left" | "right";
  draft: CreationDraft;
  selection: ModelSelection;
  menus: ReturnType<typeof useComposerMenus>;
  disabled: boolean;
  onChange: (patch: Partial<CreationDraft>) => void;
  onSelectModel: (selection: ModelSelection) => void;
  skills: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
  onOpen: (id: string) => void;
  onStatus: (message: string) => void;
}

/** Figma 619:3412 media tools; 619:3416 keeps the conversation tools. */
export default function StartMediaControls(props: StartMediaControlsProps) {
  const { placement, draft, selection, menus, disabled, onChange } = props;
  const media = draft.kind !== "text";
  const capabilities = useImageModelCapabilities({
    ...selection,
    source: selection.source === "api" ? "api" : "codex",
  });
  if (placement === "right") {
    return media ? (
      <GenerationCount
        disabled={disabled}
        maxCount={
          selection.source !== "api"
            ? 4
            : draft.kind === "image"
              ? Math.min(8, capabilities.maxGenerationCount ?? 8)
              : 8
        }
        value={String(draft.outputCount)}
        open={menus.countMenuOpen}
        onToggle={() => menus.toggleMenu("count")}
        onChange={(value) => {
          onChange({ outputCount: Number(value) });
          menus.closeMenus();
        }}
      />
    ) : (
      <StartModePicker
        draft={draft}
        open={menus.modeMenuOpen}
        onToggle={() => menus.toggleMenu("mode")}
        onSelect={(approvalMode) => {
          onChange({ approvalMode });
          menus.closeMenus();
        }}
      />
    );
  }
  if (!media)
    return (
      <div className="start-resource-picker composer-ext composer-ext-skill">
        <button
          type="button"
          className="start-tool-button"
          aria-haspopup="menu"
          aria-expanded={menus.skillMenuOpen}
          title="扩展"
          onClick={() => menus.toggleMenu("skill")}
        >
          <UiIcon name="puzzle" size={16} />
          <span>扩展</span>
        </button>
        {menus.skillMenuOpen && (
          <ComposerExtensionsMenu
            skills={props.skills}
            onApplySkill={(record) => {
              const message = props.onApplySkill?.(record);
              menus.closeMenus();
              props.onStatus(message ?? "当前草稿不可用，未应用技能。");
            }}
            onOpen={(id) => {
              menus.closeMenus();
              props.onOpen(id);
            }}
          />
        )}
      </div>
    );
  if (draft.kind === "audio")
    return (
      <button
        type="button"
        className="param-button"
        disabled
        title="语音沿用已保存的音色、格式和语速；当前首页尚未提供参数编辑。"
      >
        语音默认参数
      </button>
    );
  if (draft.kind !== "image" && draft.kind !== "video") return null;
  const video =
    draft.media?.kind === "video"
      ? draft.media
      : videoMediaSchema.parse(defaultVideoMedia);
  return (
    <CreationParameterControl
      disabled={disabled}
      kind={draft.kind}
      model={selection.model}
      selection={selection}
      open={menus.parameterMenuOpen}
      onToggle={() => menus.toggleMenu("params")}
      parameters={{
        imageSize: draft.imageSize,
        ratio:
          draft.kind === "video"
            ? video.aspectRatio
            : (imageSizeOptions(capabilities.declaration).find(
                (option) => option.size === draft.imageSize,
              )?.ratio ?? "自适应"),
        quality: draft.kind === "video" ? video.resolution : "自适应",
        duration: String(video.duration),
        count: String(draft.outputCount),
        soundEnabled: video.audio === true,
      }}
      onModelChange={(_model, choice) => {
        if (choice) props.onSelectModel(choice);
      }}
      onChange={(patch) => {
        if (draft.kind === "image") onChange({ imageSize: patch.imageSize });
        else {
          const parsed = videoMediaSchema.safeParse({
            ...video,
            aspectRatio: patch.ratio ?? video.aspectRatio,
            resolution: patch.quality ?? video.resolution,
            duration: Number(patch.duration ?? video.duration),
          });
          if (parsed.success) onChange({ media: parsed.data });
          else props.onStatus("视频参数不受当前连接支持，原参数已保留。");
        }
      }}
    />
  );
}
