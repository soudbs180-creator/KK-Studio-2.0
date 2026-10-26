import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { CreationDraft } from "@kk-studio/creation-contracts";
import { Icon, type IconName } from "../ui/Icon.tsx";
import { useTheme, touchTarget } from "../ui/theme.tsx";

export function ComposerToolbar({
  kind,
  model,
  onModel,
  onAdd,
  onParameters,
  onExpand,
  expanded,
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
  onExpand: () => void;
  expanded: boolean;
  running: boolean;
  blocked: boolean;
  busy: boolean;
  onSend: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <ComposerIcon name="plus" label="添加到创作" onPress={onAdd} />
      {kind === "image" && (
        <ComposerIcon name="sliders" label="生成设置" onPress={onParameters} />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={model ? `当前模型：${model}，选择模型` : "选择模型"}
        onPress={onModel}
        style={({ pressed }) => ({
          minHeight: touchTarget,
          minWidth: touchTarget,
          flexShrink: 1,
          justifyContent: "center",
          paddingHorizontal: 4,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <View
          style={{
            backgroundColor: t.selected,
            borderRadius: 18,
            paddingVertical: 6,
            paddingHorizontal: 10,
            gap: 6,
            flexDirection: "row",
            alignItems: "center",
            maxWidth: "100%",
          }}
        >
          <Icon name={kind === "image" ? "image" : "sparkles"} size={16} />
          <Text
            numberOfLines={1}
            style={{
              minWidth: 0,
              flexShrink: 1,
              color: t.text,
              fontSize: 14,
              lineHeight: 20,
              fontWeight: "600",
            }}
          >
            {model || "选择模型"}
          </Text>
        </View>
      </Pressable>
      <View style={{ flex: 1 }} />
      <ComposerIcon
        name="more"
        label={expanded ? "收起输入" : "展开输入"}
        onPress={onExpand}
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
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  solid?: boolean;
}) {
  const t = useTheme();
  const graphicSize = touchTarget === 44 ? 28 : 32;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        width: touchTarget,
        height: touchTarget,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: touchTarget,
          height: touchTarget,
          borderRadius: touchTarget / 2,
          backgroundColor: solid
            ? disabled
              ? t.tertiary
              : t.text
            : t.selected,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {busy ? (
          <ActivityIndicator
            size={graphicSize}
            color={solid ? t.input : t.text}
          />
        ) : (
          <Icon
            name={name}
            size={graphicSize}
            color={solid ? t.input : t.text}
          />
        )}
      </View>
    </Pressable>
  );
}
