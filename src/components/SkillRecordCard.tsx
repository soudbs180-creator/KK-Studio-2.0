import type {
  SkillRecord,
  SkillRegistry,
} from "../features/skills/skillRegistry";

export default function SkillRecordCard({
  record,
  registry,
  onApply,
  onEdit,
  onExport,
  onStatus,
}: {
  record: SkillRecord;
  registry: SkillRegistry;
  onApply?: (record: SkillRecord) => string | void;
  onEdit: (record: SkillRecord) => void;
  onExport: (record: SkillRecord) => void;
  onStatus: (message: string) => void;
}) {
  const redraw = (message: string) => onStatus(message);
  return (
    <article className="catalog-card">
      <div className="catalog-card-image workflow-image workflow-image-0">
        <strong>{record.manifest.category}</strong>
        <span>{record.enabled ? "已启用" : "已停用"}</span>
      </div>
      <div className="catalog-card-body">
        <strong>{record.manifest.name}</strong>
        <p>{record.manifest.description}</p>
        <small>
          {record.manifest.author} · v{record.manifest.version} ·{" "}
          {record.installed ? "本地已安装" : "未安装"}
        </small>
      </div>
      <div className="catalog-page-actions">
        <button
          type="button"
          className="ui-button"
          onClick={() => {
            const message = onApply?.(record);
            if (message) onStatus(message);
          }}
          disabled={
            !record.installed ||
            !record.enabled ||
            record.instructions.length > 3600
          }
          title={
            record.instructions.length > 3600
              ? "Skill 指令过长，应用后可能超过图片任务的 4000 字限制。"
              : undefined
          }
        >
          应用到草稿
        </button>
        <button
          type="button"
          className="ui-button"
          onClick={() => onEdit(record)}
        >
          编辑
        </button>
        <button
          type="button"
          className="ui-button"
          onClick={() => onExport(record)}
        >
          导出
        </button>
        {record.installed ? (
          <>
            <button
              type="button"
              className="ui-button"
              onClick={() =>
                redraw(
                  registry.setEnabled(record.manifest.id, !record.enabled)
                    ? record.enabled
                      ? "Skill 已停用。"
                      : "Skill 已启用。"
                    : "保存失败，状态未改变。",
                )
              }
            >
              {record.enabled ? "停用" : "启用"}
            </button>
            <button
              type="button"
              className="ui-button"
              onClick={() =>
                redraw(
                  registry.uninstall(record.manifest.id)
                    ? "Skill 已卸载；本地指令仍保留，可再次安装。"
                    : "卸载失败，原记录未改变。",
                )
              }
            >
              卸载
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ui-button"
            onClick={() =>
              redraw(
                registry.install(record.manifest.id)
                  ? "Skill 已安装。"
                  : "安装失败，原记录未改变。",
              )
            }
          >
            安装
          </button>
        )}
      </div>
    </article>
  );
}
