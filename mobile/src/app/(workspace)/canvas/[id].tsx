import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useApplication } from "../../../application/AppProvider.tsx";
import { Action, Content, Empty, Header, Screen } from "../../../ui/primitives.tsx";

/**
 * Mobile Canvas Route Guard
 * Conforms to Figma Specification 597:67456 & 91:11:
 * Mobile viewports (<=767px) strictly disallow infinite canvas and node editing.
 * Automatically opens the project in the single-column Chat screen.
 */
export default function MobileCanvasGuardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { app, state } = useApplication();
  const project = state.snapshot?.projects.find((p) => p.id === id);

  useEffect(() => {
    if (project && project.id !== state.snapshot?.activeProjectId) {
      void app.openProject(project.id).then(() => {
        router.replace("/");
      });
    } else if (project) {
      router.replace("/");
    }
  }, [project, state.snapshot?.activeProjectId, app]);

  return (
    <Screen>
      <Header title="创作界面" back />
      <Content>
        <Empty
          title="移动端已切换至单列会话"
          description="依据官方规范，手机端专注单列会话创作流。无限画布与节点编排请在桌面端或平板端打开。"
        >
          <Action
            primary
            label="进入会话创作"
            onPress={() => router.replace("/")}
          />
        </Empty>
      </Content>
    </Screen>
  );
}
