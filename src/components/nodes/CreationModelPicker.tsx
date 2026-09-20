import { modelCapabilities } from "../../domain/canvasItems";
import BrandLogo from "../BrandLogo";

export default function CreationModelPicker({
  kind,
  value,
  open,
  onToggle,
  onChange,
  onConfigure,
  referenceCount = 0,
  actualModels,
}: {
  kind: "image" | "video";
  value: string;
  open: boolean;
  onToggle: () => void;
  onChange: (model: string) => void;
  onConfigure: () => void;
  referenceCount?: number;
  actualModels?: string[];
}) {
  const options = actualModels
    ? [...new Set([value, ...actualModels].filter(Boolean))].map((id) => ({
        id,
        name: id,
        maxReferences: Infinity,
        label: "实际能力由已配置连接校验",
      }))
    : modelCapabilities(kind);
  const selected = options.find(
    (option) => option.id === value || option.name === value,
  ) ?? { id: value, name: value || "配置模型" };
  return (
    <div className="control-anchor model-anchor" data-control="model">
      <button
        className="model-button"
        title={selected.name}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="logo">
          <BrandLogo variant="model" />
        </span>
        <span className="model-name">{selected.name}</span>
      </button>
      {open && (
        <div className="node-popover model-popover">
          <small>
            {actualModels
              ? "已配置模型 · 生成能力待实际验证"
              : "模型 · 界面预览，尚未连接"}
          </small>
          {options.map((option) => (
            <button
              key={option.id}
              className="model-option"
              aria-pressed={selected.id === option.id}
              disabled={referenceCount > option.maxReferences}
              title={
                referenceCount > option.maxReferences
                  ? `当前已连接 ${referenceCount} 张参考图，请先减少到 ${option.maxReferences} 张再切换`
                  : `${option.name} · ${option.label}`
              }
              onClick={() => onChange(option.id)}
            >
              <BrandLogo variant="model" className="model-glyph" />
              <span>
                {option.name}
                <small>{option.label}</small>
              </span>
            </button>
          ))}
          <button onClick={onConfigure}>配置模型供应商</button>
        </div>
      )}
    </div>
  );
}
