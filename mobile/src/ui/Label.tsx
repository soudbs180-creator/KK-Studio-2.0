import type { ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useTheme } from "./theme.tsx";
import { typography } from "./geometry.ts";
export function Label({
  children,
  muted = false,
  title = false,
  small = false,
  danger = false,
  hero = false,
  style,
  numberOfLines,
  selectable = true,
}: {
  children: ReactNode;
  muted?: boolean;
  title?: boolean;
  small?: boolean;
  danger?: boolean;
  hero?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const t = useTheme();
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[
        {
          color: danger ? t.danger : muted ? t.muted : t.text,
          ...(hero
            ? typography.hero
            : title
              ? typography.title
              : small
                ? typography.supporting
                : typography.body),
          fontWeight: title || hero ? "600" : "400",
          flexShrink: 1,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
