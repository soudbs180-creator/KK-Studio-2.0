import {
  ActivityIndicator,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import type { CreationDraft } from "@kk-studio/creation-contracts";
import { Icon, type IconName } from "../ui/Icon.tsx";
import { useTheme, touchTarget } from "../ui/theme.tsx";

export function ComposerToolbar({
  kind,
  model,
  onModel,
  onAdd,
  onParameters,
  onExtensions,
  onVoice,
  voiceState,
  voiceDisabled = false,
  running,
  blocked,
  busy,
  onSend,
}: {
  kind: CreationDraft["kind"];
  model: string;
  onModel: () => void;
  onAdd: () => void;
  onParameters: () => void;
  onExtensions: () => void;
  onVoice: () => void;
  voiceState: "off" | "starting" | "on" | "stopping";
  voiceDisabled?: boolean;
  running: boolean;
  blocked: boolean;
  busy: boolean;
  onSend: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
      }}
    >
      <ComposerIcon name="plus" label="上传" onPress={onAdd} />
      <ComposerIcon
        name={kind === "image" ? "image" : "sparkles"}
        label={model ? `当前模型：${model}，选择模型` : "选择模型"}
        onPress={onModel}
      />
      <ComposerIcon name="sliders" label="参数选项" onPress={onParameters} />
      <ComposerIcon name="extensions" label="扩展选择" onPress={onExtensions} />
      <ComposerIcon
        name="microphone"
        label={
          voiceDisabled || busy || running
            ? "语音输入暂不可用，请先完成当前操作或处理存储错误"
            : voiceState === "off"
              ? "开启语音输入"
              : "关闭语音输入"
        }
        disabled={voiceDisabled || busy || running}
        selected={voiceState !== "off"}
        onPress={onVoice}
      />
      <ComposerIcon
        name={running ? "pause" : "send"}
        label={running ? "停止生成" : "发送"}
        solid
        busy={busy && !running}
        disabled={!running && blocked}
        onPress={onSend}
      />
    </View>
  );
}
export function ComposerIcon({
  name,
  label,
  onPress,
  disabled = false,
  busy = false,
  solid = false,
  selected = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  solid?: boolean;
  selected?: boolean;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions(),
    size = width < 360 ? 44 : touchTarget;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy, selected }}
      aria-pressed={selected}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor:
          solid || selected ? (disabled ? t.tertiary : t.text) : t.selected,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.65 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={solid || selected ? t.input : t.text}
        />
      ) : (
        <Icon
          name={name}
          size={size === 44 ? 28 : 32}
          color={solid || selected ? t.input : t.text}
        />
      )}
    </Pressable>
  );
}
