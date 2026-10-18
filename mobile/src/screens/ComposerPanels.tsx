import type { CreationDraft } from "@kk-studio/creation-contracts";
import type { MobileAsset, MobileLibraryEntry } from "../core/mobileModel.ts";
import { View } from "react-native";
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
  onImport,
  importing = false,
  library = [],
  onLibrary,
  onLibraryManager,
  onExtensionsManager,
  imageSizes = [],
  imageSize,
  onImageSize,
  referenceSupported = false,
}: {
  panel: "add" | "parameters" | "materials" | "extensions" | null;
  onClose: () => void;
  draft: CreationDraft;
  onChange: (update: (current: CreationDraft) => CreationDraft) => void;
  assets: MobileAsset[];
  onAsset: (asset: MobileAsset) => void;
  maxOutputs: number;
  onOpen: (panel: "parameters" | "materials") => void;
  videoAvailable: boolean;
  onImport: (image: boolean) => void;
  importing?: boolean;
  library?: MobileLibraryEntry[];
  onLibrary: (id: string) => void;
  onLibraryManager: () => void;
  onExtensionsManager: () => void;
  imageSizes?: string[];
  imageSize?: string;
  onImageSize: (size?: string) => void;
  referenceSupported?: boolean;
}) {
  return (
    <>
      <Sheet
        title="上传"
        open={panel === "add"}
        onClose={onClose}
        size="medium"
      >
        <Action
          menu
          icon="image"
          label="从设备上传图片"
          busy={importing}
          onPress={() => onImport(true)}
        />
        <Action
          menu
          icon="folder"
          label="从设备上传文件"
          busy={importing}
          onPress={() => onImport(false)}
        />
        <Action
          menu
          icon="folder"
          label="引用素材"
          onPress={() => onOpen("materials")}
        />
        <Label muted small>
          {referenceSupported
            ? "此模型支持图片参考，发送时会使用所选图片。"
            : "附件会保留在草稿中；请选择支持该素材的生成方式。"}
        </Label>
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
        title="参数选项"
        open={panel === "parameters"}
        onClose={onClose}
        size="large"
      >
        <Label>生成类型</Label>
        <Row>
          <Action
            compact
            label="文字对话"
            selected={draft.kind === "text"}
            onPress={() =>
              onChange((current) => ({
                ...current,
                kind: "text",
              }))
            }
          />
          <Action
            compact
            label="图片生成"
            selected={draft.kind === "image"}
            onPress={() =>
              onChange((current) => ({ ...current, kind: "image" }))
            }
          />
          <Action
            compact
            label="视频生成"
            selected={draft.kind === "video"}
            disabled={!videoAvailable}
            reason={!videoAvailable ? "请先选择支持视频的连接。" : undefined}
            onPress={() =>
              onChange((current) => ({
                ...current,
                kind: "video",
                outputCount: 1,
              }))
            }
          />
        </Row>
        {draft.kind === "image" ? (
          <>
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
            <Label>本次图片尺寸</Label>
            <Label muted small>
              未发送的尺寸选择在刷新后恢复自适应。
            </Label>
            <Action
              menu
              label="自适应（服务默认）"
              selected={!imageSize}
              onPress={() => onImageSize(undefined)}
            />
            {imageSizes
              .filter((size) => size !== "auto")
              .map((size) => (
                <Action
                  key={size}
                  menu
                  label={size}
                  selected={imageSize === size}
                  onPress={() => onImageSize(size)}
                />
              ))}
            {!imageSizes.length && (
              <Label muted small>
                该连接未声明指定尺寸，使用服务默认值。
              </Label>
            )}
          </>
        ) : (
          <Label muted small>
            {draft.kind === "video"
              ? "视频使用所选模型的固定时长和规格，每次一条。"
              : "文字对话使用所选模型的服务默认参数。"}
          </Label>
        )}
      </Sheet>
      <Sheet title="扩展选择" open={panel === "extensions"} onClose={onClose}>
        {library.map((entry) => (
          <Action
            key={entry.id}
            menu
            label={entry.name}
            onPress={() => onLibrary(entry.id)}
          />
        ))}
        {!library.length && (
          <Label muted>
            还没有可选条目，可从创作库添加提示词、角色或 Skill。
          </Label>
        )}
        <Action label="管理创作库" onPress={onLibraryManager} />
        <Action label="扩展与工具" onPress={onExtensionsManager} />
      </Sheet>
      <Sheet title="引用素材" open={panel === "materials"} onClose={onClose}>
        <Label muted small>
          {referenceSupported
            ? "选择需要参考的图片。"
            : "素材可以保留在草稿；当前生成方式不支持的附件会明确提示。"}
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

export function ComposerAttachments({
  attachments,
  onRemove,
}: {
  attachments: CreationDraft["attachments"];
  onRemove: (id: string) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      {attachments.map((attachment) => (
        <View
          key={attachment.id}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Label small numberOfLines={1} style={{ flex: 1 }}>
            {attachment.name}
          </Label>
          <Action
            compact
            iconOnly
            icon="close"
            label={`移除参考：${attachment.name}`}
            onPress={() => onRemove(attachment.id)}
          />
        </View>
      ))}
    </View>
  );
}
