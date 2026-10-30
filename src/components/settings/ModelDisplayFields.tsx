export default function ModelDisplayFields({
  family,
  variant,
  aliases,
  setFamily,
  setVariant,
  setAliases,
}: {
  family: string;
  variant: string;
  aliases: string;
  setFamily: (value: string) => void;
  setVariant: (value: string) => void;
  setAliases: (value: string) => void;
}) {
  return (
    <div className="model-aliases-group">
      <div className="params-row">
        <label className="params-field">
          <span>模型分组名称</span>
          <input
            aria-label="模型分组名称"
            maxLength={120}
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            placeholder="留空自动识别末尾 2K / 4K"
          />
        </label>
        <label className="params-field">
          <span>型号参数名称</span>
          <input
            aria-label="型号参数名称"
            maxLength={120}
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="例如 4K · High · 官方渠道"
          />
        </label>
      </div>
      <label className="params-field">
        <span>搜索别名</span>
        <input
          aria-label="搜索别名"
          value={aliases}
          maxLength={1000}
          onChange={(e) => setAliases(e.target.value)}
          placeholder="多个别名用逗号分隔"
        />
      </label>
    </div>
  );
}
