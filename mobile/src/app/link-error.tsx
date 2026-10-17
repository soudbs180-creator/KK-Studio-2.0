import { router } from "expo-router";
import { Action, Content, Empty, Header, Screen } from "../ui/primitives.tsx";
export default function LinkError() {
  return (
    <Screen>
      <Header title="无法打开链接" />
      <Content>
        <Empty
          title="请从设备里的记录打开"
          description="链接不正确，或目标不属于当前设备账号。重新登录原账号后，可从项目、素材或任务列表打开记录。外部地址及链接中的凭据不会被使用。"
        >
          <Action
            primary
            label="返回创作"
            onPress={() => router.replace("/")}
          />
        </Empty>
      </Content>
    </Screen>
  );
}
