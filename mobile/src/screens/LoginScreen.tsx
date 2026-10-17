import { useState } from "react";
import { ActivityIndicator, Image, Platform, View } from "react-native";
import { useApplication } from "../application/AppProvider.tsx";
import { useAction } from "../ui/useAction.ts";
import { Action, Content, Field, Label, Screen } from "../ui/primitives.tsx";
import { useTheme } from "../ui/theme.tsx";
import { StorageRecovery } from "./StorageRecovery.tsx";

export default function LoginScreen() {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    t = useTheme();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [origin, setOrigin] = useState("https://kkai.plus"),
    [advanced, setAdvanced] = useState(false),
    [details, setDetails] = useState(false);
  return (
    <Screen keyboard>
      <Content>
        <View
          style={{
            alignItems: "center",
            paddingTop: 48,
            paddingBottom: 24,
            gap: 16,
          }}
        >
          <Image
            source={require("../../assets/icon.png")}
            accessibilityLabel="KK Studio"
            style={{ width: 64, height: 64, borderRadius: 16 }}
          />
          <Label hero selectable={false}>
            KK Studio
          </Label>
          <Label muted style={{ textAlign: "center" }}>
            创作，随身而行。
          </Label>
        </View>
        <View
          style={{ alignSelf: "center", width: "100%", maxWidth: 360, gap: 20 }}
        >
          {state.auth === "starting" ? (
            <View
              style={{ paddingVertical: 32, alignItems: "center", gap: 12 }}
            >
              <ActivityIndicator
                color={t.text}
                accessibilityLabel="正在恢复会话"
              />
              <Label muted small>
                正在恢复会话
              </Label>
            </View>
          ) : ["storageRecovery", "localStorageRecovery"].includes(
              state.auth,
            ) ? (
            <StorageRecovery />
          ) : (
            <>
              {Platform.OS === "web" && (
                <Action
                  primary
                  label="继续本机创作"
                  busy={busy}
                  onPress={() => void run(() => app.enterLocalMode())}
                />
              )}
              {state.auth === "expired" && (
                <Label small>
                  登录已过期。重新登录原账号后，继续设备中的草稿与创作。
                </Label>
              )}
              <Field
                label="邮箱"
                placeholder="你的邮箱"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Field
                label="密码"
                placeholder="输入密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
              />
              <Action
                primary
                label="登录"
                busy={busy || state.auth === "signingIn"}
                disabled={!email.trim() || !password}
                onPress={() =>
                  void run(async () => {
                    await app.login(email, password, origin);
                    setPassword("");
                  })
                }
              />
              <Action
                quiet
                compact
                label={advanced ? "收起服务地址" : "服务地址"}
                icon="sliders"
                onPress={() => setAdvanced(!advanced)}
              />
              {advanced && (
                <View style={{ gap: 12 }}>
                  <Field
                    label="身份服务地址"
                    value={origin}
                    onChangeText={setOrigin}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <Label muted small>
                    连接真实的 KK 身份服务。正式服务须使用 HTTPS。
                  </Label>
                  {Boolean(state.deviceId) && (
                    <Label muted small>
                      设备标识：{state.deviceId}
                    </Label>
                  )}
                </View>
              )}
            </>
          )}
          <View style={{ paddingTop: 16, gap: 8, alignItems: "center" }}>
            <Label muted small style={{ textAlign: "center" }}>
              创作记录保存在此设备
            </Label>
            <Action
              quiet
              compact
              label={details ? "收起数据说明" : "数据与隐私"}
              onPress={() => setDetails(!details)}
            />
            {details && (
              <View style={{ gap: 8 }}>
                <Label muted small>
                  设备中的项目与素材按账号隔离，登录不会开启云端同步。模型 API
                  Key 与登录账号分开管理。
                </Label>
                <Label muted small>
                  {Platform.OS === "web"
                    ? "免登录可继续本机创作。账号凭据和 API Key 仅在本次会话内持有，刷新后需重新连接。"
                    : "登录会话及 API Key 使用设备安全凭据库，项目备份不包含它们。"}
                </Label>
              </View>
            )}
          </View>
        </View>
      </Content>
    </Screen>
  );
}
