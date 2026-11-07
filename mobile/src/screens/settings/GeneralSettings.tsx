import { useApplication } from "../../application/AppProvider.tsx";
import { View } from "react-native";
import { Action, Card, Label } from "../../ui/primitives.tsx";
import { settingsGeometry, spacing } from "../../ui/geometry.ts";
import { useAction } from "../../ui/useAction.ts";
export function GeneralSettings() {
  const { app, state } = useApplication(),
    { busy, run } = useAction();
  return (
    <Card quiet>
      <Label title style={{ lineHeight: settingsGeometry.titleLineHeight }}>
        通用
      </Label>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.page,
        }}
      >
        <Label>主题</Label>
        <View style={{ flex: 1, flexDirection: "row", gap: spacing.controls }}>
          {(["system", "light", "dark"] as const).map((theme, i) => (
            <Action
              key={theme}
              compact
              segment
              style={theme === "system" ? { flex: 1 } : undefined}
              busy={busy}
              selected={state.snapshot?.preferences.theme === theme}
              label={["跟随系统", "浅色", "深色"][i]}
              onPress={() => void run(() => app.saveTheme(theme))}
            />
          ))}
        </View>
      </View>
      <Label muted small>
        使用系统字体缩放与手机触控目标。界面无必需动画。
      </Label>
    </Card>
  );
}
