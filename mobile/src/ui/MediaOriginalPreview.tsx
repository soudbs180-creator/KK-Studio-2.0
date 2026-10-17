import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { MobileAsset } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { Action, Label } from "./primitives.tsx";
import { useTheme } from "./theme.tsx";
import {
  verifiedPreviewSource,
  type LocalPreviewSource,
} from "./MediaOriginalPreviewResource.ts";
import { createLocalPreviewSource } from "./MediaOriginalPreviewSource";
import {
  LocalAudioPlayer,
  LocalVideoPlayer,
} from "./MediaOriginalPreviewPlayers.tsx";

export function MediaOriginalPreview({ asset }: { asset: MobileAsset }) {
  const { state } = useApplication(),
    [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  if (!asset.mime.startsWith("video/") && !asset.mime.startsWith("audio/"))
    return <Label muted>此预览仅用于音频或视频原件。</Label>;
  return focused && ["ready", "local"].includes(state.auth) ? (
    <MediaReader key={`${state.accountId}:${asset.id}`} asset={asset} />
  ) : null;
}
function MediaReader({ asset }: { asset: MobileAsset }) {
  const { app } = useApplication(),
    t = useTheme(),
    [source, setSource] = useState<LocalPreviewSource>(),
    [error, setError] = useState<string>(),
    [stopped, setStopped] = useState(false),
    [attempt, setAttempt] = useState(0);
  const ctx = app.context();
  const valid = useCallback(() => app.valid(ctx), [app, ctx]);
  useEffect(() => {
    if (stopped) return;
    let alive = true,
      resource: LocalPreviewSource | undefined;
    const timer = setTimeout(() => {
      if (alive && valid()) {
        alive = false;
        setError("原件读取超时，数据保留；停止后可重新读取。");
      }
    }, 15000);
    void verifiedPreviewSource(
      ctx.repo,
      asset.id,
      () => alive && valid(),
      (bytes) => createLocalPreviewSource(bytes, asset.mime),
    )
      .then((next) => {
        resource = next;
        if (alive && valid()) {
          clearTimeout(timer);
          setSource(next);
        } else next.dispose();
      })
      .catch(() => {
        if (alive && valid())
          setError(
            "原件读取或 SHA-256 校验失败，内容保留；可重新读取或返回素材详情。",
          );
      });
    return () => {
      alive = false;
      clearTimeout(timer);
      resource?.dispose();
    };
  }, [asset.id, asset.mime, ctx, stopped, attempt, valid]);
  function stop() {
    setStopped(true);
    setSource(undefined);
  }
  function retry() {
    setError(undefined);
    setSource(undefined);
    setStopped(false);
    setAttempt((n) => n + 1);
  }
  if (stopped || error)
    return (
      <View style={{ gap: 12 }}>
        <Label muted>{error ?? "预览已停止，设备原件保留。"}</Label>
        <Action label="重新读取原件" onPress={retry} />
      </View>
    );
  if (!source)
    return (
      <View style={{ gap: 12 }}>
        <ActivityIndicator
          color={t.accent}
          accessibilityLabel="正在校验音视频原件"
        />
        <Action label="取消读取" onPress={stop} />
      </View>
    );
  const props = { uri: source.uri, name: asset.name, valid, onCancel: stop };
  return asset.mime.startsWith("video/") ? (
    <LocalVideoPlayer {...props} />
  ) : (
    <LocalAudioPlayer {...props} />
  );
}
