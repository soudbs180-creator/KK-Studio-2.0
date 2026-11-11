import type { ReactNode } from "react";
import SettingsInfoHint from "./SettingsInfoHint";

export default function SettingsTitleRow({
  id,
  label,
  description,
  children,
}: {
  id?: string;
  label?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-title-row">
      {children}
      {description && id && (
        <SettingsInfoHint id={id} label={label ?? "查看说明"}>
          {description}
        </SettingsInfoHint>
      )}
    </div>
  );
}
