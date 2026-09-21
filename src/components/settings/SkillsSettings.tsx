import { useEffect, useState } from "react";
import {
  SKILLS_CHANGED_EVENT,
  type SkillRegistry,
} from "../../features/skills/skillRegistry";

export default function SkillsSettings({
  registry,
}: {
  registry: SkillRegistry;
}) {
  const [, refresh] = useState(0);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const sync = () => refresh((value) => value + 1);
    window.addEventListener(SKILLS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SKILLS_CHANGED_EVENT, sync);
  }, []);
  const records = registry.listRecords();
  return (
    <div className="settings-detail-stack">
      <p className="settings-section-intro">
        本地 Skill
        只保存指令模板和非敏感元数据。启用不会自动运行脚本或连接云端。
      </p>
      {records.map((record) => (
        <div className="settings-info-row" key={record.manifest.id}>
          <div>
            <strong>{record.manifest.name}</strong>
            <span>
              {record.manifest.category} · v{record.manifest.version}
            </span>
          </div>
          <button
            type="button"
            className="settings-action"
            onClick={() => {
              const changed = registry.setEnabled(
                record.manifest.id,
                !record.enabled,
              );
              if (changed) {
                setStatus("");
              } else setStatus("保存失败，Skill 状态未改变。");
            }}
            disabled={!record.installed}
          >
            {record.enabled ? "停用" : "启用"}
          </button>
        </div>
      ))}
      {!records.length && (
        <div className="settings-empty-state">
          <strong>暂无本地 Skill</strong>
          <p>请从 Skill 页面创建或导入模板。</p>
        </div>
      )}
      {status && (
        <p className="settings-feedback is-error" role="alert">
          {status}
        </p>
      )}
    </div>
  );
}
