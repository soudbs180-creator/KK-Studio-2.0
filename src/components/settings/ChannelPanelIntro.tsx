import { isLongSettingsDescription } from "./SettingsInfoHint";
import SettingsTitleRow from "./SettingsTitleRow";

export default function ChannelPanelIntro({
  channel,
}: {
  channel: { id: string; label: string; title: string; desc: string };
}) {
  const longDescription = isLongSettingsDescription(channel.desc);
  return (
    <div className="channel-panel-intro">
      <SettingsTitleRow
        id={`channel-${channel.id}`}
        label={`查看${channel.label}说明`}
        description={longDescription ? channel.desc : undefined}
      >
        <h3 className="panel-title">{channel.title}</h3>
      </SettingsTitleRow>
      {!longDescription && <p className="panel-desc">{channel.desc}</p>}
    </div>
  );
}
