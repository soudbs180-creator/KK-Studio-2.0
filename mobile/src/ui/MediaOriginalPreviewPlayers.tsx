import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import { Action, Label, Row } from "./primitives.tsx";
import { radii } from "./geometry.ts";
import { useTheme } from "./theme.tsx";

export interface LocalPlayerProps {
  uri: string;
  name: string;
  valid(): boolean;
  onCancel(): void;
}
function clock(value: number): string {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function useForegroundPause(player: { pause(): void }) {
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") player.pause();
    });
    return () => listener.remove();
  }, [player]);
}
export function LocalVideoPlayer({
  uri,
  name,
  valid,
  onCancel,
}: LocalPlayerProps) {
  const t = useTheme();
  const player = useVideoPlayer(uri, (value) => {
    value.staysActiveInBackground = false;
    value.loop = false;
  });
  const [status, setStatus] = useState(player.status),
    [error, setError] = useState<string>(),
    [ratio, setRatio] = useState(16 / 9);
  useForegroundPause(player);
  useEffect(() => {
    let alive = true;
    const statusListener = player.addListener(
      "statusChange",
      ({ status: next, error: failure }) => {
        if (!alive || !valid()) return;
        setStatus(next);
        if (failure) {
          player.pause();
          setError("当前设备无法解码此视频，原件保留；可分享给支持的播放器。");
        }
      },
    );
    const sizeListener = player.addListener(
      "videoTrackChange",
      ({ videoTrack }) => {
        const size = videoTrack?.size;
        if (alive && valid() && size && size.width > 0 && size.height > 0)
          setRatio(size.width / size.height);
      },
    );
    const timer = setTimeout(() => {
      if (alive && valid() && player.status !== "readyToPlay") {
        player.pause();
        setError("视频加载超时，原件保留；停止预览后可重新读取或分享原件。");
      }
    }, 15000);
    return () => {
      alive = false;
      clearTimeout(timer);
      statusListener.remove();
      sizeListener.remove();
    };
  }, [player, valid]);
  return (
    <View style={{ gap: 12 }}>
      {error || status === "error" ? (
        <Label danger>
          {error ?? "当前设备无法解码此视频，原件可继续分享。"}
        </Label>
      ) : (
        <>
          {status !== "readyToPlay" && (
            <ActivityIndicator
              color={t.accent}
              accessibilityLabel="正在加载视频原件"
            />
          )}
          <VideoView
            player={player}
            accessibilityLabel={`视频原件：${name}`}
            style={{
              width: "100%",
              aspectRatio: ratio,
              borderRadius: radii.card,
              backgroundColor: t.surface,
            }}
            contentFit="contain"
            nativeControls
            allowsPictureInPicture={false}
            fullscreenOptions={{ enable: false }}
            allowsVideoFrameAnalysis={false}
          />
        </>
      )}
      <Action label="停止预览" onPress={onCancel} />
    </View>
  );
}
export function LocalAudioPlayer({
  uri,
  name,
  valid,
  onCancel,
}: LocalPlayerProps) {
  const t = useTheme(),
    player = useAudioPlayer(uri, {
      updateInterval: 500,
      keepAudioSessionActive: false,
    }),
    status = useAudioPlayerStatus(player),
    [error, setError] = useState<string>();
  const lifetime = useRef<{
    alive: boolean;
    player: typeof player;
    uri: string;
  } | null>(null);
  useForegroundPause(player);
  useEffect(() => {
    const instance = { alive: true, player, uri };
    lifetime.current = instance;
    const timer = setTimeout(() => {
      if (instance.alive && valid() && !player.isLoaded)
        setError("音频加载超时，原件保留；停止预览后可重新读取或分享原件。");
    }, 15000);
    return () => {
      instance.alive = false;
      clearTimeout(timer);
    };
  }, [player, uri, valid]);
  const failure = status.error
    ? "当前设备无法解码此音频，原件保留，可分享给支持的播放器。"
    : error;
  function captureActive() {
    const instance = lifetime.current;
    return () =>
      Boolean(
        instance?.alive &&
        lifetime.current === instance &&
        instance.player === player &&
        instance.uri === uri &&
        valid(),
      );
  }
  async function toggle() {
    const active = captureActive();
    if (!active()) return;
    try {
      if (status.playing) player.pause();
      else {
        if (status.didJustFinish || status.currentTime >= status.duration)
          await player.seekTo(0);
        if (active()) player.play();
      }
    } catch {
      if (active())
        setError("播放失败，原件保留；请停止预览后重试或分享原件。");
    }
  }
  async function restart() {
    const active = captureActive();
    if (!active()) return;
    try {
      await player.seekTo(0);
      if (active()) player.play();
    } catch {
      if (active()) setError("无法跳转播放位置，原件保留；请重新预览。");
    }
  }
  function stop() {
    if (lifetime.current) lifetime.current.alive = false;
    onCancel();
  }
  return (
    <View style={{ gap: 12 }}>
      <Label>{name}</Label>
      {failure ? (
        <Label danger>{failure}</Label>
      ) : (
        <>
          {!status.isLoaded && (
            <ActivityIndicator
              color={t.accent}
              accessibilityLabel="正在加载音频原件"
            />
          )}
          <Label muted>
            {clock(status.currentTime)} / {clock(status.duration)}
            {status.isBuffering ? " · 缓冲中" : ""}
          </Label>
          <Row>
            <Action
              label={status.playing ? "暂停音频" : "播放音频"}
              disabled={!status.isLoaded}
              onPress={() => void toggle()}
            />
            <Action
              label="从头播放"
              disabled={!status.isLoaded}
              onPress={() => void restart()}
            />
          </Row>
        </>
      )}
      <Action label="停止预览" onPress={stop} />
    </View>
  );
}
