import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import { shareVerifiedOriginal } from "../application/originalShare";
import {
  Action,
  Card,
  Content,
  Empty,
  Header,
  Label,
  Screen,
} from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { useAction } from "../ui/useAction.ts";
import { OriginalPreview } from "../ui/OriginalPreview.tsx";
import { MediaOriginalPreview } from "../ui/MediaOriginalPreview.tsx";
export default function MaterialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { app, state } = useApplication(),
    { busy, run } = useAction(),
    [removal, setRemoval] = useState<"hide" | "original">();
  const asset = state.snapshot?.assets.find((a) => a.id === id);
  if (!asset)
    return (
      <Screen>
        <Header title="素材" back />
        <Content>
          <Empty
            title="原件记录不存在"
            description="返回素材列表重新读取。现有项目不会自动清空。"
          />
        </Content>
      </Screen>
    );
  const ctx = app.context(),
    parent = asset.parentAssetId
      ? state.snapshot?.assets.find((a) => a.id === asset.parentAssetId)
      : undefined;
  async function attach() {
    await app.attachMaterialToDraft(asset!.id, ctx.accountId);
    if (app.valid(ctx)) router.replace("/");
  }
  return (
    <Screen>
      <Header title="素材详情" back />
      <Content>
        {asset.mime.startsWith("audio/") || asset.mime.startsWith("video/") ? (
          <MediaOriginalPreview asset={asset} />
        ) : (
          <OriginalPreview asset={asset} />
        )}
        <Card>
          <Label title>{asset.name}</Label>
          <Label muted small>
            {asset.mime} · {asset.size} 字节{"\n"}SHA-256：{asset.sha256}
            {"\n"}素材：{asset.id}
            {"\n"}导入时间：{new Date(asset.createdAt).toLocaleString()}
            {"\n"}来源：{asset.provenance.source}
            {asset.provenance.model ? ` · ${asset.provenance.model}` : ""}
          </Label>
          {asset.hidden && (
            <Label muted>已从素材列表移除，历史引用与原件仍保留。</Label>
          )}
          {parent && (
            <Action
              label="查看父原件"
              onPress={() =>
                router.push({
                  pathname: "/materials/[id]",
                  params: { id: parent.id },
                })
              }
            />
          )}
          {Boolean(asset.provenance.taskId) && (
            <Action
              label="查看来源任务"
              onPress={() =>
                router.push({
                  pathname: "/tasks/[id]",
                  params: { id: asset.provenance.taskId! },
                })
              }
            />
          )}
        </Card>
        <Action
          primary
          label="保存 / 分享原件"
          busy={busy}
          onPress={() =>
            void run(async () =>
              shareVerifiedOriginal(
                await app.materials.originalForShare(asset.id, ctx.accountId),
                () => app.valid(ctx),
              ),
            )
          }
        />
        <Action
          label="添加到当前创作草稿"
          busy={busy}
          onPress={() => void run(attach)}
          reason="当前生成适配器不支持参考输入，草稿会明确提示。"
        />
        {asset.mime.startsWith("image/") && (
          <Action
            label="非破坏编辑 / 比较原件"
            disabled={
              !["image/png", "image/jpeg", "image/webp"].includes(asset.mime) ||
              asset.deleting
            }
            reason={
              !["image/png", "image/jpeg", "image/webp"].includes(asset.mime)
                ? "当前编辑适配器支持 PNG、JPEG 和 WebP；此格式的原件仍可分享。"
                : undefined
            }
            onPress={() =>
              router.push({
                pathname: "/materials/[id]/edit",
                params: { id: asset.id },
              })
            }
          />
        )}
        <Action
          selected={asset.favorite}
          label="收藏此素材"
          busy={busy}
          onPress={() =>
            void run(() =>
              app.materials.favorite(
                [asset.id],
                !asset.favorite,
                ctx.accountId,
              ),
            )
          }
        />
        <Action
          label="从素材列表移除"
          disabled={asset.hidden}
          onPress={() => setRemoval("hide")}
        />
        <Action
          danger
          label="删除原件"
          onPress={() => setRemoval("original")}
        />
      </Content>
      <Sheet
        title={removal === "original" ? "删除原件" : "移除素材"}
        open={Boolean(removal)}
        onClose={() => setRemoval(undefined)}
      >
        <Label>
          {removal === "original"
            ? "此操作永久删除设备原件。项目、任务、草稿或衍生作品引用此原件时会禁止删除。"
            : "仅隐藏素材列表中的条目，原件及历史引用仍保留。"}
        </Label>
        <Action
          danger
          label="确认操作"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.materials.remove(
                [asset.id],
                removal === "original" ? "original" : "hide",
                ctx.accountId,
              );
              setRemoval(undefined);
              if (removal === "original") router.back();
            })
          }
        />
      </Sheet>
    </Screen>
  );
}
