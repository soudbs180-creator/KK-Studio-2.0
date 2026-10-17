import { useApplication } from "../../application/AppProvider.tsx";
import { Action, Card, Label, Row } from "../../ui/primitives.tsx";
import { useAction } from "../../ui/useAction.ts";
export function GeneralSettings() {
  const { app, state } = useApplication(),
    { busy, run } = useAction();
  return (
    <Card>
      <Label title>通用</Label>
      <Label>主题</Label>
      <Row>
        {(["system", "light", "dark"] as const).map((theme, i) => (
          <Action
            key={theme}
            compact
            busy={busy}
            selected={state.snapshot?.preferences.theme === theme}
            label={["跟随系统", "浅色", "深色"][i]}
            onPress={() => void run(() => app.saveTheme(theme))}
          />
        ))}
      </Row>
      <Label muted small>
        使用系统字体缩放与手机触控目标。界面无必需动画。
      </Label>
    </Card>
  );
}
