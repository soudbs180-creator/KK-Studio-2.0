import { Action } from "./Action.tsx";
import { radii, spacing, typography } from "./geometry.ts";
import { Label } from "./Label.tsx";
import { Icon } from "./Icon.tsx";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme, touchTarget } from "./theme.tsx";
import { useApplication } from "../application/AppProvider.tsx";

export { Label } from "./Label.tsx";
export { Action } from "./Action.tsx";
export { Icon } from "./Icon.tsx";

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Label small muted>
        {label}
      </Label>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={t.tertiary}
        selectionColor={t.accent}
        cursorColor={t.accent}
        underlineColorAndroid="transparent"
        style={[
          {
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            minHeight: touchTarget,
            ...typography.body,
            color: t.text,
            backgroundColor: t.input,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Card({
  children,
  quiet = false,
  style,
}: {
  children: ReactNode;
  quiet?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radii.card,
          padding: quiet ? 0 : 16,
          gap: 12,
          backgroundColor: quiet ? "transparent" : t.surface,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Row({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: spacing.controls,
      }}
    >
      {children}
    </View>
  );
}
export function Header({
  title,
  back = false,
  left,
  right,
}: {
  title: string;
  back?: boolean;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 64,
        gap: 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View style={{ minWidth: touchTarget }}>
        {back ? (
          <Action
            compact
            iconOnly
            icon="back"
            label="返回"
            style={{ backgroundColor: t.surface, borderRadius: 24 }}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
        ) : (
          (left ?? <View style={{ width: touchTarget }} />)
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Label
          title
          selectable={false}
          numberOfLines={1}
          style={{ textAlign: "center", fontSize: 18, lineHeight: 26 }}
        >
          {title}
        </Label>
      </View>
      <View style={{ minWidth: touchTarget }}>
        {right ?? <View style={{ width: touchTarget }} />}
      </View>
    </View>
  );
}
export function Screen({
  children,
  keyboard = false,
  chat = false,
}: {
  children: ReactNode;
  keyboard?: boolean;
  chat?: boolean;
}) {
  const t = useTheme(),
    { app, state } = useApplication();
  const content = (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{
        flex: 1,
        backgroundColor: chat ? t.chatBackground : t.background,
      }}
    >
      {Boolean(state.error || state.storageError) && (
        <View
          accessibilityRole="alert"
          style={{ padding: 14, gap: 8, backgroundColor: t.surface }}
        >
          <Label small danger>
            {state.storageError ?? state.error}
          </Label>
          <Row>
            {Boolean(state.storageError) &&
              !state.legacyStorageGate &&
              [
                "ready",
                "local",
                "storageRecovery",
                "localStorageRecovery",
              ].includes(state.auth) && (
                <Action
                  compact
                  label="重新读取存储"
                  onPress={() =>
                    void app.reloadStorage().catch((error) => app.report(error))
                  }
                />
              )}
            {Boolean(state.error) && (
              <Action
                compact
                label="关闭提示"
                onPress={() => app.clearError()}
              />
            )}
          </Row>
        </View>
      )}
      {children}
    </SafeAreaView>
  );
  return keyboard ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );
}
export function Content({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: spacing.page,
        paddingBottom: 32,
        gap: spacing.section,
        flexGrow: 1,
        width: "100%",
        maxWidth: 720,
        alignSelf: "center",
      }}
    >
      {children}
    </ScrollView>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 14,
        paddingVertical: 48,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ marginBottom: 4 }}>
        <Icon name="sparkles" size={32} color={t.text} />
      </View>
      <Label title style={{ textAlign: "center" }}>
        {title}
      </Label>
      <Label muted small style={{ textAlign: "center", maxWidth: 300 }}>
        {description}
      </Label>
      {children}
    </View>
  );
}
