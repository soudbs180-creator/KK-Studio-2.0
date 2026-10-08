import UiIcon from "../UiIcon";

interface AssetActionsProps {
  busy: boolean;
  onCreate: () => void;
  onImport: () => void;
}

export default function AssetActions({
  busy,
  onCreate,
  onImport,
}: AssetActionsProps) {
  return (
    <div className="asset-bottom-actions">
      <button className="kk-button kk-button--primary" onClick={onCreate}>
        <UiIcon name="add" size={14} />
        创建主体
      </button>
      <button
        className="kk-button kk-button--secondary"
        disabled={busy}
        onClick={onImport}
      >
        <UiIcon name="upload" size={14} />
        {busy ? "正在导入" : "导入资源包"}
      </button>
    </div>
  );
}
