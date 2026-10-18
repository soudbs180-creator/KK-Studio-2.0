import { radii } from "./geometry.ts";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "./theme.tsx";
import { Action, Label } from "./primitives.tsx";

export function Sheet({
  title,
  open,
  onClose,
  children,
  side = false,
  size = "large",
  footer,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: boolean;
  size?: "compact" | "medium" | "large" | "full";
  footer?: ReactNode;
}) {
  const t = useTheme(),
    insets = useSafeAreaInsets(),
    { width, height } = useWindowDimensions();
  const available = Math.max(0, height - insets.top - 12),
    ratio = { compact: 0.4, medium: 0.6, large: 0.8, full: 1 }[size];
  return (
    <Modal
      transparent
      visible={open}
      animationType="none"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: t.overlay,
          justifyContent: side ? "flex-start" : "flex-end",
          alignItems: side ? "stretch" : "center",
          flexDirection: side ? "row" : "column",
        }}
      >
        <Pressable
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, left: 0, bottom: 0 }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={
            side
              ? { width: Math.min(400, width - 64), height: "100%" }
              : {
                  maxHeight: available * ratio,
                  width: Math.min(720, width - insets.left - insets.right),
                }
          }
        >
          <SafeAreaView
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            edges={side ? ["top", "bottom", "left"] : ["bottom"]}
            style={{
              backgroundColor: t.raised,
              borderTopLeftRadius: side ? 0 : radii.panel,
              borderTopRightRadius: side ? 0 : radii.panel,
              borderWidth: 1,
              borderColor: t.subtleBorder,
              flexShrink: 1,
              height: side ? "100%" : undefined,
            }}
          >
            {!side && (
              <View
                accessible={false}
                style={{ alignItems: "center", paddingTop: 12 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: t.controlBorder,
                  }}
                />
              </View>
            )}
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                minHeight: 64,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label
                  title
                  selectable={false}
                  style={{
                    fontSize: side ? 24 : 18,
                    lineHeight: side ? 32 : 26,
                  }}
                >
                  {title}
                </Label>
              </View>
              <Action
                compact
                quiet
                iconOnly
                icon="close"
                label="关闭面板"
                onPress={onClose}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                gap: side ? 4 : 12,
                paddingHorizontal: side ? 12 : 20,
                paddingBottom: 16,
              }}
              style={{ flexShrink: 1 }}
            >
              {children}
            </ScrollView>
            {footer && (
              <View
                style={{
                  padding: 16,
                  paddingBottom: Math.max(insets.bottom, 16),
                  borderTopWidth: 1,
                  borderColor: t.border,
                }}
              >
                {footer}
              </View>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
