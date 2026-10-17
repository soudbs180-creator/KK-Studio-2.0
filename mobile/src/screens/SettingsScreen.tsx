import { Content, Header, Screen } from "../ui/primitives.tsx";
import { GeneralSettings } from "./settings/GeneralSettings.tsx";
import { AccountStorageSettings } from "./settings/AccountStorageSettings.tsx";
import { AccessSettings } from "./settings/AccessSettings.tsx";
import { AdvancedSettings } from "./settings/AdvancedSettings.tsx";
export default function SettingsScreen() {
  return (
    <Screen>
      <Header title="设置" back />
      <Content>
        <GeneralSettings />
        <AccountStorageSettings />
        <AccessSettings />
        <AdvancedSettings />
      </Content>
    </Screen>
  );
}
