import type { CreationDraft } from "@kk-studio/creation-contracts";
import type { MobileAsset } from "../core/mobileModel.ts";
import { Action, Label, Row } from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";

export function ComposerPanels({
  panel,
  onClose,
  draft,
  onChange,
  assets,
  onAsset,
  maxOutputs,
  onOpen,
  videoAvailable,
}: {
  panel: "add" | "parameters" | "materials" | null;
  onClose: () => void;
  draft: CreationDraft;
  onChange: (update: (current: CreationDraft) => CreationDraft) => void;
  assets: MobileAsset[];
  onAsset: (asset: MobileAsset) => void;
  maxOutputs: number;
  onOpen: (panel: "parameters" | "materials") => void;
  videoAvailable: boolean;
}) {
  return (
    <>
      <Sheet
        title="添加到创作"
        open={panel === "add"}
        onClose={onClose}
        size="compact"
      >
        <Action
          menu
          icon="folder"
          label="引用素材"
          onPress={() => onOpen("materials")}
        />
        <Action
          menu
          label="切换到视频生成"
          disabled={!videoAvailable}
          reason={
            !videoAvailable
              ? "请先选择官方 12ai 模型连接。"
              : "仅文本生视频，每次一条；参考素材与高级编辑尚未接入。"
          }
          onPress={() => {
            onChange((current) => ({
              ...current,
              kind: "video",
              outputCount: 1,
            }));
            onClose();
          }}
        />
        <Action
          menu
          icon={draft.kind === "image" ? "newChat" : "image"}
          label={draft.kind === "image" ? "切换到文字对话" : "切换到图片生成"}
          onPress={() => {
            onChange((current) => ({
              ...current,
              kind: current.kind === "image" ? "text" : "image",
            }));
            onClose();
          }}
        />
        {draft.kind === "image" && (
          <Action
            menu
            icon="sliders"
            label="生成设置"
            onPress={() => onOpen("parameters")}
          />
        )}
      </Sheet>
      <Sheet
        title="生成设置"
        open={panel === "parameters"}
        onClose={onClose}
        size="compact"
      >
        <Label>图片数量</Label>
        <Row>
          <Action
            compact
            label="减少图片数量"
            iconOnly
            icon="back"
            disabled={draft.outputCount <= 1}
            onPress={() =>
              onChange((current) => ({
                ...current,
                outputCount: Math.max(1, current.outputCount - 1),
              }))
            }
          />
          <Label>{draft.outputCount}</Label>
          <Action
            compact
            label="增加图片数量"
            iconOnly
            icon="plus"
            disabled={draft.outputCount >= maxOutputs}
            onPress={() =>
              onChange((current) => ({
                ...current,
                outputCount: Math.min(maxOutputs, current.outputCount + 1),
              }))
            }
          />
        </Row>
        <Label muted small>
          当前连接最多支持 {maxOutputs} 张图片。
        </Label>
      </Sheet>
      <Sheet title="引用素材" open={panel === "materials"} onClose={onClose}>
        <Label muted small>
          选择设备中的素材。当前连接暂不支持参考输入，素材可以保留在草稿，提交时会提示。
        </Label>
        {assets.map((asset) => (
          <Action
            key={asset.id}
            menu
            icon={asset.mime.startsWith("image/") ? "image" : "folder"}
            label={asset.name}
            onPress={() => {
              onAsset(asset);
              onClose();
            }}
          />
        ))}
        {!assets.length && <Label muted>还没有素材，先在素材库导入。</Label>}
      </Sheet>
    </>
  );
}
