import { useState } from "react";
import { FlatList, Image, Share, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useApplication } from "../application/AppProvider.tsx";
import {
  Action,
  Empty,
  Header,
  Label,
  Row,
  Screen,
} from "../ui/primitives.tsx";
import { useTheme } from "../ui/theme.tsx";
import { useAction } from "../ui/useAction.ts";
import { Status } from "../ui/Status.tsx";
import { PhoneMenu } from "./PhoneMenu.tsx";
import { Composer } from "./Composer.tsx";
import { TaskOutput } from "../ui/TaskResults.tsx";

export default function ChatScreen() {
  const { app, state } = useApplication(),
    t = useTheme(),
    { busy, run } = useAction(),
    [menu, setMenu] = useState(false);
  const project = state.snapshot?.projects.find(
    (item) => item.id === state.snapshot?.activeProjectId,
  );
  return (
    <Screen keyboard chat>
      <Header
        title={project?.name ?? "KK Studio"}
        left={
          <Action
            compact
            quiet
            iconOnly
            icon="menu"
            label="打开菜单"
            style={{ backgroundColor: t.surface, borderRadius: 24 }}
            onPress={() => setMenu(true)}
          />
        }
        right={
          <Action
            compact
            quiet
            iconOnly
            icon="newChat"
            label="新创作"
            style={{ backgroundColor: t.surface, borderRadius: 24 }}
            disabled={busy}
            onPress={() => void run(() => app.createProject("新创作"))}
          />
        }
      />
      {project ? (
        <>
          <FlatList
            data={project.tasks}
            keyExtractor={(task) => task.id}
            initialNumToRender={8}
            windowSize={5}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 16,
              paddingTop: 24,
              paddingBottom: 12,
              gap: 28,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Empty
                title="你想创造什么？"
                description="写下想法，开始对话或生成图片。"
              >
                <Action
                  compact
                  quiet
                  label="选择模型连接"
                  onPress={() => router.push("/connections")}
                />
              </Empty>
            }
            renderItem={({ item: task }) => (
              <View style={{ gap: 16 }}>
                <View
                  style={{
                    marginLeft: 44,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 20,
                    backgroundColor: t.userBubble,
                    alignSelf: "stretch",
                  }}
                >
                  <Label>{task.prompt}</Label>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <Image
                    source={require("../../assets/icon.png")}
                    accessibilityLabel="KK Studio"
                    style={{ width: 24, height: 24, borderRadius: 12 }}
                  />
                  <Label small style={{ fontWeight: "600" }}>
                    KK Studio
                  </Label>
                  <Label
                    muted
                    small
                    numberOfLines={1}
                    style={{ flexShrink: 1 }}
                  >
                    {task.model || "模型未报告"}
                  </Label>
                </View>
                {task.status !== "succeeded" && <Status status={task.status} />}
                {task.outputs?.map((output) =>
                  output.status === "succeeded" && output.text !== undefined ? (
                    <View key={output.index} style={{ gap: 10 }}>
                      <Label>{output.text}</Label>
                      <Row>
                        <Action
                          compact
                          quiet
                          iconOnly
                          icon="copy"
                          label="复制"
                          onPress={() =>
                            void run(async () => {
                              if (
                                !(await Clipboard.setStringAsync(output.text!))
                              )
                                throw new Error(
                                  "当前平台未能复制，请选择文字后手动复制。",
                                );
                            })
                          }
                        />
                        <Action
                          compact
                          quiet
                          iconOnly
                          icon="share"
                          label="分享文字"
                          onPress={() =>
                            void run(() =>
                              Share.share({ message: output.text! }),
                            )
                          }
                        />
                      </Row>
                    </View>
                  ) : output.assetId ? (
                    <TaskOutput key={output.index} output={output} />
                  ) : null,
                )}
                {Boolean(state.streams[task.id]) &&
                  task.status !== "succeeded" && (
                    <Label>{state.streams[task.id]}</Label>
                  )}
                {Boolean(task.error) && (
                  <Label small danger>
                    {task.error}
                  </Label>
                )}
                <Row>
                  <Action
                    compact
                    quiet
                    icon="clock"
                    label="任务详情"
                    onPress={() =>
                      router.push({
                        pathname: "/tasks/[id]",
                        params: { id: task.id },
                      })
                    }
                  />
                  <Action
                    compact
                    quiet
                    label="消息记录"
                    onPress={() => router.push("/messages")}
                  />
                </Row>
              </View>
            )}
          />
          <Composer
            key={`${state.accountId!}:${project.id}`}
            project={project}
          />
        </>
      ) : (
        <Empty title="开始一次新创作" description="让想法变成文字和图片。">
          <Action
            primary
            label="新创作"
            busy={busy}
            icon="plus"
            onPress={() => void run(() => app.createProject("新创作"))}
          />
        </Empty>
      )}
      <PhoneMenu open={menu} onClose={() => setMenu(false)} />
    </Screen>
  );
}
