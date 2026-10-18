import { useTheme } from "../ui/theme.tsx";
import { useState } from "react";
import { Platform, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import {
  Action,
  Card,
  Content,
  Field,
  Header,
  Label,
  Row,
  Screen,
  Empty,
} from "../ui/primitives.tsx";
import { useAction } from "../ui/useAction.ts";
import type { ProviderConnection } from "../services/providerTypes.ts";
import { isTwelveAiConnection } from "../services/twelveAiProtocol.ts";
export default function ConnectionEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { app, state } = useApplication(),
    { busy, run } = useAction(),
    t = useTheme();
  const existing = state.snapshot?.connections.find((c) => c.id === id),
    [name, setName] = useState(existing?.name ?? ""),
    [url, setUrl] = useState(existing?.baseUrl ?? "https://api.openai.com/v1"),
    [key, setKey] = useState("");
  const [protocol, setProtocol] = useState<ProviderConnection["protocol"]>(
      existing?.protocol === "kk-image-jobs"
        ? "kk-image-jobs"
        : "openai-compatible",
    ),
    [text, setText] = useState(existing?.capabilities?.text ?? true),
    [image, setImage] = useState(existing?.capabilities?.image ?? false),
    [max, setMax] = useState(String(existing?.capabilities?.maxOutputs ?? 1));
  if (existing?.protocol === "comfyui")
    return (
      <Screen>
        <Header title="ComfyUI 连接" back />
        <Content>
          <Empty
            title="此连接使用独立工作流协议"
            description="此连接使用独立工作流协议，请在 ComfyUI 控制台管理连接与工作流。"
          />
          <Action
            primary
            label="打开 ComfyUI 控制台"
            onPress={() => router.replace(`/comfy/${existing.id}`)}
          />
        </Content>
      </Screen>
    );
  return (
    <Screen keyboard>
      <Header title={existing ? "编辑连接" : "添加连接"} back />
      <Content>
        <Card>
          <Field label="连接名称" value={name} onChangeText={setName} />
          <Field
            label={
              app.deps.allowLoopbackHttp
                ? "API 地址（开发允许本机 HTTP）"
                : "HTTPS API 地址"
            }
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Field
            label={
              existing
                ? "API Key（留空保留当前凭据）"
                : "API Key / Gateway 应用令牌"
            }
            value={key}
            onChangeText={setKey}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="off"
          />
          <Label muted small>
            {Platform.OS === "web"
              ? "浏览器预览的 Key 只在内存中，刷新后需要重新填写。"
              : "Key 只进入设备安全凭据库。项目、备份和日志不包含 Key。"}
          </Label>
        </Card>
        <Card>
          <Label>协议</Label>
          <Row>
            <Action
              compact
              selected={protocol === "openai-compatible"}
              label="兼容 OpenAI"
              onPress={() => setProtocol("openai-compatible")}
            />
            <Action
              compact
              selected={protocol === "kk-image-jobs"}
              label="KK 图片作业"
              onPress={() => {
                setProtocol("kk-image-jobs");
                setText(false);
                setImage(true);
              }}
            />
          </Row>
          <Label muted small>
            只启用服务端确实提供的端点。模型名称不能证明能力；真实生成需要你的服务权限与额度。
          </Label>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Label>文本生成端点</Label>
            <Switch
              trackColor={{ false: t.selected, true: t.accent }}
              thumbColor={t.onAccent}
              ios_backgroundColor={t.selected}
              accessibilityLabel="启用文本端点"
              value={text}
              disabled={protocol === "kk-image-jobs"}
              onValueChange={setText}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Label>图片生成端点</Label>
            <Switch
              trackColor={{ false: t.selected, true: t.accent }}
              thumbColor={t.onAccent}
              ios_backgroundColor={t.selected}
              accessibilityLabel="启用图片端点"
              value={image}
              onValueChange={setImage}
            />
          </View>
          {image && (
            <Field
              label="服务端支持的最大数量（1–4）"
              value={max}
              onChangeText={setMax}
              keyboardType="number-pad"
            />
          )}
          <Label muted small>
            兼容适配器支持文字和无参考图生成；官方 12ai 连接的 GPT Image
            指定模型支持图片参考，另提供指定模型的文生视频。遮罩与高级参数未接入。
          </Label>
        </Card>
        <Action
          primary
          label="保存连接"
          busy={busy}
          disabled={!name.trim() || (!text && !image)}
          onPress={() =>
            void run(async () => {
              const count = Number(max);
              if (!Number.isInteger(count) || count < 1 || count > 4)
                throw new Error("图片数量应为 1–4。");
              await app.saveConnection(
                {
                  id: existing?.id,
                  name,
                  baseUrl: url,
                  protocol,
                  capabilities: {
                    text,
                    image,
                    maxOutputs: image ? count : 1,
                    ...(existing?.capabilities?.imageSizes
                      ? { imageSizes: existing.capabilities.imageSizes }
                      : image &&
                          isTwelveAiConnection({
                            baseUrl: url.trim(),
                            protocol,
                          })
                        ? {
                            imageSizes: [
                              "auto",
                              "1248x1248",
                              "1536x1024",
                              "1024x1536",
                            ],
                          }
                        : {}),
                  },
                },
                key,
              );
              setKey("");
              router.back();
            })
          }
        />
      </Content>
    </Screen>
  );
}
