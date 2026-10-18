import type { RefObject } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { CreationDraft } from "@kk-studio/creation-contracts";
import { Label } from "../ui/primitives.tsx";
import { useTheme, touchTarget } from "../ui/theme.tsx";
import { ComposerIcon } from "./ComposerToolbar.tsx";

export function ComposerInput({
  draft,
  input,
  active,
  expanded,
  onChange,
  onFocus,
  onModel,
  onExpand,
}: {
  draft: CreationDraft;
  input: RefObject<TextInput | null>;
  active: boolean;
  expanded: boolean;
  onChange: (prompt: string) => void;
  onFocus: () => void;
  onModel: () => void;
  onExpand: () => void;
}) {
  const t = useTheme();
  return (
    <>
      {Boolean(draft.model) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`切换模型：${draft.model}`}
          onPress={onModel}
          style={{ minHeight: touchTarget, justifyContent: "center" }}
        >
          <Label small muted numberOfLines={1}>
            {draft.model}
          </Label>
        </Pressable>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: active ? "flex-start" : "center",
          gap: 4,
        }}
      >
        <TextInput
          ref={input}
          multiline
          accessibilityLabel={
            draft.kind === "image" ? "描述想生成的图片" : "创作输入"
          }
          placeholder={
            draft.kind === "image"
              ? "描述想生成或修改的图片…"
              : "与 KK Studio 对话"
          }
          value={draft.prompt}
          onChangeText={onChange}
          onFocus={onFocus}
          placeholderTextColor={t.tertiary}
          selectionColor={t.accent}
          cursorColor={t.accent}
          underlineColorAndroid="transparent"
          textAlignVertical="top"
          style={{
            flex: 1,
            minWidth: 0,
            color: t.text,
            fontSize: 16,
            lineHeight: 24,
            minHeight: touchTarget,
            paddingVertical: active ? 4 : 8,
            paddingHorizontal: active ? 0 : 4,
            maxHeight: expanded ? 240 : 132,
          }}
        />
        <ComposerIcon
          name="more"
          label={expanded ? "收起输入" : "展开输入"}
          onPress={onExpand}
        />
      </View>
    </>
  );
}
