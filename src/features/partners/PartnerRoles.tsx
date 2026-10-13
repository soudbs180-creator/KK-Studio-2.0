import { useState } from "react";
import { PARTNER_ROLES, partnerInstructions } from "./partnerRoleData";

export default function PartnerRoles({
  query = "",
  onApply,
  onOpenModels,
  onStatus,
}: {
  query?: string;
  onApply?: (instructions: string) => string | void;
  onOpenModels?: () => void;
  onStatus?: (message: string) => void;
}) {
  const [selected, setSelected] = useState(PARTNER_ROLES[0]);
  const [status, setStatus] = useState("");
  const [copying, setCopying] = useState(false);
  const visible = PARTNER_ROLES.filter((role) =>
    `${role.name}${role.responsibility}`.includes(query.trim()),
  );
  const current = visible.find((role) => role.id === selected.id) ?? visible[0];
  const report = (message: string) => {
    setStatus(message);
    onStatus?.(message);
  };
  return (
    <div className="partner-roles">
      <p className="extension-boundary">
        伙伴是承担专门任务的 AI 角色。先选职责，再使用已接入的模型。
      </p>
      <div className="partner-role-grid" role="group" aria-label="协作角色">
        {visible.map((role) => (
          <button
            key={role.id}
            type="button"
            className="partner-role-card"
            aria-pressed={current?.id === role.id}
            onClick={() => {
              setSelected(role);
              setStatus("");
            }}
          >
            <strong>{role.name}</strong>
            <span>{role.responsibility}</span>
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="extension-boundary" role="status">
          没有匹配的协作角色。
        </p>
      )}
      {current && (
        <div className="partner-role-detail">
          <h3>{current.name}</h3>
          <p>{current.deliverable}</p>
          <p>
            所需能力：{current.modelRequirement}
            。在模型菜单选择本次任务的执行模型。
          </p>
          <div className="settings-action-group">
            {onApply ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  try {
                    report(
                      onApply(partnerInstructions(current)) ??
                        "角色说明已加入创作草稿。",
                    );
                  } catch (error) {
                    report(
                      error instanceof Error
                        ? error.message
                        : "角色说明应用失败，请检查当前草稿。",
                    );
                  }
                }}
              >
                应用到草稿
              </button>
            ) : (
              <button
                type="button"
                className="ui-button"
                disabled={copying}
                onClick={async () => {
                  setCopying(true);
                  try {
                    await navigator.clipboard.writeText(
                      partnerInstructions(current),
                    );
                    report("角色说明已复制，可粘贴到创作草稿。");
                  } catch {
                    report("无法写入剪贴板，请从扩展页面应用角色说明。");
                  } finally {
                    setCopying(false);
                  }
                }}
              >
                {copying ? "正在复制…" : "复制任务说明"}
              </button>
            )}
            {onOpenModels && (
              <button
                type="button"
                className="ui-button"
                onClick={onOpenModels}
              >
                模型接入
              </button>
            )}
          </div>
          <small>
            当前可应用角色说明，由创作区所选模型执行；自动分派不同模型尚未接入。
          </small>
        </div>
      )}
      {status && !onStatus && <p role="status">{status}</p>}
    </div>
  );
}
