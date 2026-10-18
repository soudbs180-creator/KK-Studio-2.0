import { radii } from "./geometry.ts";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import type { MobileAsset } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { Label } from "./primitives.tsx";
import { imageEventRatio } from "./imageDimensions.ts";
import { originalImageResource } from "./originalImageResource.ts";
import { createLocalPreviewSource } from "./MediaOriginalPreviewSource";
import type { LocalPreviewSource } from "./MediaOriginalPreviewResource.ts";
export function OriginalPreview({ asset }: { asset: MobileAsset }) {
  const { state } = useApplication();
  return (
    <OriginalReader key={`${state.accountId}:${asset.id}`} asset={asset} />
  );
}
function OriginalReader({ asset }: { asset: MobileAsset }) {
  const { app, state } = useApplication(),
    [uri, setUri] = useState<string>(),
    [text, setText] = useState<string>(),
    [error, setError] = useState<string>(),
    [ratio, setRatio] = useState(1);
  useEffect(() => {
    let alive = true,
      resource: LocalPreviewSource | undefined;
    if (!asset.mime.startsWith("image/") && asset.mime !== "text/plain") return;
    const ctx = app.context();
    const pending = asset.mime.startsWith("image/")
      ? originalImageResource(
          ctx.repo,
          asset.id,
          () => alive && app.valid(ctx),
          (bytes) => createLocalPreviewSource(bytes, asset.mime),
          (value, success, failure) => Image.getSize(value, success, failure),
        ).then((next) => {
          if (!next) return;
          resource = next;
          if (!alive || !app.valid(ctx)) {
            next.dispose();
            return;
          }
          setRatio(next.width / next.height);
          setUri(next.uri);
        })
      : ctx.repo.readOriginal(asset.id).then((bytes) => {
          if (alive && app.valid(ctx))
            setText(new TextDecoder().decode(bytes.slice(0, 4000)));
        });
    void pending.catch(() => {
      if (alive && app.valid(ctx))
        setError("原件读取、校验或尺寸读取失败，现有内容保留，可分享原件。");
    });
    return () => {
      alive = false;
      resource?.dispose();
    };
  }, [app, asset.id, asset.mime, state.accountId]);
  if (error) return <Label muted>{error}</Label>;
  if (text !== undefined) return <Label>{text}</Label>;
  if (!asset.mime.startsWith("image/"))
    return (
      <Label muted>
        {asset.mime.startsWith("audio/")
          ? "打开详情预览音频。"
          : asset.mime.startsWith("video/")
            ? "打开详情预览视频。"
            : "此 MIME 尚无内嵌预览，可分享原件到支持的应用。"}
      </Label>
    );
  if (!uri) return <ActivityIndicator accessibilityLabel="正在读取原件" />;
  return (
    <View style={{ width: "100%" }}>
      <Image
        accessibilityLabel={asset.name}
        source={{ uri }}
        style={{ width: "100%", aspectRatio: ratio, borderRadius: radii.card }}
        resizeMode="contain"
        fadeDuration={0}
        onLoad={(e) => {
          const nextRatio = imageEventRatio(e);
          if (
            nextRatio &&
            ["ready", "local"].includes(app.getState().auth) &&
            app.getState().accountId === state.accountId
          )
            setRatio(nextRatio);
        }}
        onError={() => {
          if (
            ["ready", "local"].includes(app.getState().auth) &&
            app.getState().accountId === state.accountId
          )
            setError("当前平台无法预览该图片格式，原件仍可分享。");
        }}
      />
    </View>
  );
}
