import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme, touchTarget } from "./theme.tsx";
import { radii, settingsGeometry, spacing, typography } from "./geometry.ts";
import { actionAppearance } from "./actionAppearance.ts";
import { Label } from "./Label.tsx";
import { Icon, type IconName } from "./Icon.tsx";

export function Action({
  label,
  onPress,
  disabled,
  reason,
  primary = false,
  selected = false,
  menu = false,
  danger = false,
  busy = false,
  compact = false,
  icon,
  iconOnly = false,
  quiet = false,
  segment = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  reason?: string;
  primary?: boolean;
  selected?: boolean;
  menu?: boolean;
  danger?: boolean;
  busy?: boolean;
  compact?: boolean;
  icon?: IconName;
  iconOnly?: boolean;
  quiet?: boolean;
  segment?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const graphicSize = iconOnly ? (touchTarget === 44 ? 28 : 32) : 16;
  return (
    <View style={[compact || iconOnly ? { flexShrink: 1 } : { gap: 4 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={reason}
        accessibilityState={{ disabled: disabled || busy, busy, selected }}
        aria-pressed={selected}
        disabled={disabled || busy}
        onPress={onPress}
        style={({ pressed }) => {
          const colors = actionAppearance(t, {
            primary,
            selected,
            pressed,
            danger,
            segment,
            quiet: quiet || menu || compact || iconOnly,
          });
          return {
            minHeight: segment ? settingsGeometry.controlHeight : touchTarget,
            minWidth: touchTarget,
            paddingVertical: iconOnly ? 0 : 10,
            paddingHorizontal: iconOnly
              ? 0
              : segment
                ? spacing.content
                : compact
                  ? 10
                  : 16,
            borderRadius: segment
              ? radii.control
              : iconOnly
                ? 24
                : primary
                  ? 24
                  : radii.menu,
            backgroundColor: colors.background,
            borderWidth: 0,
            opacity: disabled || busy ? 0.4 : primary && pressed ? 0.8 : 1,
            alignItems: "center",
            justifyContent: menu ? "flex-start" : "center",
            flexDirection: "row",
            gap: segment ? spacing.controls : 12,
          };
        }}
      >
        {({ pressed }) => {
          const foreground = actionAppearance(t, {
            primary,
            danger,
            segment,
            selected,
            pressed,
          }).foreground;
          return (
            <>
              {busy ? (
                <ActivityIndicator size={graphicSize} color={foreground} />
              ) : icon ? (
                <Icon name={icon} color={foreground} size={graphicSize} />
              ) : null}
              {!iconOnly && (
                <Text
                  numberOfLines={segment ? 1 : undefined}
                  style={{
                    color: foreground,
                    ...typography.body,
                    fontWeight: primary ? "600" : "500",
                    flexShrink: 1,
                    flex: menu ? 1 : undefined,
                  }}
                >
                  {label}
                </Text>
              )}
              {selected && !primary && !iconOnly && (
                <Icon name="check" size={16} color={t.text} />
              )}
              {menu && !selected && (
                <View style={{ transform: [{ rotate: "-90deg" }] }}>
                  <Icon name="chevron" size={16} color={t.tertiary} />
                </View>
              )}
            </>
          );
        }}
      </Pressable>
      {Boolean(reason) && (
        <Label muted small>
          {reason}
        </Label>
      )}
    </View>
  );
}
